# zadu-js

Repo: https://github.com/jonathantarun/zadu-js
npm: `zadu-js` v1.0.0
License: MIT
Author: Jonathan Tarun Rajasekaran (Northeastern, thesis Apr 2026)
Parent library: Python `zadu` by Hyeon Jeon (https://github.com/hj-n/zadu, VIS'23)

A JavaScript port of a subset of the Python ZADU library. v1.0.0 on npm ships **two point-level metrics** for dimensionality-reduction quality: Trustworthiness (T) and Continuity (C). The thesis describes four (T, C, Steadiness, Cohesiveness), but Steadiness and Cohesiveness are not yet in the published JS package — contributing them back is an open item; see `zadu-python.md` for the full coverage gap.

ESM-only (`"type": "module"`, main `src/zadu.js`).

## Metrics (what's actually in v1.0.0)

### Point-level — T and C
Both take HD data + LD embedding as arrays of arrays, plus `k` (default 20).

```js
import ZADU, { trustworthiness, continuity } from "zadu-js";

const tnc = ZADU.trustworthinessAndContinuity(hd, ld, 20);
// {
//   trustworthiness: { score, localScores, k, n },
//   continuity:      { score, localScores, k, n }
// }

// Or individually:
const t = trustworthiness(hd, ld, 20);
const c = continuity(hd, ld, 20);
```

- **Trustworthiness (T)**: penalty for *false neighbors* — points close together in LD that weren't close in HD. Range [0, 1], higher is better.
- **Continuity (C)**: penalty for *missing neighbors* — points close in HD but not in LD. Range [0, 1], higher is better.

Both use the Venna & Kaski (2001) rank-based formulation. `localScores` is an Array of length n — one score per point — aligned with the input arrays. Hand this straight to a `color` encoding in the scatter.

### Cluster-level — NOT in v1.0.0 (backlog)

Steadiness (S) and Cohesiveness (Co) from Jeon et al. VIS'22 are described in the thesis and in the Python parent `zadu`, but zadu-js v1.0.0 does not export them. If we need S/Co we either: port them from the Python implementation, or fall back to precomputing labels + a browser-side HDBSCAN (neither is in v1 scope). See `quality-metrics.md` for the broader landscape.

## Batch API (Python-compatible)

```js
import ZADU from "zadu-js";

const results = ZADU.measure(
  [
    { id: "tnc", params: { k: 20 } },
    // { id: "snc", ... }  // NOT SUPPORTED in v1.0.0
  ],
  hd,
  ld,
);
// [{ trustworthiness, continuity }]
```

Recognized `id` values in v1.0.0: `tnc`, `trustworthiness`, `continuity`. Any other id throws `Unknown metric`.

## Performance

T and C are each O(n² log n) for kNN construction. From the thesis on MNIST-200: T ~18-24 ms, C ~18-24 ms.

For DRExplorer (chi2026 demo, 500-row sample × 384 dims): T and C each ~1 s in a Web Worker. Running on the main thread would block the UI — DRExplorer runs metrics in `src/lib/metrics-worker.js`.

## kNN caching

T and C share the HD kNN graph per `k`. zadu-js v1.0.0 does not expose the kNN graph for reuse, so our metrics worker recomputes it on each run. A worth-it optimization (when we add it) is to cache HD kNN per `(datasetId, k)` at the DRExplorer layer, which halves the T+C computation time.

## Known limits

- O(n² · d) pairwise distance breaks around n=10,000. The thesis points to HNSW approximate NN as a future O(n log n) path; zadu-js does not implement it today.
- No per-class metrics in the current API (if labels are available, metrics ignore them). Useful future addition.
- No Steadiness / Cohesiveness yet (see above).
- Metric computation blocks the main thread **when called directly** — the library itself is just sync JS. Running it in a worker is our responsibility.

## Observable demo

https://observablehq.com/d/52c1da95fde0bdc9 — a working demo using zadu-js in the browser.

## References

- zadu-js repo: https://github.com/jonathantarun/zadu-js
- Python zadu: https://github.com/hj-n/zadu (arxiv 2308.00282)
- Venna & Kaski 2001 — Trustworthiness / Continuity
- Jeon et al., VIS'22 — Steadiness & Cohesiveness
- Thesis summary in `thesis-summary.md`
