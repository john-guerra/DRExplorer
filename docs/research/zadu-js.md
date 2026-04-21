# zadu-js

Repo: https://github.com/jonathantarun/zadu-js
npm: `zadu-js` v1.0.0
License: MIT
Author: Jonathan Tarun Rajasekaran (Northeastern, thesis Apr 2026)
Parent library: Python `zadu` by Hyeon Jeon (https://github.com/hj-n/zadu, VIS'23)

A JavaScript port of a subset of the Python ZADU library. Implements four quality metrics for dimensionality reduction, all callable from the browser with no server.

ESM-only (`"type": "module"`, main `src/zadu.js`).

## Metrics

### Point-level
Both take HD data + LD embedding as arrays of arrays, plus `k`.

```js
import { trustworthiness, continuity, trustworthinessAndContinuity } from "zadu-js";

const result = trustworthinessAndContinuity(hd, ld, { k: 20 });
// { trustworthiness: { score, localScores, k, n },
//   continuity:      { score, localScores, k, n } }
```

- **Trustworthiness (T)**: penalty for *false neighbors* — points close together in LD that weren't close in HD. Range [0, 1], higher is better.
- **Continuity (C)**: penalty for *missing neighbors* — points close in HD but not in LD. Range [0, 1], higher is better.

Both use the Venna & Kaski (2001) rank-based formulation. `localScores` is a `Float64Array` of length n — one score per point — aligned with the input arrays. Hand this straight to a `color` encoding in the scatter.

### Cluster-level

```js
import { steadinessCohesiveness } from "zadu-js";

const result = steadinessCohesiveness(hd, ld, {
  k: Math.sqrt(n),       // default
  iteration: 150,
  walkNumRatio: 0.3,
  alpha: 0.1,
});
// { steadiness: { score, localScores, k, n },
//   cohesiveness: { score, localScores, k, n } }
```

- **Steadiness (S)**: detects *phantom clusters* — visual clusters in LD that aren't clusters in HD.
- **Cohesiveness (Co)**: detects *dispersed clusters* — HD clusters that got scattered in LD.

Uses HDBSCAN clustering + random-walk sampling on Shared-Nearest-Neighbor distances (Jeon et al., VIS'22). Because HDBSCAN has no pure-JS browser implementation, zadu-js bundles `hdbscan-ts` / `hdbscanjs`. Expect this to be the slowest metric.

## Batch API (Python-compatible)

```js
import { ZADU } from "zadu-js";

const results = ZADU.measure(
  [
    { id: "tnc", params: { k: 20 } },
    { id: "snc", params: { k: 15, iteration: 100 } },
  ],
  hd,
  ld,
);
// [{ trustworthiness, continuity }, { steadiness, cohesiveness }]
```

## Performance

T and C each O(n² log n) for kNN construction. Steadiness + Cohesiveness add iteration overhead (default 150 × random walks of ratio 0.3 × n). From the thesis on MNIST-200: T ~18-24 ms, C ~18-24 ms, S+Co ~233 ms.

For DRExplorer (chi2026 demo = 2,769 points) without precomputed kNN: expect T/C in ~1-2 seconds, S+Co in 3-10 seconds. Metrics computation must live in a Web Worker (the main-thread blocking is a limitation the thesis explicitly flags — DRExplorer fixes it).

## kNN caching

T, C, S, Co all share the HD kNN graph per `k`. We compute it once per `(datasetId, k)` and reuse it across runs.  Not implemented in zadu-js directly — we cache at the DRExplorer layer in `src/lib/run-store.js` or a sibling.

## Known limits

- O(n² · d) pairwise distance breaks around n=10,000. The thesis points to HNSW approximate NN as a future O(n log n) path; zadu-js does not implement it today.
- No per-class metrics in the current API (if labels are available, metrics ignore them). Useful future addition.
- Metric computation currently blocks the main thread **in zadu-js usage** — the library itself is just sync JS. Running it in a worker is our responsibility (DRExplorer does this).

## Observable demo

https://observablehq.com/d/52c1da95fde0bdc9 — a working demo using zadu-js in the browser.

## References

- zadu-js repo: https://github.com/jonathantarun/zadu-js
- Python zadu: https://github.com/hj-n/zadu (arxiv 2308.00282)
- Venna & Kaski 2001 — Trustworthiness / Continuity
- Jeon et al., VIS'22 — Steadiness & Cohesiveness
- Thesis summary in `thesis-summary.md`
