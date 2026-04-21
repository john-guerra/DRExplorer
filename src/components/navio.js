// navio — reactive widget for tabular data exploration.
//
// Placeholder for Phase 0: emits its input unchanged as .value so downstream
// cells keep working. Phase 1 swaps in https://navio.dev.
//
// Intended API (matching the Observable notebook @john-guerra/navio):
//   const filtered = view(navio(data, { attribWidth, y0, height }));

import * as htl from "npm:htl";
import { reactiveWidget } from "./reactive-widget.js";

export function navio(data, options = {}) {
  const container = htl.html`<div class="drexplorer-navio" style="padding:.5em;border:1px dashed var(--theme-foreground-fainter);border-radius:4px;">
    <div style="color:var(--theme-foreground-muted);font-size:.85em;">navio placeholder — showing ${data?.length ?? 0} rows (${Object.keys(data?.[0] ?? {}).length} columns). Full integration in Phase 1.</div>
  </div>`;
  return reactiveWidget(container, { value: data });
}
