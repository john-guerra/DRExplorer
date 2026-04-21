# DRExplorer — Product Requirements Document

## Elevator pitch

A browser-based dimensionality-reduction playground: pick a DR algorithm, tune parameters, watch it run live, score the result with zadu-js quality metrics (distributions, not just numbers), save runs, compare two side-by-side with linked brushing, and — as a stretch goal — lasso a region of the embedding and refine it locally.

## Problem

Dimensionality reduction is everywhere in visual analytics, but two pain points recur:

1. **Picking the right algorithm + hyperparameters is lore.** Researchers default to t-SNE or UMAP with stock settings; few tools make it easy to compare alternatives interactively.
2. **Global quality scores hide where the embedding lies.** A T=0.9 score can mask one terrible cluster. Existing quality tools (DR-Explainer, DR-Analyzer, CheckViz) require Python back-ends, so analysts working in a notebook or a browser app rarely get per-point quality feedback.

Jonathan Tarun Rajasekaran's thesis (Northeastern, Apr 2026) proved that full browser-side DR + zadu-js metrics works for 200-point datasets. DRExplorer generalizes that proof into a reusable app that scales to ~10k points, supports seven DR algorithms, and makes runs first-class, comparable objects.

## Users

- **Researchers** who use DR for exploring high-dimensional data (embeddings, sensor data, survey responses). John's own teaching and research workflow is the primary user.
- **Students** learning DR — "what does changing perplexity *actually* do?"
- **Data visualization practitioners** building dashboards where DR is one step — DRExplorer is a tuning surface; the resulting embedding is exported as JSON for downstream use.

## Principles

1. **Every custom UI control is a reactive widget** — an `HTMLElement` with `.value` + bubbling `input` event. No framework coupling. See `docs/research/reactive-widgets.md`.
2. **All heavy compute runs in Web Workers.** The page stays responsive while DR and metrics run.
3. **Show distributions, not just scores** (direct quote from John's thesis-review notes). A histogram is never less informative than a single number.
4. **DR runs are first-class objects.** Ids, timestamps, names, parameters, embeddings, metrics — all serializable and comparable.
5. **Start simple.** CHI 2026 demo dataset works out of the box. "Bring your own data" via upload is the second entry point.
6. **Reuse, don't rebuild.** `@john-guerra/data-input`, `@john-guerra/brushable-scatterplot`, `navio`, `@fil/worker` — all existing pieces. The UMAP Playground is our architectural template (see `docs/research/umap-playground-dissection.md`).

## V1 features

1. **Load a dataset.**
   - CHI 2026 demo (precomputed embeddings via `FileAttachment`).
   - Upload a CSV / JSON file via `dataInput`.
2. **Preview the data** via a toggled `navio` panel.
3. **Pick columns** for the HD vector via a search-checkbox.
4. **Choose one of 7 DR algorithms**: PCA, MDS, Isomap, LLE, t-SNE, UMAP, TriMap.
5. **Tune parameters** via a schema-driven panel (one schema per algorithm → one reactive form).
6. **Run DR live.** Iterative algorithms (t-SNE, UMAP, TriMap) stream epoch-by-epoch into the scatter via `BrushableScatterPlot`. A status line shows progress.
7. **Compute quality metrics** (zadu-js T, C, S, Co) in a second worker after the DR run completes. Show:
   - Global score.
   - Distribution histogram of `localScores`.
   - Per-point score as a color encoding option on the scatter.
   - Sortable "worst points" list.
8. **Save the run.** localStorage-backed. Each run has id, name, timestamp, dataset id, algorithm, params, embedding, metrics.
9. **List saved runs.** Sidebar with name, algo, date, headline metric.
10. **Compare two runs** on a `compare.md` page with two `BrushableScatterPlot` instances + linked brushing + metrics panel per side.

## V2 / stretch goals

- **Bring-your-own-data polish**: drag-and-drop, CSV-dialect hints, column-type inference.
- **Local refinement**: lasso a region → re-run DR on just that subset → reconcile with the full layout via force-in-group.
- **Import / export runs** as JSON files (for sharing, reproducibility).
- **kNN caching** shared across runs for the same dataset + k.
- **Additional algorithms** (the remaining 7 from druid.js).
- **Per-class metrics** when labels are available.
- **IndexedDB migration** for datasets / embeddings too large for localStorage (≥ 5 MB).

## Non-goals for v1

- Server-side compute. Everything browser-side.
- Data > 10k points — documented graceful degradation, not a solve.
- Collaborative / multi-user features.
- Cloud storage, authentication, account system.
- Mobile-first UI (tablet works, phone is not a target).

## Success criteria

1. On the CHI 2026 demo (n=2,769, d=384), a full UMAP run completes in < 15s and renders progressively (≥ 1 frame per 300ms during iteration).
2. Metrics compute in < 5s after a run completes (using cached HD kNN).
3. Saved runs persist across reload; loading a saved run restores both scatter and parameter UI.
4. Compare view identifies visually differing regions: brushing in one scatter highlights the same point ids in the other.
5. The seven DR algorithms are reachable via a single "algorithm" selector with no extra code paths.

## Risks and mitigations

- **druid.js performance at ~10k.** Pure JS, Float64. Mitigation: document the 10k soft ceiling; offer sampling in a future version; consider WASM if needed.
- **Framework has no first-class Worker API.** Mitigation: port Fil's worker as `src/lib/worker-helper.js` (see `docs/research/fil-worker.md`).
- **LGPL-3.0 on druid.js.** We use it as a library dependency (not a derivative work) in an MIT repo; that is compatible. Do not copy druid.js source in.
- **Guerra widgets are Observable-notebook exports**, not npm packages (confirmed for some). Mitigation: bundle the tarball contents as local modules under `src/components/`.

## Open questions

1. **Max dataset size target**: formalize "works up to 10k; degrades past that." Agreed mental model; to be confirmed after first performance run.
2. **kNN caching strategy**: compute once per `(datasetId, k)`, keep in a Float32 buffer, share between T/C/S/Co. Implementation in Phase 3.
3. **Persistence format**: v1 = localStorage JSON (size limits to 5 MB per domain). Embeddings for 2,769 × 2 floats = ~45 KB, safe. For 10k × 2 floats = ~160 KB, still safe. For stored metrics + per-point scores of all runs: compress or move to IndexedDB if it exceeds localStorage.
4. **License**: MIT (matches zadu-js). Confirm at first commit.

## Measurement

- **Time to first scatter render** (TTFS) with the CHI 2026 baseline: target < 2 s from page load.
- **Time to first DR iteration** after pressing Run: target < 500 ms.
- **Frames during iteration** (throttled `show_dynamic`): target ≥ 3 fps at 2,769 points.
- **Metric computation time** (cached kNN): target < 5 s for all four zadu-js metrics.

These are instrumented via the `_time` field that our worker helper adds to every posted message (inherited from Fil's worker).
