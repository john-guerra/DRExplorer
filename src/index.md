# DRExplorer

A browser-based dimensionality-reduction playground. Pick an algorithm, tune parameters, watch it run, score the result.

```js
import { dataInput } from "./components/data-input.js";
import { BrushableScatterPlot } from "./components/brushable-scatter.js";
import { navio } from "./components/navio.js";
import { drControls } from "./components/dr-controls.js";
import { runList } from "./components/run-list.js";
import { runInWorker } from "./lib/worker-helper.js";
import { drFit, DR_WORKER_PREAMBLE } from "./lib/dr-worker.js";
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
const data = userUpload.length > 0 ? userUpload : demo.rows;
```

Loaded **${data.length}** rows with **${data.length ? Object.keys(data[0]).length : 0}** attributes.

## Overview

```js
const filteredData = view(navio(data, { height: 220 }));
```

## DR controls

```js
const config = view(drControls({ algo: "UMAP", showAdvanced: false }));
```

```js
// Row sampling: pure-JS druid.js UMAP on 2,769 × 384 takes minutes for the
// fuzzy simplicial kNN graph. Sampling keeps iteration interactive while
// preserving the shape of the data.
const sampleSize = view(Inputs.range([50, Math.min(3000, filteredData.length)], {
  value: Math.min(500, filteredData.length),
  step: 50,
  label: "Sample rows",
}));
```

```js
const sampledData = (() => {
  if (sampleSize >= filteredData.length) return filteredData;
  // Deterministic stride sample so the same UI control gives the same rows.
  const stride = filteredData.length / sampleSize;
  const out = new Array(sampleSize);
  for (let i = 0; i < sampleSize; i++) out[i] = filteredData[Math.floor(i * stride)];
  return out;
})();
```

Sampled **${sampledData.length}** of ${filteredData.length} rows for DR.

## Run

```js
const runBtn = view(Inputs.button("▶ Run DR", { value: 0, reduce: (v) => v + 1 }));
```

```js
// A reactive view of the current run status that streams from a worker.
// runBtn === 0 on first load → yield the precomputed baseline coords so the
// scatter renders immediately without running DR.
const runStatus = (async function* () {
  if (runBtn === 0) {
    yield { status: "Baseline", currentEpoch: 0, targetEpoch: 0, algo: "precomputed",
            embedding: sampledData.map((d) => [d.x, d.y]) };
    return;
  }
  const matrix = sampledData.map((d) => d.embedding);
  if (!matrix.length || !Array.isArray(matrix[0])) {
    yield { status: "Error", error: "Current dataset has no `embedding` column.",
            currentEpoch: 0, targetEpoch: 0, algo: config.algo, embedding: [] };
    return;
  }
  // Tie the worker's lifetime to this cell's invalidation. When any dep
  // (sampledData, config, runBtn) changes, the old worker is aborted before
  // a new one starts — no zombie runs writing into the reactive graph.
  const ac = new AbortController();
  invalidation.then(() => ac.abort());
  const iter = runInWorker(drFit, {
    matrix,
    algo: config.algo,
    params: config.params,
    showDynamic: config.showDynamic,
    yieldEvery: 5,
  }, {
    type: "module",
    preamble: DR_WORKER_PREAMBLE,
    signal: ac.signal,
  });
  for await (const tick of iter) {
    if (tick?.__error__) {
      yield { status: "Error", error: tick.message, currentEpoch: 0, targetEpoch: 0,
              algo: config.algo, embedding: [] };
      return;
    }
    yield tick;
  }
})();
```

```js
display(html`<div style="display:flex;gap:1em;align-items:center;font-size:.9em;color:var(--theme-foreground-muted);flex-wrap:wrap;">
  <div><strong>Status:</strong> ${runStatus.status}${runStatus.error ? ` — ${runStatus.error}` : ""}</div>
  <div><strong>Algo:</strong> ${runStatus.algo}</div>
  ${runStatus.targetEpoch ? html`<div><strong>Epoch:</strong> ${runStatus.currentEpoch} / ${runStatus.targetEpoch}</div>` : ""}
  ${runStatus.note ? html`<div style="opacity:.7;">(${runStatus.note})</div>` : ""}
  ${runStatus._time ? html`<div><em>+${Math.round(runStatus._time)} ms</em></div>` : ""}
</div>`);
```

## Scatter

```js
// Merge the current embedding into the tidy rows so the scatter sees
// { ...d, x, y } with fresh coords. Fall back to d.x / d.y (baseline) if the
// run hasn't produced coords for a given row yet.
const viewData = sampledData.map((d, i) => {
  const xy = runStatus?.embedding?.[i];
  return xy ? { ...d, x: xy[0], y: xy[1] } : d;
});
```

```js
const scatter = view(BrushableScatterPlot(viewData, {
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

## Saved runs

```js
const picked = view(runList());
```

```js
display(htl.html`<div style="color:var(--theme-foreground-muted);font-size:.85em;">
  Selected run: ${picked?.name ?? "none"} (saving runs lands in Phase 4)
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
  workerButton;
  const iter = runInWorker(function* main(n) {
    for (let i = 0; i < n; i++) yield { i, sqrt: Math.sqrt(i) };
  }, 100);
  for await (const tick of iter) yield tick;
})();
```

```js
display(html`<div>Worker tick: <b>${count?.i ?? 0}</b> · √ = ${count?.sqrt?.toFixed(4) ?? "—"}</div>`);
```

---

See [Compare](./compare) for side-by-side run comparison (Phase 4).
