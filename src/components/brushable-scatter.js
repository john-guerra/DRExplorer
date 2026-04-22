// BrushableScatterPlot — re-export of @john-guerra/brushable-scatterplot
// from the tarball bundled under ./brushable-scatterplot/.
//
// The tarball is an Observable notebook export (a `define(runtime, observer)`
// function). We spin up a single Runtime + Library at module load, resolve
// the BrushableScatterPlot cell once via top-level await, and re-export the
// resulting factory function.
//
// Why this over a hand-rolled Plot scatter: John's widget has a dynamic
// brush rectangle, nearest-hover linking, nearest-click, mobile touch,
// quant-vs-categorical color scales, and the full Vega-Lite stack. It's
// also the reference implementation that matches our reactive-widgets
// contract — `.value = { brushed, clicked, brush }` and `input` events.
//
// Callers unchanged from the previous Plot-based stub:
//
//   const sel = view(BrushableScatterPlot(data, {x, y, id, color, size, tooltip, interactive}));
//   sel.brushed  // array of rows inside the brush (or undefined)
//   sel.clicked  // last-clicked row

// Framework rewrites `npm:` imports to its internal bundled modules, which
// don't re-export `Library` from stdlib (they only ship what Framework's own
// cells need). Go direct to jsDelivr for the full package.
import { Runtime } from "https://cdn.jsdelivr.net/npm/@observablehq/runtime@5/+esm";
import { Library } from "https://cdn.jsdelivr.net/npm/@observablehq/stdlib@5/+esm";
import define from "./brushable-scatterplot/cb912116cc3f5c34@517.js";

// Shared runtime for the module — one instance is enough since we only
// pull the factory out once.
const runtime = new Runtime(new Library());
const main = runtime.module(define);

// The cell's function is async; awaiting `module.value` unwraps once.
// Top-level await is supported by Observable Framework's ESM loading.
const rawFactory = await main.value("BrushableScatterPlot");

// The raw factory is `async (data, options) => HTMLElement`. Framework's
// reactive cells auto-await Promises returned into the graph, so the
// re-export can stay async — `view(BrushableScatterPlot(...))` resolves
// the promise transparently.
export function BrushableScatterPlot(data, options = {}) {
  return rawFactory(data, options);
}
