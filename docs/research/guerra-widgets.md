# Guerra widgets — `data-input`, `brushable-scatterplot`, `navio`

Three reactive widgets by John Alexis Guerra Gómez that DRExplorer reuses as-is. All implement the reactive-widgets contract (`reactive-widgets.md`).

## `@john-guerra/data-input`

Source: `docs/data-input.tgz` → `1371b3b2446a73b4@335.js` (205 lines). Notebook: https://observablehq.com/@john-guerra/data-input

A file-picker widget that auto-detects JSON / MongoExport / CSV / CSV-no-autotype and parses the dropped file into an array of objects, surfaced via `.value`.

```js
import { dataInput } from "./components/data-input.js";

const data = view(dataInput({
  value: [{ name: "Your Initial Data" }],   // initial .value
  initialValue: undefined,                  // alt name for value
  accept: "",                               // <input type="file" accept="">
  delimiter: ",",                           // CSV delimiter
  format: "auto",                           // auto | JSON | MongoExport | CSV | CSVNoAuto
  label: "Load a data file",
}));
```

Internals: renders `<input type="file">` (optionally hidden behind a labeled button). On change, reads the text and tries `loadJSON` → `loadMongoExport` → `loadCSVAutoType` → `loadCSV` in order (when `format: "auto"`). Uses `reactive-widget-helper` to wrap the form as a reactive widget; `widget.setValue(parsed)` fires the `input` event.

### Integration in DRExplorer
`src/components/data-input.js` imports and re-exports the widget. We bundle the tarball contents (`1371b3b2446a73b4@335.js` + its dependencies) as local modules rather than depending on the package being published on npm.

## `@john-guerra/brushable-scatterplot`

Source: `docs/brushable-scatterplot.tgz`, main `cb912116cc3f5c34@517.js` (501 lines) + deps `f75b3d782a2196ff@696.js` (205) + `12a304c114eacf25@248.js` (448). Notebook: https://observablehq.com/@john-guerra/brushable-scatterplot

Interactive Vega-Lite scatterplot with brushing, nearest hover, nearest click, auto-zoom, quantitative/categorical color scales, and mobile support. Fires `input` on interaction.

```js
import { BrushableScatterPlot } from "./components/brushable-scatter.js";

const selection = view(BrushableScatterPlot(dataToPlot, {
  x: "x",                        // column for x
  y: "y",                        // column for y
  id: "id",                      // unique id column
  color: "score",                // column or accessor
  size: "score",                 // column
  interactive: true,             // brush + hover on
  colorOnHover: true,
  tooltip: ["title", "score", "authors"],
}));

// After interaction:
selection.brushed;               // array of brushed rows
selection.clicked;               // last-clicked row
```

### Integration in DRExplorer

`src/components/brushable-scatter.js` re-exports with DRExplorer-friendly defaults (`x: "x"`, `y: "y"`, `id: "id"`). The output of a DR run is merged into the underlying tidy-data array, so the scatter always reads from `[{..., x, y}]` — the same shape the UMAP Playground produces.

For the **compare view**, we instantiate the widget twice with different `data` values (two saved runs) and link their brush selections via a shared page-level reactive variable.

## navio.dev

Homepage: https://navio.dev (or https://observablehq.com/@john-guerra/navio)

A reactive table explorer: histograms per column, sortable rows, click-to-filter. Drops in alongside the raw data to give users an overview before picking columns for DR.

```js
import { navio } from "./components/navio.js";

const filtered = view(navio(data, {
  attribWidth: 12,
  y0: 70,
  height: 300,
}));
```

The UMAP Playground puts navio inside `conditionalShow(...)` so the user can toggle it off — we mirror that in DRExplorer with an Inputs.toggle.

### Integration in DRExplorer

`src/components/navio.js` imports and re-exports. Exact package / import path confirmed during Phase 0 `npm install` step.

## Why reuse instead of rewrite

These widgets already implement the reactive-widgets contract and are the canonical reference implementations of it in John's ecosystem. The UMAP Playground — our architectural template — already wires them together. Rewriting from scratch would be re-implementing the same thing with worse ergonomics. We bundle the notebook exports locally (so DRExplorer doesn't hard-depend on `@observablehq/runtime@5` being on npm under those exact names) and write thin re-exporters in `src/components/` so the import surface is stable.
