// dataInput — re-export of @john-guerra/data-input from the tarball bundled
// under ./data-input-notebook/.
//
// Same runtime-wrapper pattern as brushable-scatter.js: instantiate Observable
// Runtime with a Library once at module load, resolve the `dataInput` cell,
// re-export the factory. See docs/research/guerra-widgets.md.
//
//   const data = view(dataInput({ value, initialValue, accept, delimiter, format, label }));
//
// The widget itself is synchronous (returns the form element immediately),
// but getting the factory out of the notebook module is async, so our
// wrapped factory is async as well.

import { Runtime } from "https://cdn.jsdelivr.net/npm/@observablehq/runtime@5/+esm";
import { Library } from "https://cdn.jsdelivr.net/npm/@observablehq/stdlib@5/+esm";
import define from "./data-input-notebook/1371b3b2446a73b4@335.js";

const runtime = new Runtime(new Library());
const main = runtime.module(define);
const rawFactory = await main.value("dataInput");

export function dataInput(options = {}) {
  return rawFactory(options);
}
