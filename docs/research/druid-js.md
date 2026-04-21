# druid.js

Repo: https://github.com/saehm/DruidJS
npm: `@saehrimnir/druidjs` v0.8.0
License: LGPL-3.0
Paper: Cutura et al., "DruidJS — A JavaScript Library for Dimensionality Reduction" (VIS 2020 short paper)

Pure JavaScript library for dimensionality reduction. ESM + CJS + TypeScript types. Runs in browsers directly via `npm:` import (jsDelivr esm.run) or `<script>` from unpkg. No WASM.

## Algorithms (14 total, 7 used in DRExplorer v1)

From `src/dimred/index.js`:

| Name | Family | DRExplorer v1? |
|---|---|---|
| PCA | linear | ✅ |
| MDS | distance | ✅ |
| SMACOF | distance (iterative MDS) | — |
| SAMMON | distance (weighted) | — |
| Isomap | manifold (geodesic) | ✅ |
| LLE | manifold (local linear) | ✅ |
| LTSA | manifold | — |
| LDA | supervised | — |
| t-SNE | probabilistic | ✅ |
| UMAP | graph / topology | ✅ |
| TriMap | triplet-based | ✅ |
| LSP | Least Square Projection | — |
| TopoMap | topology | — |
| FASTMAP | fast | — |
| SQDMDS | distance | — |

## Hyperparameters (verified from source)

### UMAP
```js
new druid.UMAP(X, {
  n_neighbors: 15,
  min_dist: 1,
  d: 2,
  local_connectivity: 1,
  metric: "euclidean",
  seed: 1212,
  _spread: 1,
  _set_op_mix_ratio: 1,
  _repulsion_strength: 1,
  _negative_sample_rate: 5,
  _n_epochs: 350,
  _initial_alpha: 1,
});
```
Underscored params are documented as "advanced" in the source; expose them behind an "advanced" disclosure in our param UI.

### t-SNE
```js
new druid.TSNE(X, {
  perplexity: 50,
  epsilon: 10,      // learning rate
  d: 2,
  metric: "euclidean_squared",
  seed: 1212,
});
```

### Common (shared across all DR classes)
- `d`: output dimensions (2 for us).
- `metric`: distance function. Default `"euclidean"`.
- `seed`: for reproducibility.

See `dr-algorithms.md` for per-algorithm hyperparameters we expose in the v1 UI.

## Iterative execution

Every DR class extends the base `DR` with two entry points:

### Batch
```js
const umap = new druid.UMAP(X, { n_neighbors: 15, min_dist: 0.1 });
const Y = umap.transform(500);  // runs 500 iterations, returns final Y
```

### Step-by-step (critical for DRExplorer)
```js
for (const Y of umap.generator()) {
  // each iteration yields the current embedding
  // we post this back to the main thread from a worker
}
```

This is the hook DRExplorer uses in every `fit` generator. We wrap `.generator()` in a Web Worker, post every Nth iteration back, and the scatter re-renders from the reactive `.embedding` cell. Exactly the pattern in `umap-playground-dissection.md`, but DR-library-agnostic.

## Usage in browser via CDN

```js
// Direct ESM import (Observable Framework resolves this via jsDelivr)
import * as druid from "npm:@saehrimnir/druidjs";

// or in a worker preamble (classic)
importScripts("https://unpkg.com/@saehrimnir/druidjs");
const druid = self.druid;
```

## Performance notes

Pure JS + Float64. No WebGL, no WASM. The VIS'20 paper benchmarks it at comfortable interactivity for the low thousands of points; t-SNE and UMAP become sluggish past ~5-10k. For DRExplorer:

- **< 2k points**: comfortable for all 7 algorithms.
- **2k-10k**: UMAP/t-SNE/TriMap will feel slow; users should expect 5-30s. Use `_n_epochs` to shorten if previewing.
- **> 10k**: precompute + sample. Out of scope for v1.

## Data shape

All algorithms take a matrix `X` as an array of arrays (`number[][]`) or a druid `Matrix`. DRExplorer builds `X` from the user's numeric columns via:

```js
const dataAsMatrix = filteredData.map(d => selectedColumns.map(c => +d[c]));
```

## License consideration

druid.js is **LGPL-3.0**. Using it as a library dependency in our MIT-licensed code is fine — LGPL allows linking from more permissively licensed code. We do not copy druid source into DRExplorer; we import it as a dependency.

## References

- Source: https://raw.githubusercontent.com/saehm/DruidJS/master/src/dimred/
- Docs: https://saehm.github.io/DruidJS/
- Paper: https://graphics.cs.uni-magdeburg.de/publications/documents/Cut+20b.pdf
- Observable demo: https://observablehq.com/@saehrimnir/druidjs
