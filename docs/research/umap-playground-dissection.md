# UMAP Playground — architectural dissection

Source: `docs/umap-playground.tgz` → `c2d69457d3735c6c@541.js` (+ 7 dependency modules).
Live: https://johnguerra.co/viz/umapPlayground/
Notebook: https://observablehq.com/@john-guerra/umap-playground

The UMAP Playground is DRExplorer's architectural template. This doc walks through how it is built and calls out exactly what we inherit and what we change.

## The dependency tree

```
umap-playground
├── vl                        (vega-lite wrapper, @vega/vega-lite-api)
├── @jashkenas/inputs         (slider, checkbox, number, select — legacy widgets)
├── @john-guerra/data-input   (file picker, see guerra-widgets.md)
├── @fil/worker               (Web Worker helper, see fil-worker.md)
├── @john-guerra/navio        (table explorer)
├── @john-guerra/search-checkbox   (multi-select with search)
├── @john-guerra/vega-selected     (Vega-Lite scatter with .brush + .clicked)
└── @john-guerra/conditional-show  (collapsible panel)
```

Plus `umap-js@1.3.2` (PAIR-code), loaded inside the worker via `importScripts`.

## The pipeline, cell by cell

### 1. Load data
```js
const data = view(dataInput({
  initialValue: await FileAttachment("nutrients.csv").text().then(res => d3.csvParse(res, d3.autoType)),
  format: fileType,
}));
```
Default dataset is the USDA nutrients table, loaded via `FileAttachment` and `d3.csvParse(…, d3.autoType)`. User can drop a different file to replace.

### 2. Filter / preview via navio
```js
const filteredData = conditionalShow(await navio(data, navioOptions), {
  label: html`<h3>Filter Data?</h3>`,
  checked: this ? this.checked : true,
});
```
The `this` reference is Observable's trick for preserving a reactive cell's previous value across re-runs. navio filters; conditionalShow hides navio if the user unchecks the box.

### 3. Pick columns for DR
```js
const selectedColumns = searchCheckbox(columns, {
  label: "Select Attributes",
  value: this?.value || numericColumns.filter(d => d !== "id"),
});
```
Default: all numeric columns except `id`. User tweaks.

### 4. Build the data matrix
```js
const dataAsMatrix = filteredData.map(d => selectedColumns.map(c => d[c]));
```
Plain JS 2D array. Float64 by default.

### 5. Parameter panel
```js
const nNeighbors = slider({ title: "nNeighbors", value: 15, min: 1, max: 50, step: 1 });
const minDist   = slider({ title: "minDist",     value: 0.1 });
const spread    = slider({ title: "spread",      value: 1, min: 0, max: 3, step: 0.01 });
const nComponents = slider({ title: "nComponents", value: 2, min: 1, max: 50, step: 1 });
const seed      = number({ description: "random seed", value: 46 });
const show_dynamic = checkbox({ options: ["Show dynamic"], value: "Show dynamic" });
```

Each is a `viewof` cell — Observable's reactive-widget shorthand. Changing any value re-runs downstream cells.

### 6. The worker cell (the heart of the architecture)
```js
const umapStatus = Generators.observe(worker(fit, {
  dataAsMatrix,
  show_dynamic,
  options: { nComponents, minDist, nNeighbors, spread },
}, `
  const window = {};
  importScripts("https://unpkg.com/umap-js@1.3.2/lib/umap-js.js");
  importScripts("https://unpkg.com/d3-random@2");
  const UMAP = window.UMAP;
  Math.random = d3.randomLcg(${seed});
`));
```

`Generators.observe(worker(...))` pushes every yielded value back into `umapStatus` as a reactive variable. When any of `dataAsMatrix`, `show_dynamic`, `options`, or `seed` changes, the cell tears down the old worker and spawns a fresh one — the user gets a full restart for free.

### 7. The `fit` generator (the iteration pattern)
```js
function* fit({ dataAsMatrix, show_dynamic, options }) {
  yield { status: "Initializing", currentEpoch: 0, targetEpoch: 0,
          embedding: dataAsMatrix.map(_ => [Math.random(), Math.random()]) };

  const umap = new UMAP(options);
  const nEpochs = umap.initializeFit(dataAsMatrix);

  yield { status: "Starting", currentEpoch: 0, targetEpoch: nEpochs,
          embedding: umap.getEmbedding() };

  for (let i = 0; i < nEpochs; i++) {
    umap.step();
    if (show_dynamic && i % 5 === 0) {
      yield { status: "Running", currentEpoch: i, targetEpoch: nEpochs,
              embedding: umap.getEmbedding() };
    }
  }

  yield { status: "Finished", currentEpoch: nEpochs, targetEpoch: nEpochs,
          embedding: umap.getEmbedding() };
}
```

Key details:
- First yield is a **random initialization** before the worker even imports umap-js. This means the scatter shows *something* immediately, before the real DR starts.
- Yields are throttled by `i % 5 === 0` to keep the message channel from saturating.
- Each yield is the full embedding + a status envelope. The main thread doesn't know or care what UMAP is doing — it just renders what it's given.

### 8. Merge embedding into the data
```js
const filteredDataWithCoords = filteredData.map((d, i) => ({
  ...d,
  x: umapStatus.embedding[i][0],
  y: umapStatus.embedding[i][1],
}));
```

Tidy-data shape: each row gets `x` and `y` fields. This is exactly what `BrushableScatterPlot` expects.

### 9. Scatter with brush
```js
const scatterplot = vegaSelected(chart.toObject());
// later: scatterplot.brush = { x: [xmin, xmax], y: [ymin, ymax] }
const selectedScatterplot = filteredDataWithCoords.filter(d =>
  !scatterplot.brush ||
  (d.x >= scatterplot.brush.x[0] && d.x <= scatterplot.brush.x[1] &&
   d.y >= scatterplot.brush.y[0] && d.y <= scatterplot.brush.y[1]));
```

The user can brush; the brushed rows are available downstream in `selectedScatterplot`.

## What DRExplorer inherits verbatim

- The reactive-variable data flow: `data` → `filteredData` → `dataAsMatrix` → `embedding` → `filteredDataWithCoords` → scatter.
- The worker + generator pattern as the canonical way to run **any** iterative DR.
- Auto-restart-on-param-change via `Generators.observe`.
- First yield is a dummy initialization so the UI is never blank.
- Throttled yields (every Nth iteration).
- Tidy-data merge so the scatter doesn't need to know about the DR step.

## What DRExplorer changes

| Aspect | UMAP Playground | DRExplorer |
|---|---|---|
| DR library | `umap-js@1.3.2` via CDN `importScripts` | `@saehrimnir/druidjs` via `importScripts` or ESM worker |
| Algorithms | UMAP only | PCA, MDS, Isomap, LLE, t-SNE, UMAP, TriMap (7) |
| Worker helper | `@fil/worker` (Observable-runtime coupled) | `src/lib/worker-helper.js` — ported, returns a plain `AsyncIterable` |
| Scatter | `vegaSelected(chart.toObject())` inline | `BrushableScatterPlot(...)` — a packaged reactive widget |
| Param UI | Five hand-written `slider()` cells | Schema-driven `dr-controls.js` for all 7 algorithms |
| Metrics | None | zadu-js T / C / S / Co as global distributions + per-point colors |
| Run lifecycle | Single current run only | Saved runs in localStorage, with names / timestamps |
| Compare | N/A | Compare page with two `BrushableScatterPlot` instances + linked brushing |
| Data source | Upload or default CSV | Upload OR CHI 2026 demo via `FileAttachment` |

## Key files to compare during implementation

- `/Users/aguerra/workspace/DRExplorer/src/index.md`  → replicates the UMAP Playground top-to-bottom using the new building blocks.
- `/tmp/umapp/c2d69457d3735c6c@541.js` (extracted tarball) → the original for side-by-side reference.
- `src/lib/worker-helper.js` → our replacement for `@fil/worker`.
- `src/components/brushable-scatter.js` → our replacement for the inline `vegaSelected(chart)` cell.
- `src/components/dr-schemas.js` + `dr-controls.js` → our generalization of the five `slider()` cells.
