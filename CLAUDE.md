# CLAUDE.md — DRExplorer

Guidance for Claude (and humans) working in this repo.

## What this repo is

A browser-based dimensionality-reduction (DR) playground built on Observable Framework. The elevator pitch is in `README.md`; the detailed product requirements are in `docs/PRD.md`; architecture context is in `docs/research/`.

## Hard rules

1. **Every custom UI control is a reactive widget** — `HTMLElement` with `.value` + bubbling `input` event (`new Event("input", { bubbles: true })`). No framework coupling. See `docs/research/reactive-widgets.md`.
2. **All heavy compute runs in Web Workers.** If you are about to run a DR algorithm or compute zadu-js metrics on the main thread, stop — use `src/lib/worker-helper.js`.
3. **Show distributions, not just scores.** When a metric has per-point scores, show a histogram. When comparing runs, show deltas as distributions, not just averages.
4. **Runs are first-class objects** — id, name, timestamp, dataset id, algo, params, embedding, metrics. Never treat a run as ephemeral state bolted onto the page.
5. **Never depend on remote Observable notebooks at runtime.** We bundle the Guerra widgets (`data-input`, `brushable-scatterplot`, `navio`) as local modules under `src/components/*/`. If you catch yourself adding `import define from "https://observablehq.com/…"`, stop.

## Project structure

```
DRExplorer/
├── observablehq.config.js
├── package.json
├── update.sh                   (rsync to EC2, like chi2026_papers)
├── CLAUDE.md                   (you are here)
├── README.md
├── docs/
│   ├── PRD.md
│   ├── Jonathan_Tarun_…pdf
│   ├── worker.tgz              (reference copies, don't delete)
│   ├── data-input.tgz
│   ├── brushable-scatterplot.tgz
│   ├── umap-playground.tgz
│   └── research/               (11 knowledge docs — see index below)
└── src/
    ├── index.md                (main explorer page)
    ├── compare.md              (side-by-side compare page)
    ├── data/                   (build-time data loaders)
    │   └── chi2026.json.js
    ├── components/             (reactive widgets — all .value + input event)
    │   ├── reactive-widget.js
    │   ├── data-input.js
    │   ├── brushable-scatter.js
    │   ├── navio.js
    │   ├── dr-controls.js
    │   ├── dr-schemas.js
    │   ├── run-list.js
    │   └── metrics-panel.js
    └── lib/                    (plain modules, not widgets)
        ├── worker-helper.js    (Fil-worker port, returns AsyncIterable)
        ├── dr-worker.js        (worker script: runs druid.js algorithms)
        ├── metrics-worker.js   (worker script: runs zadu-js)
        └── run-store.js        (localStorage save / load / list)
```

## Research doc index

Refer to these before inventing something; they capture decisions already made.

- `docs/research/observable-framework.md` — the framework itself, with the DR-playground gotchas at the bottom.
- `docs/research/reactive-widgets.md` — the widget contract.
- `docs/research/fil-worker.md` — Web Worker utility we ported.
- `docs/research/druid-js.md` — the DR library, all 14 algorithms, iterative `.generator()` pattern.
- `docs/research/zadu-js.md` — quality metrics library.
- `docs/research/dr-algorithms.md` — intuition + hyperparameters for the 7 v1 algorithms.
- `docs/research/clustering-algorithms.md` — HDBSCAN (needed for S/Co), k-means, c-TF-IDF.
- `docs/research/quality-metrics.md` — broader DR quality landscape.
- `docs/research/thesis-summary.md` — Jonathan's thesis (the prototype).
- `docs/research/chi2026-testbed.md` — the demo dataset.
- `docs/research/guerra-widgets.md` — `data-input`, `brushable-scatterplot`, `navio`.
- `docs/research/umap-playground-dissection.md` — the cell-by-cell architectural template.

## Code style

Matches `/Users/aguerra/workspace/chi2026_papers/CLAUDE.md`:

- ES modules, `"type": "module"`.
- Double quotes, semicolons, 2-space indent, Unix linebreaks.
- Use `npm:` imports in `.md` pages and `.js` modules for third-party packages.
- Local relative imports (`./foo.js`, `../lib/bar.js`) for first-party.
- File naming for *dated artifacts*: `YYYY_MMmon_DD_<descr>.<ext>` (e.g., `2026_04Apr_21_chi2026_demo.parquet`). Source code files stay lowercased + hyphenated.
- Use TypeScript only if a file genuinely benefits; plain `.js` is the default.
- ESLint recommended + Prettier (follow chi2026's flat config if we want to match).

## Reactive patterns to remember

Observable Framework compiles Markdown pages with fenced `js` blocks. Cells re-run when any top-level variable they reference changes. The canonical DR run pattern is:

```js
const runConfig = view(drControls(schemas, selectedAlgo));
const datasetMatrix = selectedColumns.map(c => filteredData.map(d => +d[c]));

const runStatus = Generators.observe(runInWorker(fit, {
  matrix: datasetMatrix,
  algo: runConfig.algo,
  params: runConfig.params,
  showDynamic: runConfig.showDynamic,
}, {
  preamble: `importScripts("https://unpkg.com/@saehrimnir/druidjs");`,
}));

const filteredDataWithCoords = filteredData.map((d, i) => ({
  ...d,
  x: runStatus.embedding[i][0],
  y: runStatus.embedding[i][1],
}));

const scatter = view(BrushableScatterPlot(filteredDataWithCoords, { x: "x", y: "y", color: colorCol }));
```

See `docs/research/umap-playground-dissection.md` for the template this is derived from.

## How to add a new DR algorithm

Check that druid.js supports it (`docs/research/druid-js.md` lists all 14) and confirm the class name matches druid's export casing (e.g., `UMAP`, `TSNE`, `ISOMAP` — all caps in some cases). Then:

1. Add an entry to `src/components/dr-schemas.js` describing its parameters (name, type, default, min/max/step, description). `dr-controls.js` renders schemas into reactive forms generically — no UI code needed.
2. **Usually no `dr-worker.js` change.** The `drFit` generator already dispatches on `druid[algo]` and iterates `.generator()`, yielding `{ status, currentEpoch, targetEpoch, embedding, algo }`. Every druid DR class implements `.generator()` (even non-iterative ones yield once), so the generic path works for PCA, MDS, ISOMAP, LLE, TSNE, UMAP, TriMap, and by extension the other seven druid algorithms not yet in v1.
3. Only edit `dr-worker.js` if the algorithm has **non-standard output** (e.g., LDA requires labels, SQDMDS returns a Matrix with different shape, some algos yield a Float64Array). Add a branch; keep the yield shape the same.
4. If the algorithm's metric parameter isn't one of the inlined metric functions (`euclidean`, `euclidean_squared`, `manhattan`, `chebyshev`, `cosine` — see `DR_WORKER_PREAMBLE`), either extend the preamble with the new metric or note in the schema that the metric field is fixed for this algorithm.

## How to add a new quality metric

Check zadu-js first (`docs/research/zadu-js.md`). If not in zadu-js and important enough, implement in `src/lib/metrics-worker.js`. Every metric must expose:

- A `score` — scalar in [0, 1] or well-documented range.
- A `localScores: Float64Array` of per-point scores aligned with the input rows (for point-level metrics) or `labels + clusterScores` for cluster-level.
- A `k` or equivalent parameter record so the UI can surface what was measured.

## Testing expectations

- Worker helper (`src/lib/worker-helper.js`) gets a smoke test on the index page: spawn a tiny worker, iterate, display output.
- Each reactive widget should boot in isolation — write a `src/demo-<component>.md` page for any non-trivial widget so we can test it standalone.
- We do not yet have a formal test runner. Don't add Jest / Vitest until we actually have logic tests to write.

## Deployment

1. `npm run build` → `dist/`.
2. `./update.sh` → rsync `dist/` to the EC2 host (script modeled after `chi2026_papers/page/update.sh`).

## Things to avoid

- Rendering DR results on the main thread — blocks the page.
- Passing huge matrices by structured clone when `transferList` with typed arrays would do — see `docs/research/fil-worker.md`.
- Adding a new widget that does not match the reactive-widget contract.
- Rewriting `BrushableScatterPlot` or `dataInput` — they work; wrap, don't replace.
- Using `innerHTML` where `htl.html` is available.

## When in doubt

1. Read the corresponding doc in `docs/research/`.
2. Look at `docs/umap-playground.tgz` for the canonical example.
3. Ask the user rather than guess.
