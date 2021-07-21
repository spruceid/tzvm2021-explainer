# TezosMethod2021 Signing String Explainer

This is a web-based tool that reads and decodes a signing input string for `TezosMethod2021` ([Linked Data Proof][ld-proofs] signature suite using [Tezos][] Signed Messages).

## Install

Requires:
- [Node.js][]
- Web browser with JavaScript
```
git clone https://github.com/spruceid/tzvm2021-explainer
cd tzvm2021-explainer
npm install
npm run build
```
Then open `index.html` in your web browser.

## Usage

During a signing request, in the wallet's signing window, click the copy icon to copy the payload text:
![Signing Window](https://user-images.githubusercontent.com/95347/117200305-5b76cf00-adb9-11eb-862e-ed4745cec266.png)

Then in the Explainer tool, paste the payload:
![Paste](https://user-images.githubusercontent.com/95347/126497780-74eff8c7-7b07-4f7d-877b-eca25781923b.png)

The tool should then parse the data and render the result in the Content tab:
![Content](https://user-images.githubusercontent.com/95347/126497783-e95cfc74-04b4-44c5-b18a-d51cc39bd63f.png)

There is also a [RDF][] tab for a tabular view of the data, and [N-Quads][] tab from which you can copy the data for further processing.

The URL updates according to the text in the box, so you can copy and share the URL, bookmark it, etc.

## More info about TezosMethod2021
- https://github.com/spruceid/ssi/pull/170
- https://github.com/spruceid/didkit-tezos-wallet-example/blob/26f68f516314729571f2d5b8ee364504186df3ca/README.md

## License

Copyright 2021 Spruce Systems, Inc.

Licensed under the Apache License, Version 2.0 (the "License"); you may not use this software except in compliance with the License.  You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0 or the [LICENSE](LICENSE) file in this repository.

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.  See the License for the specific language governing permissions and limitations under the License.

[Node.js]: https://nodejs.org/en/
[ld-proofs]: https://w3c-ccg.github.io/ld-proofs/
[Tezos]: https://tezos.com/
[RDF]: http://www.w3.org/TR/rdf11-concepts/
[N-Quads]: https://www.w3.org/TR/n-quads/
