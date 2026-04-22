# Clustering algorithms

## Role in DRExplorer (updated — now a first-class stage)

Clustering was initially scoped as a side-feature (precomputed labels for coloring; zadu's internal clusterer for S/Co). The current plan promotes it to a first-class pipeline stage, BERTopic-style:

```
HD features (e.g., d=384)
   └─ UMAP → d=5 (or similar small d)   ← "cluster-space DR"
        └─ HDBSCAN                        ← clusters + noise label
             ├─ color encoding on the 2D scatter
             ├─ c-TF-IDF auto-labels per cluster
             ├─ zadu HD-label input for S/Co (once S/Co is available)
             └─ refine-tool: pick a cluster → re-run DR on that subset
```

Key architectural points:

- **Clustering runs on a *reduced but not 2D* space** — not on raw HD (curse of dimensionality), not on the 2D viz (over-compressed). BERTopic uses d=5 with UMAP(`n_neighbors=15, min_dist=0.0, metric="cosine"`). The `min_dist=0.0` is deliberate: HDBSCAN wants dense clusters; high `min_dist` spreads them out and hurts density-based clustering.
- **The 2D scatter is a *separate* DR run for visualization**, not the input to the clusterer. In practice we can still cluster on the 2D output as a quick-look option, but it's strictly weaker than the d=5 route.
- **All clustering runs in a Web Worker** (CLAUDE.md rule #2). `hdbscan-ts` is pure JS and single-threaded — if we run it on the main thread, a 10k-point condensed-tree build blocks the page.
- **Clusters belong on the run object**, not in page state. A run now carries `{ …embedding, …metrics, clusters: { labels, probabilities?, hierarchy?, params } }` so compare-view, refine, and re-coloring all read from the same source of truth.

## Why HDBSCAN is the default

| Property | HDBSCAN | k-means | DBSCAN | GMM | Agglomerative | Spectral |
|---|---|---|---|---|---|---|
| Auto-picks # clusters | yes | no | no | no | no (needs cut) | no |
| Variable density | yes | no | no | yes-ish | no | no |
| Noise / outlier label | yes | no | yes | soft | no | no |
| Elongated / non-convex | yes | no | yes | no | yes | yes |
| Hierarchy for drill-down | yes (free) | no | no | no | yes | no |
| Pure-JS port exists | yes (slow) | yes (fast) | yes | partial | yes | partial |

For UMAP-d=5 output, clusters are typically **elongated, non-convex, and variably dense** — exactly where k-means / GMM struggle most. HDBSCAN matches the geometry the DR step produces. It is also what both BERTopic and Python ZADU use by default, so our choice stays comparable with the reference literature.

**Bonus for DRExplorer's refine tool:** HDBSCAN's internal *condensed tree* encodes a hierarchy of stable clusters. We can expose "click a cluster → see sub-clusters → refine at whichever level" without running a second algorithm. k-means would require a separate re-run with a new `k`.

## HDBSCAN hyperparameters

- **`min_cluster_size`** — smallest group allowed to be called a cluster. The most impactful knob. Practical defaults: `max(5, floor(n / 200))`. CHI 2026 pipeline uses 15 on ~2,800 points.
- **`min_samples`** — density smoothing. Typically `≤ min_cluster_size`; CHI uses 3. Larger `min_samples` ⇒ more aggressive noise labeling.
- **`cluster_selection_method`** — `"eom"` (Excess-of-Mass, default, picks persistent clusters) or `"leaf"` (always picks leaf clusters, finer-grained, more clusters). `eom` for "natural groups"; `leaf` for "I want to see fine structure."
- **`cluster_selection_epsilon`** — merge threshold; any clusters closer than ε in mutual-reachability distance get merged. Useful when HDBSCAN over-splits at low density.
- **`metric`** — Euclidean is standard *after* a UMAP cosine reduction; UMAP's output space is already cosine-ish, so don't double-cosine.

Start with `min_cluster_size=15, min_samples=3, method="eom"`. Expose all four in a schema (same pattern as `dr-schemas.js`).

## JS implementations — what's available in-browser

- **`hdbscan-ts`** (npm) — TypeScript port, what zadu-js's Python-era design targeted. Pure JS, Float64. Expected cost on d=5, 5k points: ~1–3 s. On 10k points: ~5–10 s. Acceptable for v1 behind a worker; not acceptable on the main thread. **Start here.**
- **`hdbscanjs`** — older pure-JS port. Less maintained. Skip.
- **No WASM / WebGPU port as of 2026-04.** This is the likely v2 upgrade path — either port a Rust HDBSCAN crate (e.g., `hdbscan` on crates.io) to WASM ourselves, or wait for the ecosystem.
- **GPU (WebGPU) HDBSCAN** is research-stage (a couple of papers in 2024–2025); no mature library. Track but don't depend on.
- **Build-time precompute** (Python `hdbscan` in a data loader, labels baked into the JSON) is a zero-dependency escape hatch. CHI 2026 already does this. Keep this path available for datasets where in-browser HDBSCAN would be too slow.

### v2 performance upgrade plan

If `hdbscan-ts` falls over (observed slowdown > 10 s on target datasets), progression in order of effort:

1. **Pre-cluster on a sample** (1–2k random points), then assign remaining points to nearest cluster centroid / prototype — standard approximation.
2. **Swap the internal kNN graph to HNSW** (`hnswlib-wasm`) — most of HDBSCAN's cost is mutual-reachability graph construction, which is kNN-dominated.
3. **Port a Rust / C++ HDBSCAN to WASM.** Non-trivial (weeks).
4. **Move to build-time precompute** as a flag on the dataset loader.

## BERTopic-style two-stage DR config

What BERTopic uses before HDBSCAN (quoted from the BERTopic docs):

```
UMAP(n_neighbors=15, n_components=5, min_dist=0.0, metric="cosine")
```

Notes for DRExplorer:

- Our current `src/components/dr-schemas.js` does **not** expose `n_components` for UMAP (it's implicitly 2). To support BERTopic's pattern we need to either:
  - Add `n_components` to the UMAP / TriMap / t-SNE schemas (easy, druid.js accepts it as `d`), **or**
  - Introduce a separate "cluster-DR" config with its own schema. This is cleaner if we want the cluster-space DR to be independent of the viz DR (different `min_dist`, different `n_components`).
- `min_dist=0.0` is the BERTopic-specific choice and should be the default when the UMAP run is clustering-bound, *not* when it's visualization-bound (for viz we want `min_dist=0.1` for readability). This is the strongest argument for a separate config — same algo, different defaults per purpose.

## k-means as a fast baseline

Not a replacement for HDBSCAN; a companion for "I already know `k`" and for teaching ("watch k=3 vs k=7 on the same embedding").

- **Libraries:** `ml-kmeans` or `skmeans` on npm. Both <50 KB, pure JS, seedable.
- **Cost:** ~100 ms for 10k × d=5, `k=10`. Negligible compared to HDBSCAN.
- **When to use:** fast exploration, pedagogy, as the input to a "silhouette vs k" sweep.
- **When not to use:** UMAP-output elongated manifolds (frequent), unknown cluster count.

## Alternatives considered but deliberately skipped

- **DBSCAN** — strictly dominated by HDBSCAN (no variable density, requires `eps`). No reason to ship both.
- **GMM** — assumes Gaussian components; UMAP output is not Gaussian. Soft assignments are a feature, but not worth the modeling mismatch for v1.
- **Agglomerative (Ward, average, complete)** — O(n²) memory, O(n² log n) time. At 10k points that's 10⁸ entries: borderline. The hierarchical story is already covered by HDBSCAN's condensed tree.
- **Spectral** — needs `k`, requires affinity matrix eigendecomp, slow. Good on manifolds but HDBSCAN gets there with less ceremony.
- **Mean-shift** — bandwidth is as hard to tune as `eps`, slower than HDBSCAN, no noise label. Skip.

## c-TF-IDF auto-labels (post-clustering)

Not a clustering algorithm — a *labeling* step applied after clustering, from the BERTopic family.

- Treat each cluster as a single "document" = concatenation of its members' text.
- Compute TF-IDF across those concatenated documents.
- The top-N terms per document are the cluster label.
- Advantage over per-document TF-IDF: domain-wide stopwords ("user", "study" in HCI) get down-weighted because they appear in every cluster-document.
- CHI 2026 precomputes this in Python (`scripts/compute_topic_labels.py` in `/Users/aguerra/workspace/chi2026_papers/`). For in-browser, the logic is ~30 lines — can live in `src/lib/topic-labels.js` once we have the clusters.
- Requires a text column per row. For non-text datasets, fall back to "cluster N (size=K)" as the label.

## Integration points in DRExplorer

1. **New worker script:** `src/lib/cluster-worker.js`. Takes `{ matrix, algo, params }`, runs HDBSCAN / k-means via `hdbscan-ts` / `ml-kmeans`, yields `{ status, labels, probabilities?, hierarchy?, algo, _time }`. Same streaming shape as `dr-worker.js`.
2. **Run object grows a `clusters` field:** `{ labels: Int16Array, probabilities?: Float32Array, hierarchy?: CondensedTree, params, algo }`.
3. **Scatter color encoding:** add `"cluster"` as a color option (categorical, with grey `-1 = noise`).
4. **`dr-schemas.js` pattern, cloned:** `cluster-schemas.js` for HDBSCAN + k-means params. `cluster-controls.js` renders them (mirror `dr-controls.js`).
5. **zadu S/Co integration** — *deferred*. zadu-js v1.0.0 does not export Steadiness / Cohesiveness. Two paths: (a) contribute S/Co upstream to zadu-js, or (b) implement S/Co ourselves in `metrics-worker.js` using our clusters as input. Either way, the clusters field on the run is the upstream input — no UI change needed when S/Co lands.
6. **Refine-tool integration** — Phase 5 currently takes a brushed subset. Add a "cluster picker" mode: select clusters by id (or leaf-level subclusters if HDBSCAN hierarchy is exposed), feed those row indices into the existing refine pipeline.

## Performance expectations (planning numbers)

| Dataset | Cluster algo | Input dims | Expected time | Notes |
|---|---|---|---|---|
| CHI 2026 (2,769 × 384) | UMAP→d=5 + HDBSCAN | 5 | < 2 s total | Worker, `hdbscan-ts` |
| 5k × 100 | UMAP→d=5 + HDBSCAN | 5 | ~3–5 s | Mostly kNN cost |
| 10k × 100 | UMAP→d=5 + HDBSCAN | 5 | ~8–15 s | At/over soft ceiling |
| 10k, k-means k=10 | k-means | 5 | < 300 ms | Baseline |

If we exceed ~15 s on HDBSCAN for the target dataset size, trigger the v2 upgrade plan above.

## References

- Campello, Moulavi, Sander, "Density-Based Clustering Based on Hierarchical Density Estimates," 2013.
- McInnes, Healy, "Accelerated Hierarchical Density Based Clustering," 2017.
- Grootendorst, "BERTopic" (2022) — c-TF-IDF and the UMAP→HDBSCAN pipeline.
- BERTopic DR docs: https://maartengr.github.io/BERTopic/getting_started/dim_reduction/dim_reduction.html
- Jeon et al., "Measuring and explaining the inter-cluster reliability of multidimensional projections," VIS'22 — Steadiness / Cohesiveness.
- `hdbscan-ts` on npm (TypeScript port).
- chi2026 pipeline: `/Users/aguerra/workspace/chi2026_papers/scripts/compute_topic_labels.py` for c-TF-IDF reference.
