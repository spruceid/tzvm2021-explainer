<script lang="ts">
  import BasePage from "./components/BasePage.svelte";
  let message: string = "";
  import { parse } from "./parser";
  import JSONTree from "svelte-json-tree";
  import { objectView, output } from "src/store";
  import ModeSwitcher from "./components/ModeSwitcher.svelte";
  let selectedView: string = "content";
  const classes = "underline justify-center border-b-4";

  const decamelize = (str, separator) => {
    separator = typeof separator === "undefined" ? "_" : separator;

    return str
      .replace(/([a-z\d])([A-Z])/g, "$1" + separator + "$2")
      .replace(/([A-Z]+)([A-Z][a-z\d]+)/g, "$1" + separator + "$2")
      .toLowerCase();
  };

  const hashUpdate = async () => {
    message = decodeURIComponent(window.location.hash.substring(1));
    parse(message);
  };
  const updateHash = async (message) =>
    (window.location.hash = encodeURIComponent(message));
</script>

<!--
https://github.com/spruceid/tzvm2021-explainer/

Copyright 2021 Spruce Systems, Inc.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

	http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
-->

<svelte:window on:hashchange={hashUpdate} />

<BasePage class="flex-col">
  <h1 class="w-full text-4xl mt-8 font-bold">Signing String Explainer</h1>
  <div class="flex-grow flex flex-col mt-8">
    <textarea
      class="overflow-x-auto rounded-lg bg-gray-650 p-2 mr-4 h-20 resize-none"
      bind:value={message}
      on:input={() => {
        parse(message);
        updateHash(message);
      }}
    />
    <span class="self-center text-4xl">&darr;</span>
    <div class="flex rounded-lg bg-gray-650 flex-col json-wrapper flex-grow">
      <div class="flex bg-gray-600 rounded-lg rounded-b-none pt-2 px-2">
        <div class="flex w-full">
          <p
            class="mx-2 cursor-pointer"
            class:font-bold={selectedView === "content"}
            class:underline={selectedView === "content"}
            on:click={() => (selectedView = "content")}
          >
            Content
          </p>
          <p
            class="mx-2 cursor-pointer"
            class:font-bold={selectedView === "rdf"}
            class:underline={selectedView === "rdf"}
            on:click={() => (selectedView = "rdf")}
          >
            RDF
          </p>
          <p
            class="mx-2 cursor-pointer"
            class:font-bold={selectedView === "nquads"}
            class:underline={selectedView === "nquads"}
            on:click={() => (selectedView = "nquads")}
          >
            N-quads
          </p>
        </div>
        <ModeSwitcher />
      </div>
      <div class="p-4 overflow-auto h-full">
        {#if $output}
          {#if $objectView}
            <JSONTree bind:value={$output[selectedView]} />
          {:else if selectedView === "content"}
            {#if $output[selectedView].verifiableCredential}
              <h2>Verifiable Credential</h2>
              {#each Object.keys($output[selectedView].verifiableCredential) as field}
                <div class="flex m-2">
                  <p class="capitalize font-bold">
                    {decamelize(field, " ")}:&nbsp;
                  </p>
                  {#if typeof $output[selectedView].verifiableCredential[field] === "string"}
                    <p>
                      {$output[selectedView].verifiableCredential[field]}
                    </p>
                  {/if}
                </div>
                {#if typeof $output[selectedView].verifiableCredential[field] !== "string"}
                  <div class="flex-col flex">
                    {#each Object.keys($output[selectedView].verifiableCredential[field]) as subField}
                      <div
                        class="flex pl-2 ml-2 border-l-4 border-white"
                        class:justify-center={!decamelize(subField, " ")}
                        class:border-b-4={Object.keys(
                          $output[selectedView].verifiableCredential[field]
                        )[
                          Object.keys(
                            $output[selectedView].verifiableCredential[field]
                          ).length - 1
                        ] === subField}
                      >
                        <p class="font-bold mr-2">
                          {decamelize(subField, " ")
                            ? `${decamelize(subField, " ")}:`
                            : ""}
                        </p>
                        <p class:font-bold={!decamelize(subField, " ")}>
                          {$output[selectedView].verifiableCredential[field][
                            subField
                          ]}
                        </p>
                      </div>
                    {/each}
                  </div>
                {/if}
              {/each}
              <h2 class="mt-8">Proof Options</h2>
              <!-- TODO: Refactor into component -->
              {#each Object.keys($output[selectedView].proofOptions) as field}
                <div class="flex flex-wrap m-2">
                  <p class="capitalize font-bold">
                    {decamelize(field, " ")}:&nbsp;
                  </p>
                  {#if typeof $output[selectedView].proofOptions[field] === "string"}
                    <p>
                      {$output[selectedView].proofOptions[field]}
                    </p>
                  {/if}
                </div>
                {#if typeof $output[selectedView].proofOptions[field] !== "string"}
                  <div class="flex-col flex">
                    {#each Object.keys($output[selectedView].proofOptions[field]) as subField}
                      <div
                        class="flex pl-2 ml-2 border-l-4 border-white"
                        class:justify-center={!decamelize(subField, " ")}
                        class:border-b-4={Object.keys(
                          $output[selectedView].proofOptions[field]
                        )[
                          Object.keys($output[selectedView].proofOptions[field])
                            .length - 1
                        ] === subField}
                      >
                        <p class="font-bold mr-2">
                          {decamelize(subField, " ")
                            ? `${decamelize(subField, " ")}:`
                            : ""}
                        </p>
                        <p class:font-bold={!decamelize(subField, " ")}>
                          {$output[selectedView].proofOptions[field][subField]}
                        </p>
                      </div>
                    {/each}
                  </div>
                {/if}
              {/each}
              {#if $output[selectedView].unknown.body.length > 0}
                <h2 class="mt-8">Unrecognized terms</h2>
                <table>
                  <thead class="border-b-4 border-white">
                    {#each $output[selectedView].unknown.headers as header}
                      <th class="text-left p-2">{header}</th>
                    {/each}
                  </thead>
                  <tbody class="whitespace-nowrap">
                    {#each $output[selectedView].unknown.body as row}
                      <tr class="border-b-2 border-white">
                        {#each row as column}
                          <td class="p-2">{column}</td>
                        {/each}
                      </tr>
                    {/each}
                  </tbody>
                </table>
              {/if}
              <!-- TODO: Verifiable Presentation -->
            {:else}
              <h2>Document</h2>
            {/if}
          {:else if selectedView === "rdf"}
            <h3 class="text-left italic">Document</h3>
            <table>
              <thead class="border-b-4 border-white">
                {#each $output[selectedView].document.headers as header}
                  <th class="text-left p-2">{header}</th>
                {/each}
              </thead>
              <tbody class="whitespace-nowrap">
                {#each $output[selectedView].document.body as row}
                  <tr class="border-b-2 border-white">
                    {#each row as column}
                      <td class="p-2">{column}</td>
                    {/each}
                  </tr>
                {/each}
              </tbody>
            </table>
            <h3 class="text-left italic mt-2">Proof Options</h3>
            <table>
              <thead class="border-b-4 border-white">
                {#each $output[selectedView].proofOptions.headers as header}
                  <th class="text-left p-2">{header}</th>
                {/each}
              </thead>
              <tbody class="whitespace-nowrap">
                {#each $output[selectedView].proofOptions.body as row}
                  <tr class="border-b-2 border-white">
                    {#each row as column}
                      <td class="p-2">{column}</td>
                    {/each}
                  </tr>
                {/each}
              </tbody>
            </table>
          {:else}
            <h3 class="text-left italic">Document</h3>
            <div class="border border-white overflow-auto">
              {#each $output[selectedView].docNquads.split("\n") as nquad}
                {nquad}
              {/each}
            </div>
            <h3 class="text-left italic mt-2">Proof Options</h3>
            <div class="border border-white overflow-auto">
              {#each $output[selectedView].proofNquads.split("\n") as proofNquad}
                {proofNquad}
              {/each}
            </div>
          {/if}
        {/if}
      </div>
    </div>
  </div>
</BasePage>
