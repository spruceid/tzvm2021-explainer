const RDFNXParser = require('rdf-nx-parser');
const debounce = require('just-debounce');
const querystring = require('querystring');

const inputTextarea = document.getElementById('input');
const outputEl = document.getElementById('output');
const outputTabsEl = document.getElementById('output-tabs');
const outputInnerEl = document.getElementById('output-inner');
const loaderEl = document.getElementById('loader');
const arrowEl = document.getElementById('arrow');

const defaultTab = 'content';
let activeTab = defaultTab;

const debounceMs = 250;

function transformWait() {
	loaderEl.style.display = 'inline';
	arrowEl.style.display = 'none';
	transformDebounced();
}

const transformDebounced = debounce(function () {
	loaderEl.style.display = 'none';
	arrowEl.style.display = 'inline';
	const q = {
		input: inputTextarea.value.trim(),
		view: activeTab,
	};
	location.replace('#!' + querystring.encode(q));
	render();
}, debounceMs);

function renderError(msg, err) {
	const el = document.createElement('div');
	el.className = 'error';
	el.appendChild(document.createTextNode(msg));
	if (err) {
		el.appendChild(document.createElement('strong'))
			.appendChild(document.createTextNode(err.name));
		el.appendChild(document.createTextNode(': '));
		el.appendChild(document.createElement('strong'))
			.appendChild(document.createTextNode(err.message));
		el.appendChild(document.createElement('pre'))
			.appendChild(document.createTextNode(err.stack));
	}
	return el;
}

function parseQuad(line) {
	let tokens = RDFNXParser.tokenize(line);
	if (tokens.length !== 4 && tokens.length !== 5) {
		console.error(line, tokens)
		throw new Error('Expected 3 or 4 tokens for line but found: ' + tokens.length);
	}
	const lastToken = tokens.pop();
	if (!lastToken || lastToken.type !== 'endOfStatement') {
		console.error(line, tokens, lastToken)
		throw new Error('Missing end of statement');
	} 
	const statement = {
		subject: tokens[0],
		predicate: tokens[1],
		object: tokens[2],
		graph: tokens[3]
	};
	return statement;
}

function renderLiteral(term) {
	switch (term.datatypeIri) {
		case 'http://www.w3.org/2001/XMLSchema#dateTime':
			const date = new Date(term.value);
			const el = document.createElement('span');
			el.title = date.toString();
			el.appendChild(document.createTextNode(date.toUTCString()));
			return el;
		case 'http://www.w3.org/1999/02/22-rdf-syntax-ns#JSON':
			const code = document.createElement('code');
			code.appendChild(document.createTextNode(term.value));
			return code;
		case undefined:
			const literalEl = document.createElement('code')
			literalEl.appendChild(document.createTextNode(term.value));
			return literalEl;
	}
	const termEl = document.createElement('div');

	const typeEl = document.createElement('div');
	typeEl.appendChild(document.createElement('strong'))
		.appendChild(document.createTextNode('Type'));
	typeEl.appendChild(document.createTextNode(': '));
	const typeA = document.createElement('a');
	typeA.href = term.datatypeIri;
	typeA.appendChild(document.createTextNode(term.datatypeIri));
	typeEl.appendChild(typeA);
	termEl.appendChild(typeEl);

	const valueEl = document.createElement('div');
	valueEl.appendChild(document.createElement('strong'))
		.appendChild(document.createTextNode('Value'));
	valueEl.appendChild(document.createTextNode(': '));
	valueEl.appendChild(document.createElement('code'))
		.appendChild(document.createTextNode(term.value));
	termEl.appendChild(valueEl);

	return termEl;
}

function renderTerm(term) {
	switch (term.type) {
		case 'blankNode':
			return document.createTextNode('_:' + term.value);
		case 'iri':
			const a = document.createElement('a');
			a.href = term.value;
			a.appendChild(document.createTextNode(term.value));
			return a;
		case 'literal':
			return renderLiteral(term);
		default:
			return document.createTextNode(JSON.stringify(term));
	}
}

function renderStatement(statement) {
	const tr = document.createElement('tr');
	tr.appendChild(document.createElement('td'))
		.appendChild(renderTerm(statement.subject));
	tr.appendChild(document.createElement('td'))
		.appendChild(renderTerm(statement.predicate));
	tr.appendChild(document.createElement('td'))
		.appendChild(renderTerm(statement.object));
	if (statement.graph) {
		tr.appendChild(document.createElement('td'))
			.appendChild(document.createTextNode(statement.graph));
	}
	return tr;
}

function render() {
	renderTabLinks();

	const input = inputTextarea.value.trim();
	outputInnerEl.innerHTML = '';
	if (!input) return;
	let el;
	try {
		el = renderInput(input);
	} catch(e) {
		el = renderError('', e);
	}
	return outputInnerEl.appendChild(el);
}

function renderInput(input) {
	let json;
	try {
		json = JSON.parse('"' + input + '"');
	} catch(e) {
		return renderError("Unable to parse JSON: ", e);
	}
	if (typeof json !== 'string') {
		return renderError("Expected string but found " + typeof json, e);
	}
	if (!/^Tezos Signed Message: \n/.test(json)) {
		return renderError("Unexpected message format.");
	}
	const parts = json.substr(23).split(/\n\n/);
	if (parts.length !== 2) {
		return renderError("Expected two parts but found " + parts.length);
	}
	const [proofNquads, docNquads] = parts;
	const docLines = docNquads.split(/\n/);
	const lastLine = docLines.pop();
	if (lastLine !== '') {
		return renderError("Expected empty last line, but found: " + JSON.stringify(lastLine));
	}
	const proofLines = proofNquads.split(/\n/);
	const proofStatements = proofLines.map(parseQuad);
	const docStatements = docLines.map(parseQuad);
	outputInnerEl.innerHTML = '';
	switch (activeTab) {
	case 'rdf':
		const table = renderRdfLdpTable(proofStatements, docStatements);
		return outputInnerEl.appendChild(table);
	case 'nquads':
		const nquadsEl = renderNQuads(proofNquads, docNquads);
		return outputInnerEl.appendChild(nquadsEl);
	case 'content':
		const el = renderRdfLdpContent(proofStatements, docStatements);
		return outputInnerEl.appendChild(el);
	default:
		const text = document.createTextNode('Unknown view');
		return outputInnerEl.appendChild(text);
	}
}

function renderRdfLdpTable(proofStatements, docStatements) {
	const el = document.createElement('div');

	el.appendChild(document.createElement('h3'))
		.appendChild(document.createTextNode('Document'));
	el.appendChild(renderRdfDatasetTable(docStatements));

	el.appendChild(document.createElement('h3'))
		.appendChild(document.createTextNode('Proof Options'));
	el.appendChild(renderRdfDatasetTable(proofStatements));

	return el;
}

function renderRdfDatasetTable(statements) {
	let hasGraph = false;
	for (const statement of statements) {
		if (statement.graph) {
			hasGraph = true;
			break;
		}
	}

	const table = document.createElement('table');
	table.className = 'rdf-table';
	const tr = table.appendChild(document.createElement('tr'));
	tr.appendChild(document.createElement('th'))
		.appendChild(document.createTextNode('Subject'));
	tr.appendChild(document.createElement('th'))
		.appendChild(document.createTextNode('Predicate'));
	tr.appendChild(document.createElement('th'))
		.appendChild(document.createTextNode('Object'));
	if (hasGraph) {
		tr.appendChild(document.createElement('th'))
			.appendChild(document.createTextNode('Graph'));
	}

	for (const statement of statements) {
		const tr = renderStatement(statement);
		table.appendChild(tr);
	}

	return table;
}

function renderDateFull(object) {
	if (object.type !== 'literal') {
		return renderError('Expected literal');
	}
	if (object.datatypeIri !== 'http://www.w3.org/2001/XMLSchema#dateTime') {
		return renderError('Expected date-time');
	}
	const date = new Date(object.value);
	const el = document.createElement('span');
	el.appendChild(document.createTextNode(date.toUTCString()));
	const line = document.createElement('div');
	line.className = 'indent';
	line.appendChild(document.createTextNode('(' + date.toString() + ')'));
	el.appendChild(line);
	return el;
}

function renderCreated(object) {
	const el = document.createElement('div');
	el.appendChild(document.createElement('strong'))
		.appendChild(document.createTextNode('Created: '));
	el.appendChild(renderDateFull(object));
	return el;
}

function renderProofPurpose(object) {
	const el = document.createElement('div');
	el.appendChild(document.createElement('strong'))
		.appendChild(document.createTextNode('Purpose: '));
	switch (object.value) {
		case 'https://w3id.org/security#assertionMethod':
			el.appendChild(document.createTextNode('Assertion'));
			break;
		default:
			return renderError('Unknown type: ' + object.value);
	}
	return el;
}

function renderId(object) {
	const el = document.createElement('div');
	el.appendChild(document.createElement('strong'))
		.appendChild(document.createTextNode('ID: '));
	el.appendChild(renderTerm(object));
	return el;
}

function renderType(object) {
	const el = document.createElement('div');
	el.appendChild(document.createElement('strong'))
		.appendChild(document.createTextNode('Type: '));
	if (object.type !== 'iri') {
		return renderError('Expected IRI');
	}
	switch (object.value) {
		case 'https://w3id.org/security#TezosSignature2021':
			el.appendChild(document.createTextNode('Tezos Signature 2021'));
			break;
		case 'https://www.w3.org/2018/credentials#VerifiableCredential':
			el.appendChild(document.createTextNode('Verifiable Credential'));
			break;
		case 'https://tzprofiles.me/BasicProfile':
			el.appendChild(document.createTextNode('Tezos Profile (tzprofiles.me)'));
			break;
		default:
			return renderError('Unknown type: ' + object.value);
	}
	return el;
}

function renderVerificationMethod(object) {
	const el = document.createElement('div');
	el.appendChild(document.createElement('strong'))
		.appendChild(document.createTextNode('Verification Method: '));
	el.appendChild(renderTerm(object));
	return el;
}

function renderPublicKeyJwk(object) {
	const el = document.createElement('div');
	el.appendChild(document.createElement('strong'))
		.appendChild(document.createTextNode('Public Key (JWK): '));
	el.appendChild(renderTerm(object));
	return el;
}

function renderIssuer(object) {
	const el = document.createElement('div');
	el.appendChild(document.createElement('strong'))
		.appendChild(document.createTextNode('Issuer: '));
	el.appendChild(renderTerm(object));
	return el;
}

function renderIssuanceDate(object) {
	const el = document.createElement('div');
	el.appendChild(document.createElement('strong'))
		.appendChild(document.createTextNode('Issuance Date: '));
	el.appendChild(renderDateFull(object));
	return el;
}

function renderDescription(object) {
	const el = document.createElement('div');
	el.appendChild(document.createElement('strong'))
		.appendChild(document.createTextNode('Description: '));
	el.appendChild(renderTerm(object));
	return el;
}

function renderName(object) {
	const el = document.createElement('div');
	el.appendChild(document.createElement('strong'))
		.appendChild(document.createTextNode('Name: '));
	el.appendChild(renderTerm(object));
	return el;
}

function renderLogo(object) {
	const el = document.createElement('div');
	el.appendChild(document.createElement('strong'))
		.appendChild(document.createTextNode('Logo: '));
	el.appendChild(renderTerm(object));
	return el;
}

function renderURL(object) {
	const el = document.createElement('div');
	el.appendChild(document.createElement('strong'))
		.appendChild(document.createTextNode('URL: '));
	el.appendChild(renderTerm(object));
	return el;
}

function renderCredentialSubjectStatement(stmt, statements) {
	if (stmt.predicate.type !== 'iri') {
		return renderError('Expected predicate IRI');
	}
	if (stmt.graph) {
		return renderError('Expected default graph');
	}
	const predicateIRI = stmt.predicate.value;
	switch (predicateIRI) {
	case 'https://schema.org/description':
		return renderDescription(stmt.object);
	case 'https://schema.org/logo':
		return renderLogo(stmt.object);
	case 'https://schema.org/name':
		return renderName(stmt.object);
	case 'https://schema.org/url':
		return renderURL(stmt.object);
	default:
		return renderError('Unknown Predicate: ' + predicateIRI);
	}
}

function renderCredentialSubject(object, statements) {
	const el = document.createElement('div');
	el.appendChild(document.createElement('strong'))
		.appendChild(document.createTextNode('Credential Subject: '));
	el.appendChild(renderTerm(object));
	const subjectStatements = takeStatements(statements, (statement) => {
		return isTermEqual(statement.subject, object);
	});
	const subjectEl = document.createElement('div');
	subjectEl.className = 'indent';
	for (const statement of subjectStatements) {
		subjectEl.appendChild(renderCredentialSubjectStatement(statement, statements));
	}
	el.appendChild(subjectEl);
	return el;
}

function renderProofOptionStatement(stmt) {
	if (stmt.subject.type !== 'blankNode' || stmt.subject.value !== 'c14n0') {
		return renderError('Expected single blank node subject');
	}
	if (stmt.predicate.type !== 'iri') {
		return renderError('Expected predicate IRI');
	}
	if (stmt.graph) {
		return renderError('Expected default graph');
	}
	const predicateIRI = stmt.predicate.value;
	switch (predicateIRI) {
	case 'http://purl.org/dc/terms/created':
		return renderCreated(stmt.object);
	case 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type':
		return renderType(stmt.object);
	case 'https://w3id.org/security#proofPurpose':
		return renderProofPurpose(stmt.object);
	case 'https://w3id.org/security#verificationMethod':
		return renderVerificationMethod(stmt.object);
	case 'https://w3id.org/security#publicKeyJwk':
		return renderPublicKeyJwk(stmt.object);
	default:
		return renderError('Unknown Predicate: ' + predicateIRI);
	}
}

function renderVerifiableCredentialStatement(stmt, statements) {
	if (stmt.predicate.type !== 'iri') {
		return renderError('Expected predicate IRI');
	}
	if (stmt.graph) {
		return renderError('Expected default graph');
	}
	const predicateIRI = stmt.predicate.value;
	switch (predicateIRI) {
	case 'https://www.w3.org/2018/credentials#credentialSubject':
		return renderCredentialSubject(stmt.object, statements);
	case 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type':
		return renderType(stmt.object);
	case 'https://www.w3.org/2018/credentials#issuer':
		return renderIssuer(stmt.object);
	case 'https://www.w3.org/2018/credentials#issuanceDate':
		return renderIssuanceDate(stmt.object);
	default:
		return renderError('Unknown Predicate: ' + predicateIRI);
	}
}

function renderProofOptions(statements) {
	const el = document.createElement('div');
	el.className = 'proof-options';
	for (const statement of statements) {
		el.appendChild(renderProofOptionStatement(statement));
	}
	return el;
}

function takeStatements(statements, filter) {
	const results = [];
	for (let i = 0; i < statements.length; i++) {
		const stmt = statements[i];
		if (filter(stmt, i)) {
			results.push(stmt);
			statements.splice(i, 1);
			i--;
		}
	}
	return results;
}

function isTermEqual(a, b) {
	if (a == null) {
		return b == null;
	}
	if (a.type === 'iri') {
		return b.type === 'iri' && a.value === b.value;
	}
	if (a.type === 'blankNode') {
		return b.type === 'blankNode' && a.value === b.value;
	}
	throw new Error('Expected IRI or blank node id');
}

function renderVerifiableCredential(subject, statements) {
	const el = document.createElement('div');
	const vcStatements = takeStatements(statements, (statement) => {
		return isTermEqual(statement.subject, subject);
	});
	if (subject.type === 'iri') {
		el.appendChild(renderId(subject));
	}
	for (const statement of vcStatements) {
		el.appendChild(renderVerifiableCredentialStatement(statement, statements));
	}
	return el;
}

function renderLDDocument(statements) {
	const el = document.createElement('div');
	el.className = 'document';
	const vcTypeStatements = takeStatements(statements, (statement) => {
		return statement.predicate.type === 'iri'
			&& statement.predicate.value === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type'
			&& statement.object.type === 'iri'
			&& statement.object.value === 'https://www.w3.org/2018/credentials#VerifiableCredential';
	});
	// TODO: support VerifiablePresentation
	if (vcTypeStatements.length === 0) {
		return renderError('Error: Missing VerifiableCredential');
	}
	if (vcTypeStatements.length > 1) {
		return renderError('Error: More than one VerifiableCredential');
	}
	el.appendChild(document.createElement('h3'))
		.appendChild(document.createTextNode('Verifiable Credential'));
	const subject = vcTypeStatements[0].subject;
	const vcEl = renderVerifiableCredential(subject, statements);
	el.appendChild(vcEl);
	if (statements.length > 0) {
		const h4 = document.createElement('h4');
		h4.className = 'error';
		h4.style.marginBottom = 0;
		h4.appendChild(document.createTextNode('Unknown Statements'));
		el.appendChild(h4);
		el.appendChild(renderRdfDatasetTable(statements));
	}
	return el;
}

function renderNQuads(proofNQuads, docNQuads) {
	const el = document.createElement('div');

	el.appendChild(document.createElement('h3'))
		.appendChild(document.createTextNode('Document'));
	const docEl = document.createElement('pre');
	docEl.className = 'nquads';
	docEl.appendChild(document.createTextNode(docNQuads));
	el.appendChild(docEl);

	el.appendChild(document.createElement('h3'))
		.appendChild(document.createTextNode('Proof Options'));
	const proofEl = document.createElement('pre');
	proofEl.className = 'nquads';
	proofEl.appendChild(document.createTextNode(proofNQuads));
	el.appendChild(proofEl);

	return el;
}

function renderRdfLdpContent(proofStatements, docStatements) {
	const el = document.createElement('div');
	el.className = 'ldp-content';

	el.appendChild(renderLDDocument(docStatements));

	el.appendChild(document.createElement('h3'))
		.appendChild(document.createTextNode('Proof Options'));
	el.appendChild(renderProofOptions(proofStatements));

	return el;
}

function updateTabLink(a) {
	const [name, value] = a.name.split('=');
	const q = {
		input: inputTextarea.value.trim(),
		[name]: value
	};
	a.href = '#!' + querystring.encode(q);
}

function renderTabLinks() {
	const activeName = 'view=' + activeTab;
	for (const tab of outputTabsEl.querySelectorAll('.tab-link')) {
		updateTabLink(tab);
		if (tab.name === activeName) {
			tab.classList.add('active-tab');
		} else {
			tab.classList.remove('active-tab');
		}
	}
}

function onHashChange(e) {
	const hash = location.hash.replace(/^#!?/, '');
	const q = querystring.decode(hash);
	activeTab = q.view || defaultTab;
	const signingInput = (q.input || '').trim();
	if (inputTextarea.value.trim() !== signingInput) {
		inputTextarea.value = signingInput;
	}
	render();
}
window.addEventListener('hashchange', onHashChange, false);

function onUpdatedText() {
	transformWait();
}
inputTextarea.addEventListener('keyup', onUpdatedText, false);
inputTextarea.addEventListener('input', onUpdatedText, false);

onHashChange();
