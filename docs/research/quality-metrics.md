# DR quality metrics

How do you know if a DR embedding is "good"? This is the field DRExplorer is built around. The short answer: there is no single score. Different metrics answer different questions, and for the same embedding they often disagree. DRExplorer's design principle — show distributions, not just scores — follows directly from that observation.

## What zadu-js gives us today

Four metrics, all implemented in `zadu-js@1.0.0` and our v1 starting set:

| Metric | Level | Measures | Range | Complexity |
|---|---|---|---|---|
| Trustworthiness (T) | per-point | false neighbors in LD | [0, 1] ↑ | O(n² log n) |
| Continuity (C) | per-point | missing neighbors in LD | [0, 1] ↑ | O(n² log n) |
| Steadiness (S) | per-cluster | phantom clusters in LD | [0, 1] ↑ | O(iter · n) + HDBSCAN |
| Cohesiveness (Co) | per-cluster | dispersed clusters in LD | [0, 1] ↑ | O(iter · n) + HDBSCAN |

T and C are classical (Venna & Kaski 2001). S and Co are more recent (Jeon et al., VIS'22) and specifically measure *cluster*-level distortion — they're closer to how a human looks at a scatter and thinks "that group got torn apart."

## What else exists in the literature

Metrics we may add later if DRExplorer outgrows zadu-js:

- **Stress** (MDS loss). Global, distance-based. Easy to implement (sum of squared distance differences).
- **KL divergence of neighborhood probabilities** (t-SNE's own objective function). Useful to score t-SNE against its own goal.
- **Mean Relative Rank Error (MRRE)**. Penalizes rank changes between HD and LD. Close cousin of T/C.
- **Local vs global separation**. Two separate scores: how well the embedding preserves local neighborhoods vs global distances.
- **Neighborhood hit rate** (for labeled data). What fraction of k-NN in LD share the point's class label.
- **Class-aware silhouette**. Silhouette coefficient applied to the embedding using external labels.
- **Procrustes distance between runs** (for the compare view). How different are two embeddings after optimal rotation / scale / translation.

## Why distributions matter (per John's thesis-review notes)

> "For the global scores, we definitely need to show a distribution, not just a score."

A single T=0.93 score can hide:
- A bimodal distribution where half the points have T=1.0 and half have T=0.86.
- One terrible point (T=0.5) that drags the average while the rest are fine.
- Systematic class bias — one class's points all score poorly.

The zadu-js API already returns per-point `localScores` arrays. DRExplorer visualizes them in three complementary ways:

1. **Global summary histogram** (the "distribution, not score" fix).
2. **Per-point color encoding** on the scatter (worst points jump out visually).
3. **Sortable point list** showing the n worst-scoring points by T (or C).

## Interpretation gotchas

- **T and C are kNN-based.** They depend on `k`. Report which `k` was used alongside the score.
- **S and Co depend on clusters.** If HDBSCAN doesn't find stable clusters in HD, S and Co are not meaningful. Surface this in the UI.
- **All four metrics are monotonic in [0, 1] but the semantics differ.** A T=0.9 and a Co=0.9 are not the same kind of "good." Do not compare across metric types.

## Performance expectations

For the chi2026 demo dataset (n=2769):
- T + C with shared kNN precomputed: ~1-3 s.
- S + Co with HDBSCAN precomputed: ~3-10 s.
- T + C + S + Co all from scratch: expect 15-30 s (the thesis MNIST-200 number × density of the chi2026 dataset).

All of this runs in a Web Worker (`src/lib/metrics-worker.js`) so the page stays interactive.

## References

- Venna & Kaski, "Neighborhood Preservation in Nonlinear Projection Methods: An Experimental Study," 2001
- Jeon et al., "Measuring and Explaining the Inter-Cluster Reliability of Multidimensional Projections," VIS 2022 (Steadiness & Cohesiveness)
- Jeon et al., "ZADU: A Python Library for Evaluating the Reliability of Dimensionality Reduction Embeddings," arxiv 2308.00282 (VIS 2023)
- Martins et al., "Visual Analysis of Dimensionality Reduction Quality for Parameterized Projections," Computers & Graphics 2014
- See also `zadu-js.md`, `thesis-summary.md`.
