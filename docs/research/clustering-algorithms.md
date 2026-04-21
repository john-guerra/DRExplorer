# Clustering algorithms

Clustering is not DRExplorer's main job, but it shows up in two places:

1. **zadu-js Steadiness / Cohesiveness** metrics define quality over clusters. Without clusters there's no S and no Co.
2. **Coloring / topic labels** — useful for the CHI 2026 demo and any other already-clustered dataset.

## HDBSCAN — Hierarchical DBSCAN

**Intuition.** Build a hierarchy of density-based clusters; prune it to find stable clusters at multiple scales. Handles variable density better than vanilla DBSCAN.

**Key hyperparameters.**
- `min_cluster_size` — smallest allowed cluster (15 in the chi2026 pipeline).
- `min_samples` — density smoothing (3 in the chi2026 pipeline; typically ≤ `min_cluster_size`).

**Why we care.** zadu-js's Steadiness + Cohesiveness metrics run HDBSCAN internally to detect clusters in both HD and LD, then compare them. Without a working HDBSCAN, S/Co fall back to precomputed labels.

**Browser availability.**
- `hdbscan-ts` / `hdbscanjs` on npm — pure JS ports. Slow (pure JS, Float64). zadu-js bundles one of them.
- No WASM port as of 2026.
- For large data, precompute in Python in a build-time data loader.

## k-means

**Intuition.** Partition into k clusters by alternating (a) assigning points to the nearest centroid and (b) moving each centroid to the mean of its assigned points.

**Key hyperparameters.** `k`, `seed`, `max_iterations`.

**Why we might care.** Fast baseline; useful for coloring when you want a clean partition with a known k. Not used by zadu-js.

## c-TF-IDF topic labels (from chi2026 pipeline)

Not a clustering algorithm per se — a labeling step applied *after* clustering. Compute TF-IDF where each "document" is the concatenation of all papers in a cluster. Top terms per cluster form the label. More robust than plain TF-IDF for conference papers because HCI-wide stopwords like "user" and "study" get down-weighted.

Reference: chi2026 `scripts/compute_topic_labels.py` and CLAUDE.md in `/Users/aguerra/workspace/chi2026_papers/`.

## DRExplorer's strategy

For v1 we support two modes for S/Co:

1. **Precomputed clusters.** If the dataset comes with cluster labels (CHI 2026 demo has 6 HDBSCAN clusters), use them directly and skip browser-side HDBSCAN.
2. **On-the-fly via zadu-js default.** zadu-js runs `hdbscan-ts` internally with its defaults. Slow but works unattended.

We document the cost and let the user choose.

## References

- McInnes, Healy, "Accelerated Hierarchical Density Based Clustering," 2017
- Campello, Moulavi, Sander, "Density-Based Clustering Based on Hierarchical Density Estimates," 2013
- Grootendorst, "BERTopic" (2022) — introduces c-TF-IDF for topic labeling.
