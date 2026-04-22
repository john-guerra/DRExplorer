# DRExplorer

A browser-based dimensionality-reduction playground. Pick an algorithm, tune parameters, watch it run, score the result.

```js
import { dataInput } from "./components/data-input.js";
import { BrushableScatterPlot } from "./components/brushable-scatter.js";
import { navio } from "./components/navio.js";
import { drControls } from "./components/dr-controls.js";
import { runGallery } from "./components/run-gallery.js";
import { metricsPanel } from "./components/metrics-panel.js";
import { scentedCheckbox } from "./components/scented-checkbox.js";
import { scatterControls } from "./components/scatter-controls.js";
import { searchCheckbox } from "./components/search-checkbox.js";
import { runInWorker } from "./lib/worker-helper.js";
import { drFit, DR_WORKER_PREAMBLE } from "./lib/dr-worker.js";
import { computeMetrics, METRICS_WORKER_PREAMBLE } from "./lib/metrics-worker.js";
import { saveRun, exportRuns, importRuns, deleteRun } from "./lib/run-store.js";
import { alignAndMerge } from "./lib/merge-refinement.js";
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
const rawData = userUpload.length > 0 ? userUpload : demo.rows;
```

Loaded **${rawData.length}** rows with **${rawData.length ? Object.keys(rawData[0]).length : 0}** attributes.

## Filter by content type

```js
// Scented checkboxes show per-type counts; default selection is "CHI 2026
// Papers" only (the majority track). If the uploaded dataset has no `track`
// field, the widget still renders but with a single "(undefined)" bucket —
// so this section is a no-op for non-chi2026 data.
const selectedTracks = view(scentedCheckbox(rawData, (d) => d.track ?? "(no track)", {
  label: "Content types to include",
  value: rawData.length && rawData[0].track ? ["CHI 2026 Papers"] : undefined,
  selectAll: !rawData.length || !rawData[0].track,
  cutoff: 0,
}));
```

```js
const data = selectedTracks.length > 0
  ? rawData.filter((d) => selectedTracks.includes(d.track ?? "(no track)"))
  : rawData;
```

**${data.length}** of ${rawData.length} rows selected.

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

```js
// If the dataset has a pre-computed `embedding` column (Array of numbers
// per row), use it as the DR input. Otherwise, let the user pick which
// numeric columns to feed into DR. Detection runs once per sampledData.
const hasEmbedding = sampledData.length > 0 && Array.isArray(sampledData[0].embedding);

// Numeric columns are those whose first value is a number AND that aren't
// the embedding Array or any of the reserved column names.
const numericColumns = !hasEmbedding && sampledData.length > 0
  ? Object.keys(sampledData[0]).filter(
      (k) => typeof sampledData[0][k] === "number" && !RESERVED_COLUMNS.has(k),
    )
  : [];
```

```js
// Only show the column picker when we're NOT in embedding mode.
const selectedColumns = hasEmbedding
  ? null
  : view(searchCheckbox(numericColumns, {
      label: "DR input attributes",
      value: numericColumns,
      height: 180,
    }));
```

```js
// Build the DR input matrix. Embedding mode: read the Array. Column mode:
// stack the selected numeric columns. Empty selection short-circuits so
// downstream cells get a clear error rather than a DR crash.
const drMatrix = hasEmbedding
  ? sampledData.map((d) => d.embedding)
  : (selectedColumns?.length > 0
      ? sampledData.map((d) => selectedColumns.map((c) => +d[c]))
      : []);
```

${hasEmbedding ? html`<em style="color:var(--theme-foreground-muted);font-size:.85em;">Using the precomputed <code>embedding</code> column (${sampledData[0]?.embedding?.length ?? 0} dims).</em>` : (selectedColumns?.length > 0 ? html`<em style="color:var(--theme-foreground-muted);font-size:.85em;">Using ${selectedColumns.length} selected columns as DR input.</em>` : html`<em style="color:#dc2626;font-size:.85em;">Pick at least one numeric column above to run DR.</em>`)}

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
  if (!drMatrix.length || !Array.isArray(drMatrix[0])) {
    yield { status: "Error",
            error: hasEmbedding ? "Current dataset has no `embedding` column." : "Pick at least one input column.",
            currentEpoch: 0, targetEpoch: 0, algo: config.algo, embedding: [] };
    return;
  }
  const matrix = drMatrix;
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
  // Metrics score whatever currentEmbedding currently holds — so a refine
  // or thumbnail-load re-scores the view, not just a fresh DR run. Wait for
  // the fresh run to reach Finished at least once before we bother, since
  // metrics on a half-iterated t-SNE / UMAP are meaningless churn.
  const ld = currentEmbedding;
  if (runStatus?.status !== "Finished" || !ld?.length) {
    yield { status: "Idle", result: null };
    return;
  }
  const hd = drMatrix;
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
// currentEmbedding is the single source of truth for what the scatter
// displays. Four writers update it (each in its own cell, via setEmbedding):
//   1. fresh DR ticks       → overwrite all rows
//   2. refine completion    → Procrustes-aligned overwrite of brushed rows
//   3. thumbnail click      → overwrite all rows from the saved run
//   4. selectedTracks / sampledData change → reset to runStatus.embedding
// setEmbedding exists in the same cell so writers from elsewhere can
// inherit the write privilege.
const currentEmbedding = Mutable([]);
const setEmbedding = (e) => { currentEmbedding.value = Array.isArray(e) ? e : []; };
```

```js
// Fresh-run writer: on every runStatus tick, overwrite currentEmbedding
// so the scatter animates during iteration. When runStatus is Idle /
// Baseline it still holds a valid embedding for the rows, so this writes
// unconditionally.
{
  if (runStatus?.embedding?.length) setEmbedding(runStatus.embedding);
}
```

```js
// Merge the current embedding into the tidy rows so the scatter sees
// { ...d, x, y }. Also attach per-point metric scores so the color channel
// can pick them up.
const viewData = sampledData.map((d, i) => {
  const xy = currentEmbedding[i];
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
// Scatter encoding controls. Lives in its own cell so picks survive DR
// runs — only rebuilds when the set of attributes changes. Attribute list
// excludes x/y/id (reserved for the scatter position/identity) and
// embedding (an Array, not a scalar).
// Reserved column names skipped from the encoding picker. x/y/id are the
// scatter's position + identity channels; embedding is an Array, not a
// scalar; navio attaches __seqId and __i as internal sort/filter keys.
// Computed from sampledData (stable across DR runs) rather than viewData
// (rebuilt per tick with fresh x/y) so the controls widget doesn't rebuild
// — preserving user picks across DR runs.
const RESERVED_COLUMNS = new Set(["x", "y", "id", "embedding", "__seqId", "__i"]);
const encodingColumns = sampledData.length > 0
  ? Object.keys(sampledData[0]).filter((k) => !RESERVED_COLUMNS.has(k))
  : [];
```

```js
const encodings = view(scatterControls({
  columns: encodingColumns,
  defaults: { color: "track", size: null, opacity: null },
}));
```

```js
// Metrics panel exposes {colorBy: "trustworthiness" | "continuity" | null}.
// A non-null colorBy from the panel overrides the encodings picker for
// color only (since the panel was designed around exposing metric
// distributions on the scatter). Size/opacity always come from encodings.
const effectiveColor = metricsPick?.colorBy ?? encodings?.color ?? null;
```

```js
// Opacity is not a native channel of @john-guerra/brushable-scatterplot; we
// inject it via vegaSpecWrapper. If the user didn't pick an opacity
// attribute, return the spec unchanged so the widget's hardcoded 0.6
// opacity applies to all marks.
function withOpacity(attr) {
  if (!attr) return (spec) => spec;
  const isNumeric = viewData.length > 0 && typeof viewData[0][attr] === "number";
  return (spec) => {
    const withEnc = { ...spec, encoding: { ...(spec.encoding ?? {}) } };
    withEnc.encoding.opacity = {
      field: attr,
      type: isNumeric ? "quantitative" : "nominal",
    };
    return withEnc;
  };
}
```

```js
// BrushableScatterPlot resolves to an HTMLElement asynchronously (the widget
// factory does a Vega-Lite render internally). Framework awaits the promise
// at the cell boundary so downstream cells see the real element.
const scatter = view(await BrushableScatterPlot(viewData, {
  x: "x",
  y: "y",
  id: "id",
  color: effectiveColor,
  size: encodings?.size ?? null,
  colorScheme:
    effectiveColor === "trustworthiness" || effectiveColor === "continuity"
      ? "viridis"
      : undefined,
  tooltip: ["title", "authors", "track"],
  width: 720,
  height: 480,
  vegaSpecWrapper: withOpacity(encodings?.opacity),
}));
```

```js
display(html`<div style="color:var(--theme-foreground-muted);font-size:.85em;">
  Brushed: ${scatter.brushed?.length ?? 0} rows ·
  Clicked: ${scatter.clicked?.title ?? "—"}
</div>`);
```

## Refine a region

Brush a region in the scatter, then press Refine. DR re-runs on just the
brushed subset and the result is Procrustes-aligned back into the main
view — so the refined cluster lands where it was on the canvas but its
internal structure reflects the local re-embedding. Useful for "I see a
cluster in UMAP, but zoom in on it and it's actually two sub-clusters".

```js
// refineRequest is the single source of truth for "what to refine right
// now". Declared in a cell that has NO reactive dependency on `scatter`
// so that scatter rebuilds (caused by every embedding tick) don't reset
// the Mutable back to null. The button cell below imports `requestRefine`
// and reads scatter.brushed at click time.
const refineRequest = Mutable(null);
const requestRefine = (ids) => { refineRequest.value = ids?.length ? ids : null; };
const clearRefineRequest = () => { refineRequest.value = null; };
```

```js
// Button cell — does depend on scatter (via the click handler's brushed
// snapshot). That's fine: when scatter rebuilds and this cell re-runs,
// we just get fresh button DOM; the refineRequest Mutable from the cell
// above is untouched, so any in-flight refine state survives.
const refineBtnEl = htl.html`<button type="button" style="margin-right:.25em;">🔍 Refine brushed region</button>`;
refineBtnEl.addEventListener("click", () => {
  const brushedIds = (scatter?.brushed ?? []).map((d) => d.id);
  requestRefine(brushedIds);
});
const refineResetEl = htl.html`<button type="button">↺ Reset</button>`;
refineResetEl.addEventListener("click", () => clearRefineRequest());
display(html`<div>${refineBtnEl} ${refineResetEl}</div>`);
```

```js
// refineSelection derives from refineRequest (stable across scatter
// rebuilds) and sampledData (the ID universe). Clicking Refine when no
// rows are brushed, or fewer than 10 rows, reports an error state.
const refineSelection = (() => {
  if (!refineRequest) return null;
  const ids = new Set(refineRequest);
  if (ids.size < 10) return { err: `need at least 10 points (got ${ids.size})` };
  const rows = sampledData.filter((d) => ids.has(d.id));
  return { ids, rows };
})();
```

```js
const refineStatus = (async function* () {
  if (!refineSelection) {
    yield { status: "Idle", embedding: [], rows: [] };
    return;
  }
  if (refineSelection.err) {
    yield { status: "Error", error: refineSelection.err, embedding: [], rows: [] };
    return;
  }
  const matrix = hasEmbedding
    ? refineSelection.rows.map((d) => d.embedding)
    : (selectedColumns?.length > 0
        ? refineSelection.rows.map((d) => selectedColumns.map((c) => +d[c]))
        : []);
  if (matrix.length === 0) {
    yield { status: "Error", error: "No input matrix (pick columns first)", embedding: [], rows: refineSelection.rows };
    return;
  }
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
      yield { status: "Error", error: tick.message, embedding: [], rows: refineSelection.rows };
      return;
    }
    yield { ...tick, rows: refineSelection.rows };
  }
})();
```

```js
display(html`<div style="color:var(--theme-foreground-muted);font-size:.85em;display:flex;gap:1em;flex-wrap:wrap;">
  <span><strong>Refine:</strong> ${refineStatus?.status ?? "Idle"}${refineStatus?.error ? ` — ${refineStatus.error}` : ""}</span>
  ${refineStatus?.targetEpoch ? html`<span>Epoch ${refineStatus.currentEpoch} / ${refineStatus.targetEpoch}</span>` : ""}
  ${refineStatus?.status === "Finished" && refineSelection ? html`<span>merged <strong>${refineSelection.ids.size}</strong> points back into the view</span>` : ""}
</div>`);
```

```js
// Writer cell: when the refine worker reaches Finished, Procrustes-align
// the refined subset onto its current positions and fold back into
// currentEmbedding. The main scatter re-renders with the local structure.
//
// Idempotency: this cell re-runs whenever currentEmbedding changes (because
// it reads it to merge). To avoid re-merging the same refineStatus in a
// loop (merge → currentEmbedding changes → this cell re-runs → merge again),
// we track the exact refineStatus reference we last processed in a
// module-scope Set and early-return on repeats.
const _processedRefines = new WeakSet();
{
  if (
    refineStatus?.status === "Finished" &&
    refineStatus.embedding?.length > 0 &&
    refineSelection?.ids &&
    !_processedRefines.has(refineStatus)
  ) {
    _processedRefines.add(refineStatus);
    const brushedIds = Array.from(refineSelection.ids);
    const allIds = sampledData.map((d) => d.id);
    const merged = alignAndMerge({
      currentEmbedding,
      allIds,
      refinedEmbedding: refineStatus.embedding,
      brushedIds,
    });
    setEmbedding(merged);
  }
}
```

## Checkpoints

Click **Checkpoint** to save the current scatter state (whatever you're
looking at — fresh run, refined, or loaded from a thumbnail below). Each
checkpoint lands in the strip at the bottom of the page; click a thumbnail
to load its embedding back into the main scatter.

```js
// savedCount owns the refresh signal for the gallery. Checkpoint /
// delete / import all write to its .value so any cell that references
// savedCount re-runs. Gallery is declared here in the same cell so its
// thumbnail-delete handler inherits the write privilege.
const savedCount = Mutable(0);
const bumpSaved = () => { savedCount.value = savedCount.value + 1; };

const checkpointBtn = Inputs.button("📌 Checkpoint current view", {
  value: 0,
  reduce: (v) => {
    if (!currentEmbedding?.length) return v;
    saveRun({
      name: `${runStatus?.algo ?? "precomputed"} · ${new Date().toLocaleTimeString()} · n=${sampledData.length}`,
      datasetId: "chi2026",
      algo: runStatus?.algo ?? "precomputed",
      params: config?.params ?? {},
      embedding: currentEmbedding,
      ids: sampledData.map((d) => d.id),
      metrics: metricsStatus?.result ?? null,
    });
    bumpSaved();
    return v + 1;
  },
});

const exportBtn = Inputs.button("⤓ Export as JSON", {
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

const importPicker = Inputs.file({ label: "⤒ Import", accept: ".json" });
importPicker.addEventListener("input", async () => {
  const f = importPicker.value;
  if (!f) return;
  importRuns(await f.text(), { merge: true });
  bumpSaved();
});

display(html`<div style="display:flex;gap:.5em;align-items:center;flex-wrap:wrap;margin:.5em 0;">
  ${checkpointBtn} ${exportBtn} ${importPicker}
  <span style="color:var(--theme-foreground-muted);font-size:.85em;">
    ${savedCount} checkpoint${savedCount === 1 ? "" : "s"}
    ${currentEmbedding?.length ? "· ready to save" : "· no embedding yet"}
  </span>
</div>`);
```

```js
// Gallery cell — runGallery reads localStorage (via listRuns) on every
// refreshToken bump. Clicking a thumb emits a `run` as .value; the cell
// below watches that and loads the run's embedding into currentEmbedding.
const pickedRun = view(runGallery({
  refreshToken: savedCount,
  onDelete: (id) => { deleteRun(id); bumpSaved(); },
}));
```

```js
// Writer cell: on thumbnail click, overwrite currentEmbedding with the
// clicked run's embedding. Align by ids (in case the saved run's row
// order differs from the current sampledData — e.g., filter changed).
// Idempotent via WeakSet on the pickedRun reference so the cell doesn't
// re-run on its own setEmbedding writeback.
const _loadedRuns = new WeakSet();
{
  if (pickedRun?.embedding?.length && !_loadedRuns.has(pickedRun)) {
    _loadedRuns.add(pickedRun);
    const runById = new Map((pickedRun.ids ?? []).map((id, i) => [id, pickedRun.embedding[i]]));
    const next = sampledData.map((d, i) => runById.get(d.id) ?? [0, 0]);
    setEmbedding(next);
  }
}
```

---

See [Compare](./compare) for side-by-side run comparison.
