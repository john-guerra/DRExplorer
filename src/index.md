# DRExplorer

A browser-based dimensionality-reduction playground. Pick an algorithm, tune parameters, watch it run, score the result.

```js
import { dataInput } from "./components/data-input.js";
import { BrushableScatterPlot } from "./components/brushable-scatter.js";
import { navio } from "./components/navio.js";
import { drControls } from "./components/dr-controls.js";
import { runList } from "./components/run-list.js";
import { metricsPanel } from "./components/metrics-panel.js";
import { runInWorker } from "./lib/worker-helper.js";
import { drFit, DR_WORKER_PREAMBLE } from "./lib/dr-worker.js";
import { computeMetrics, METRICS_WORKER_PREAMBLE } from "./lib/metrics-worker.js";
import { saveRun, exportRuns, importRuns } from "./lib/run-store.js";
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

## Metrics (zadu-js)

```js
// Fire metrics only after a DR run is Finished. Separate worker so the
// main thread and the DR worker stay free. Uses the same AbortSignal
// pattern as the DR worker so metric computations don't zombie either.
const metricsK = view(Inputs.range([5, 50], { value: 15, step: 1, label: "Metrics k (kNN size)" }));
```

```js
const metricsStatus = (async function* () {
  if (runStatus?.status !== "Finished" || !runStatus.embedding?.length) {
    yield { status: "Idle", result: null };
    return;
  }
  const hd = sampledData.map((d) => d.embedding);
  const ld = runStatus.embedding;
  if (!hd.length || hd.length !== ld.length) {
    yield { status: "Error", error: "hd/ld length mismatch", result: null };
    return;
  }
  const ac = new AbortController();
  invalidation.then(() => ac.abort());
  yield { status: "Starting", result: null };
  const iter = runInWorker(computeMetrics, { hd, ld, k: metricsK }, {
    type: "module",
    preamble: METRICS_WORKER_PREAMBLE,
    signal: ac.signal,
  });
  for await (const tick of iter) {
    if (tick?.__error__) {
      yield { status: "Error", error: tick.message, result: null };
      return;
    }
    yield {
      status: tick.status,
      currentMetric: tick.metric,
      result: tick.result ?? tick.partial ?? null,
    };
  }
})();
```

```js
const metricsPick = view(metricsPanel(metricsStatus?.result, { k: metricsK }));
```

```js
display(html`<div style="color:var(--theme-foreground-muted);font-size:.85em;">
  <strong>Metrics:</strong> ${metricsStatus?.status ?? "Idle"}
  ${metricsStatus?.currentMetric ? ` · ${metricsStatus.currentMetric}` : ""}
  ${metricsStatus?._time ? ` · +${Math.round(metricsStatus._time)} ms` : ""}
  ${metricsStatus?.error ? ` — ${metricsStatus.error}` : ""}
</div>`);
```

## Scatter

```js
// Merge the current embedding into the tidy rows so the scatter sees
// { ...d, x, y } with fresh coords. Fall back to d.x / d.y (baseline) if the
// run hasn't produced coords for a given row yet. Also attach per-point
// metric scores so the color channel can pick them up.
const viewData = sampledData.map((d, i) => {
  const xy = runStatus?.embedding?.[i];
  const coords = xy ? { x: xy[0], y: xy[1] } : null;
  const t = metricsStatus?.result?.trustworthiness?.localScores?.[i];
  const c = metricsStatus?.result?.continuity?.localScores?.[i];
  return {
    ...d,
    ...(coords ?? {}),
    ...(t !== undefined ? { trustworthiness: t } : {}),
    ...(c !== undefined ? { continuity: c } : {}),
  };
});
```

```js
// The metrics panel exposes {colorBy: "trustworthiness" | "continuity" | null}.
// null means keep coloring by the default attribute.
const colorBy = metricsPick?.colorBy ?? "track";
```

```js
// BrushableScatterPlot resolves to an HTMLElement asynchronously (the widget
// factory does a Vega-Lite render internally). Framework awaits the promise
// at the cell boundary so downstream cells see the real element.
const scatter = view(await BrushableScatterPlot(viewData, {
  x: "x",
  y: "y",
  id: "id",
  color: colorBy,
  colorScheme: colorBy === "trustworthiness" || colorBy === "continuity" ? "viridis" : undefined,
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
// savedCount owns the refresh signal. Save / delete / import all write to
// its .value, which triggers any cell that references `savedCount` to
// re-run. Mutables can only be written from their declaring cell, so the
// save / export / import buttons live in this same block.
const savedCount = Mutable(0);

const saveBtn = Inputs.button("💾 Save run", {
  value: 0,
  reduce: (v) => {
    if (runStatus?.status !== "Finished") return v;
    saveRun({
      name: `${runStatus.algo} · ${new Date().toLocaleTimeString()} · n=${sampledData.length}`,
      datasetId: "chi2026",
      algo: runStatus.algo,
      params: config.params,
      embedding: runStatus.embedding,
      ids: sampledData.map((d) => d.id),
      metrics: metricsStatus?.result ?? null,
    });
    savedCount.value = savedCount.value + 1;
    return v + 1;
  },
});

const exportBtn = Inputs.button("⤓ Export runs as JSON", {
  value: 0,
  reduce: (v) => {
    const blob = new Blob([exportRuns()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `drexplorer-runs-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    return v + 1;
  },
});

const importPicker = Inputs.file({ label: "⤒ Import runs", accept: ".json" });
importPicker.addEventListener("input", async () => {
  const f = importPicker.value;
  if (!f) return;
  const n = importRuns(await f.text(), { merge: true });
  savedCount.value = savedCount.value + 1;
});

display(html`<div style="display:flex;gap:.5em;align-items:center;flex-wrap:wrap;margin:.5em 0;">
  ${saveBtn} ${exportBtn} ${importPicker}
</div>`);
```

```js
// refreshToken reference keeps this cell reactive to savedCount changes.
const picked = view(runList({ refreshToken: savedCount }));
```

```js
display(html`<div style="color:var(--theme-foreground-muted);font-size:.85em;">
  Selected run: ${picked?.name ?? "none"} ·
  Total saved: ${savedCount}
  ${runStatus?.status === "Finished" ? "· save armed" : "· run DR to arm save"}
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
