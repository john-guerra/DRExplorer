// searchCheckbox — re-export of @john-guerra/search-checkbox from the
// tarball bundled under ./search-checkbox-notebook/.
//
// Same Runtime+Library pattern as data-input, brushable-scatter, and
// scented-checkbox. Used in src/index.md when the uploaded dataset has no
// pre-computed `embedding` column and we need to let the user pick which
// numeric columns go into the DR input matrix.
//
//   const selected = view(searchCheckbox(columns, {
//     label: "DR input attributes",
//     value: columns,  // select all by default
//     height: 220,
//   }));
//
// Returns an HTMLElement already satisfying the reactive-widget contract
// (`.value` is an Array of selected entries, `input` event bubbles on change).

import { Runtime } from "https://cdn.jsdelivr.net/npm/@observablehq/runtime@5/+esm";
import { Library } from "https://cdn.jsdelivr.net/npm/@observablehq/stdlib@5/+esm";
import define from "./search-checkbox-notebook/600f1f80e771a771@509.js";

const runtime = new Runtime(new Library());
const main = runtime.module(define);
const rawFactory = await main.value("searchCheckbox");

export function searchCheckbox(data, options = {}) {
  return rawFactory(data, options);
}
