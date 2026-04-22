// scentedCheckbox — re-export of @john-guerra/scented-checkbox from the
// tarball bundled under ./scented-checkbox-notebook/.
//
// Same runtime-wrapper pattern as brushable-scatter.js and data-input.js:
// spin up an Observable Runtime with a Library once at module load, resolve
// the `scentedCheckbox` cell, re-export the factory.
//
//   const selected = view(scentedCheckbox(data, (d) => d.track, {
//     label: "Content types to include",
//     value: ["CHI 2026 Papers"],
//     cutoff: 0,
//   }));
//
// The widget already satisfies our reactive-widget contract: `.value` is an
// Array of selected keys, bubbles `input` on every change.

import { Runtime } from "https://cdn.jsdelivr.net/npm/@observablehq/runtime@5/+esm";
import { Library } from "https://cdn.jsdelivr.net/npm/@observablehq/stdlib@5/+esm";
import define from "./scented-checkbox-notebook/af8899339492063b@416.js";

const runtime = new Runtime(new Library());
const main = runtime.module(define);
const rawFactory = await main.value("scentedCheckbox");

export function scentedCheckbox(data, attr = (d) => d[0], options = {}) {
  return rawFactory(data, attr, options);
}
