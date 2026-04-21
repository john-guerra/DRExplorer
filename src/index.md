# DRExplorer

A browser-based dimensionality-reduction playground. Pick an algorithm, tune parameters, watch it run, score the result.

```js
import { dataInput } from "./components/data-input.js";
import { BrushableScatterPlot } from "./components/brushable-scatter.js";
import { navio } from "./components/navio.js";
import { drControls } from "./components/dr-controls.js";
import { runList } from "./components/run-list.js";
import { runInWorker } from "./lib/worker-helper.js";
```

## Load data

```js
const demo = FileAttachment("./data/chi2026.json").json();
```

```js
const userUpload = view(dataInput({
  value: [],
  label: "Load a CSV / JSON file…",
  format: "auto",
}));
```

```js
// Use upload if non-empty, otherwise fall back to the demo.
const data = userUpload.length > 0 ? userUpload : demo.rows;
```

Loaded **${data.length}** rows with **${data.length ? Object.keys(data[0]).length : 0}** attributes.

## Overview

```js
const filteredData = view(navio(data, { height: 220 }));
```

## Baseline scatter (precomputed UMAP)

```js
const scatter = view(BrushableScatterPlot(filteredData, {
  x: "x",
  y: "y",
  id: "id",
  color: "track",
  tooltip: ["title", "authors", "track"],
  width: 720,
  height: 480,
}));
```

```js
display(html`<div style="color:var(--theme-foreground-muted);font-size:.85em;">
  Brushed: ${scatter.brushed?.length ?? 0} rows ·
  Clicked: ${scatter.clicked?.title ?? "—"}
</div>`);
```

## DR controls (schema-driven)

```js
const config = view(drControls({ algo: "UMAP", showAdvanced: false }));
```

```js
display(html`<pre style="font-size:.8em;">${JSON.stringify(config, null, 2)}</pre>`);
```

```js
const runBtn = Inputs.button("▶ Run DR", { disabled: true });
display(htl.html`<div style="color:var(--theme-foreground-muted);font-size:.85em;margin-top:.5em;">
  (Phase 1 wires this button to a dr-worker that streams the embedding back.)
</div>`);
display(runBtn);
```

## Saved runs

```js
const picked = view(runList());
```

```js
display(htl.html`<div style="color:var(--theme-foreground-muted);font-size:.85em;">
  Selected run: ${picked?.name ?? "none"}
</div>`);
```

## Worker smoke test

Proof that the worker pipeline works end-to-end. The button spawns a worker that iterates and streams progress back through the reactive graph.

```js
const workerButton = Inputs.button("▶ Count to 100 in a worker");
display(workerButton);
```

```js
const count = (async function* () {
  workerButton;  // reactive dependency — re-run when clicked
  const iter = runInWorker(function* main(n) {
    for (let i = 0; i < n; i++) {
      yield { i, sqrt: Math.sqrt(i) };
    }
  }, 100);
  for await (const tick of iter) yield tick;
})();
```

```js
display(html`<div>Worker tick: <b>${count?.i ?? 0}</b> · √ = ${count?.sqrt?.toFixed(4) ?? "—"}</div>`);
```

---

See [Compare](./compare) for side-by-side run comparison (coming in Phase 2).
