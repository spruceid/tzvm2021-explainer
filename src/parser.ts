import { alert, output } from "src/store";
import * as RDFNXParser from "rdf-nx-parser";

function parseQuad(line) {
  let tokens = RDFNXParser.tokenize(line);
  if (tokens.length !== 4 && tokens.length !== 5) {
    console.error(line, tokens);
    throw new Error(
      "Expected 3 or 4 tokens for line but found: " + tokens.length
    );
  }
  const lastToken = tokens.pop();
  if (!lastToken || lastToken.type !== "endOfStatement") {
    console.error(line, tokens, lastToken);
    throw new Error("Missing end of statement");
  }
  const statement = {
    subject: tokens[0],
    predicate: tokens[1],
    object: tokens[2],
    graph: tokens[3],
  };
  return statement;
}

interface Pair {
  type: string;
  value: string;
}

function renderLiteral(term): string | Pair {
  switch (term.datatypeIri) {
    case "http://www.w3.org/2001/XMLSchema#dateTime":
      return new Date(term.value).toString();
    case "http://www.w3.org/1999/02/22-rdf-syntax-ns#JSON":
      return term.value;
    case undefined:
      return term.value;
  }

  return {
    type: term.datatypeIri,
    value: term.value,
  };
}

function renderTerm(term): string | Pair {
  switch (term.type) {
    case "blankNode":
      return `_:${term.value}`;
    case "iri":
      return term.value;
    case "literal":
      return renderLiteral(term);
    default:
      return JSON.stringify(term);
  }
}

function renderStatement(statement): Array<string | Pair> {
  const row: Array<string | Pair> = [];
  row.push(renderTerm(statement.subject));
  row.push(renderTerm(statement.predicate));
  row.push(renderTerm(statement.object));
  if (statement.graph) {
    row.push(statement.graph);
  }
  return row;
}

export const parse = (vc) => {
  if (!vc) return;
  let el;
  try {
    el = renderInput(vc.trim());
  } catch (e) {
    alert.set({
      message: e.message,
      variant: "error",
    });
  }
  output.set(el);
};

function renderInput(input) {
  let json;
  try {
    json = JSON.parse(`"${input}"`);
  } catch (e) {
    throw new Error(`Unable to parse JSON: ${e.message}`);
  }
  if (typeof json !== "string") {
    throw new Error(`Expected string but found: ${typeof json}.`);
  }
  if (!/^Tezos Signed Message: \n/.test(json)) {
    throw new Error(
      `Unexpected message format. Expected: Tezos Signed Message: \n, found: \
      ${json.substring(24)}.`
    );
  }
  const parts = json.substr(23).split(/\n\n/);
  if (parts.length !== 2) {
    throw new Error(`Expected two parts but found: ${parts.length}`);
  }
  const [proofNquads, docNquads] = parts;
  const docLines = docNquads.split(/\n/);
  const lastLine = docLines.pop();
  if (lastLine !== "") {
    throw new Error(
      `Expected empty last line, but found: ${JSON.stringify(lastLine)}`
    );
  }
  const proofLines = proofNquads.split(/\n/);
  const proofStatements = proofLines.map(parseQuad);
  const docStatements = docLines.map(parseQuad);
  const rdf = renderRdfLdpTable(proofStatements, docStatements);
  const nquads = { proofNquads, docNquads };
  const content = renderRdfLdpContent(proofStatements, docStatements);
  return {
    rdf,
    nquads,
    content,
  };
}

function renderRdfLdpTable(proofStatements, docStatements) {
  return {
    document: renderRdfDatasetTable(docStatements),
    proofOptions: renderRdfDatasetTable(proofStatements),
  };
}

function renderRdfDatasetTable(statements): {
  headers: Array<string>;
  body: Array<Array<string | Pair>>;
} {
  let hasGraph = false;
  for (const statement of statements) {
    if (statement.graph) {
      hasGraph = true;
      break;
    }
  }

  const headers: Array<string> = [];
  const body: Array<Array<string | Pair>> = [];
  headers.push("Subject");
  headers.push("Predicate");
  headers.push("Object");

  if (hasGraph) {
    headers.push("Graph");
  }

  for (const statement of statements) {
    body.push(renderStatement(statement));
  }

  return {
    headers,
    body,
  };
}

function renderDateFull(object): string {
  if (object.type !== "literal") {
    throw new Error(`Expected literal, got: ${object.type}`);
  }
  if (object.datatypeIri !== "http://www.w3.org/2001/XMLSchema#dateTime") {
    throw new Error(
      `Expected http://www.w3.org/2001/XMLSchema#dateTime, got ${object.datatypeIri}`
    );
  }

  return new Date(object.value).toUTCString();
}

function renderCreated(object): { created: string } {
  return {
    created: renderDateFull(object),
  };
}

interface Unknown {
  unknown: string;
}

function renderProofPurpose(object): { purpose: string } | Unknown {
  switch (object.value) {
    case "https://w3id.org/security#assertionMethod":
      return { purpose: "Assertion" };
    default:
      return { unknown: object.value };
  }
}

function renderId(object): { id: string | Pair } {
  return { id: renderTerm(object) };
}

function renderType(object): { type: string } {
  if (object.type !== "iri") {
    throw new Error("Expected IRI");
  }
  switch (object.value) {
    case "https://w3id.org/security#TezosSignature2021":
      return { type: "Tezos Signature 2021" };
    case "https://www.w3.org/2018/credentials#VerifiableCredential":
      return { type: "Verifiable Credential" };
    case "https://tzprofiles.com/BasicProfile":
      return { type: "Tezos Profile (tzprofiles.com)" };
    default:
      return { type: `Unkown type: ${object.value}` };
  }
}

function renderVerificationMethod(object): {
  verificationMethod: string | Pair;
} {
  return { verificationMethod: renderTerm(object) };
}

function renderPublicKeyJwk(object): { publicKey: string | Pair } {
  const pk = renderTerm(object);
  return {
    publicKey: pk,
  };
}

function renderIssuer(object): { issuer: string | Pair } {
  return { issuer: renderTerm(object) };
}

function renderIssuanceDate(object): { issuanceDate: string | Pair } {
  return { issuanceDate: renderDateFull(object) };
}

function renderDescription(object): { description: string | Pair } {
  return { description: renderTerm(object) };
}

function renderName(object): { name: string | Pair } {
  return { name: renderTerm(object) };
}

function renderLogo(object): { logo: string | Pair } {
  return { logo: renderTerm(object) };
}

function renderURL(object): { url: string | Pair } {
  return { url: renderTerm(object) };
}

function renderCredentialSubjectStatement(stmt): BasicProfileFields {
  if (stmt.predicate.type !== "iri") {
    throw new Error("Expected predicate IRI");
  }

  if (stmt.graph) {
    throw new Error("Expected default graph");
  }

  const predicateIRI = stmt.predicate.value;
  switch (predicateIRI) {
    case "https://schema.org/description":
      return renderDescription(stmt.object);
    case "https://schema.org/logo":
      return renderLogo(stmt.object);
    case "https://schema.org/name":
      return renderName(stmt.object);
    case "https://schema.org/url":
      return renderURL(stmt.object);
    default:
      throw new Error(`Unknown Predicate: ${predicateIRI}.`);
  }
}

interface BasicProfileFields {
  "": string;
  description?: string | Pair;
  logo?: string | Pair;
  name?: string | Pair;
  url?: string | Pair;
}

function renderCredentialSubject(object, statements) {
  const elements: Array<BasicProfileFields> = [];
  const subjectStatements = takeStatements(statements, (statement) => {
    return isTermEqual(statement.subject, object);
  });
  elements.push({ "": object.value });
  if (subjectStatements.length > 0) {
    for (const statement of subjectStatements) {
      elements.push(renderCredentialSubjectStatement(statement));
    }
  }
  return { credentialSubject: Object.assign.apply(Object, elements) };
}

function renderProofOptionStatement(stmt) {
  if (stmt.subject.type !== "blankNode" || stmt.subject.value !== "c14n0") {
    throw new Error("Expected single blank node subject");
  }
  if (stmt.predicate.type !== "iri") {
    throw new Error("Expected predicate IRI");
  }
  if (stmt.graph) {
    throw new Error("Expected default graph");
  }
  const predicateIRI = stmt.predicate.value;
  switch (predicateIRI) {
    case "http://purl.org/dc/terms/created":
      return renderCreated(stmt.object);
    case "http://www.w3.org/1999/02/22-rdf-syntax-ns#type":
      return renderType(stmt.object);
    case "https://w3id.org/security#proofPurpose":
      return renderProofPurpose(stmt.object);
    case "https://w3id.org/security#verificationMethod":
      return renderVerificationMethod(stmt.object);
    case "https://w3id.org/security#publicKeyJwk":
      return renderPublicKeyJwk(stmt.object);
    default:
      throw new Error(`Unknown Predicate: ${predicateIRI}`);
  }
}

function renderVerifiableCredentialStatement(stmt, statements) {
  if (stmt.predicate.type !== "iri") {
    throw new Error("Expected predicate IRI");
  }
  if (stmt.graph) {
    throw new Error("Expected default graph");
  }
  const predicateIRI = stmt.predicate.value;

  switch (predicateIRI) {
    case "https://www.w3.org/2018/credentials#credentialSubject":
      return renderCredentialSubject(stmt.object, statements);
    case "http://www.w3.org/1999/02/22-rdf-syntax-ns#type":
      return renderType(stmt.object);
    case "https://www.w3.org/2018/credentials#issuer":
      return renderIssuer(stmt.object);
    case "https://www.w3.org/2018/credentials#issuanceDate":
      return renderIssuanceDate(stmt.object);
    default:
      throw new Error(`Unknown Predicate: ${predicateIRI}`);
  }
}

interface ProofOptions {
  created?: string;
  type?: string;
  purpose?: string;
  verificationMethod?: string | Pair;
  publicKey?: string | Pair;
}

function renderProofOptions(statements) {
  const elements: Array<ProofOptions | Unknown> = [];
  for (const statement of statements) {
    elements.push(renderProofOptionStatement(statement));
  }
  return Object.assign.apply(Object, elements);
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
  if (a.type === "iri") {
    return b.type === "iri" && a.value === b.value;
  }
  if (a.type === "blankNode") {
    return b.type === "blankNode" && a.value === b.value;
  }
  throw new Error("Expected IRI or blank node id");
}

function renderVerifiableCredential(subject, statements) {
  const el: Array<any> = [];
  const vcStatements = takeStatements(statements, (statement) => {
    return isTermEqual(statement.subject, subject);
  });
  if (subject.type === "iri") {
    el.push(renderId(subject));
  }
  for (const statement of vcStatements) {
    el.push(renderVerifiableCredentialStatement(statement, statements));
  }

  return Object.assign.apply(Object, el);
}

function renderLDDocument(statements) {
  const el = document.createElement("div");
  el.className = "document";
  const vcTypeStatements = takeStatements(statements, (statement) => {
    return (
      statement.predicate.type === "iri" &&
      statement.predicate.value ===
        "http://www.w3.org/1999/02/22-rdf-syntax-ns#type" &&
      statement.object.type === "iri" &&
      statement.object.value ===
        "https://www.w3.org/2018/credentials#VerifiableCredential"
    );
  });
  // TODO: support VerifiablePresentation
  if (vcTypeStatements.length === 0) {
    throw new Error("Missing VerifiableCredential");
  }
  if (vcTypeStatements.length > 1) {
    throw new Error("More than one VerifiableCredential");
  }
  const subject = vcTypeStatements[0].subject;
  const verifiableCredential = renderVerifiableCredential(subject, statements);
  const unknown = renderRdfDatasetTable(statements);
  return {
    verifiableCredential,
    unknown,
  };
}

function renderNQuads(proofNQuads, docNQuads) {
  const el = document.createElement("div");

  el.appendChild(document.createElement("h3")).appendChild(
    document.createTextNode("Document")
  );
  const docEl = document.createElement("pre");
  docEl.className = "nquads";
  docEl.appendChild(document.createTextNode(docNQuads));
  el.appendChild(docEl);

  el.appendChild(document.createElement("h3")).appendChild(
    document.createTextNode("Proof Options")
  );
  const proofEl = document.createElement("pre");
  proofEl.className = "nquads";
  proofEl.appendChild(document.createTextNode(proofNQuads));
  el.appendChild(proofEl);

  return el;
}

function renderRdfLdpContent(proofStatements, docStatements) {
  const LDDocument = renderLDDocument(docStatements);
  const verifiableCredential = LDDocument.verifiableCredential;
  const unknown = LDDocument.unknown;
  const proofOptions = renderProofOptions(proofStatements);
  return {
    verifiableCredential,
    proofOptions,
    unknown,
  };
}
