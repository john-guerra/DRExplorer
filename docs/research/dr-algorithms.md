# Dimensionality reduction algorithms (DRExplorer v1)

Short survey of the seven DR algorithms DRExplorer exposes in v1. Each entry: one-paragraph intuition + key hyperparameters (those we surface in the UI) + strengths / failure modes + when to use. Sources: Cutura et al. "DruidJS" (VIS'20), canonical algorithm papers.

## PCA — Principal Component Analysis

**Intuition.** Linear projection onto the axes of maximum variance. Solved by eigendecomposition of the covariance matrix; deterministic, no iterations.

**Hyperparameters.** `d` (output dimensions, 2 for us). That's it.

**Strengths.** Fastest. Deterministic. Preserves global variance. Great as a preprocessing step (e.g., PCA → t-SNE).

**Failure modes.** Can only capture linear relationships. Fails on curved manifolds, spirals, clusters not along principal directions.

**When to use.** Large data (>10k where iterative methods are too slow), first-pass exploration, when you expect mostly-linear structure.

## MDS — Multidimensional Scaling

**Intuition.** Place points in LD so pairwise distances match HD pairwise distances as closely as possible. "Classical" MDS has a closed form via eigendecomposition of the doubled-centered distance matrix.

**Hyperparameters.** `d`, `metric` (distance function).

**Strengths.** Global distance preservation — good for understanding overall geometry.

**Failure modes.** Scales as O(n²) in memory for the full distance matrix; gets slow past a few thousand points. Doesn't separate clusters well.

**When to use.** When preserving pairwise distances matters more than separating clusters. Small datasets.

## Isomap

**Intuition.** Like MDS, but distances are measured as shortest paths along a k-NN graph (geodesic distances on the manifold) instead of straight-line Euclidean.

**Hyperparameters.** `neighbors` (k for the graph, typically 5-30), `d`, `metric`.

**Strengths.** Handles curved manifolds (Swiss roll is the canonical example).

**Failure modes.** Breaks if the manifold has multiple disconnected components (the graph is disconnected, so distances are ∞). Sensitive to `neighbors`: too few → disconnected, too many → shortcuts.

**When to use.** Data you believe lies on a connected curved manifold.

## LLE — Locally Linear Embedding

**Intuition.** Each point is represented as a linear combination of its neighbors; preserve those combinations in LD.

**Hyperparameters.** `neighbors`, `d`, `metric`.

**Strengths.** Preserves local linear structure. Fast relative to t-SNE/UMAP.

**Failure modes.** Collapses density (clusters pile on top of each other). Very sensitive to `neighbors`.

**When to use.** Rarely first choice — useful as a comparison baseline and for datasets where local linear structure is the feature you want to preserve.

## t-SNE

**Intuition.** Define a probability distribution over HD neighbor pairs (Gaussian around each point, width set by `perplexity`). Define another over LD pairs (Student-t). Minimize the KL divergence between them by gradient descent.

**Hyperparameters.** `perplexity` (≈ effective number of neighbors, 5-50 typical), `epsilon` (learning rate), `iterations`, `d`, `metric`, `seed`.

**Strengths.** Exceptional cluster separation. The go-to method when "I want to see clusters."

**Failure modes.** Distorts global structure (distances between clusters are meaningless). Non-deterministic (depends on seed). Every run is different.

**When to use.** Cluster discovery. Visualization where local neighborhoods matter more than global layout.

## UMAP — Uniform Manifold Approximation and Projection

**Intuition.** Build a fuzzy simplicial complex in HD (weighted k-NN graph with fuzzy memberships), then optimize a corresponding complex in LD to match via cross-entropy.

**Hyperparameters (druid.js):**
- `n_neighbors` (default 15) — local vs global trade-off.
- `min_dist` (default 1 in druid, often 0.1 in practice) — minimum separation in LD.
- `spread` — effective LD scale.
- `n_epochs` (default 350).
- `negative_sample_rate` (default 5).
- `repulsion_strength` (default 1).
- `set_op_mix_ratio` (default 1).
- `local_connectivity` (default 1).
- `initial_alpha` (default 1) — initial learning rate.
- `seed`, `metric`, `d`.

**Strengths.** Faster than t-SNE. Better preservation of global structure than t-SNE. Often the default recommendation in 2025.

**Failure modes.** Still stochastic. Can create artifactual clusters at high `min_dist`. Sensitive to `n_neighbors`.

**When to use.** Most general-purpose DR needs. Default pick for > 1k points when you also want to see cluster structure.

## TriMap

**Intuition.** Triplet loss: sample triples of points `(i, j, k)` where `i` and `j` are close and `i` and `k` are far in HD; push them into the same relation in LD.

**Hyperparameters.** `n_inliers`, `n_outliers`, `n_random`, `n_epochs`, `metric`.

**Strengths.** Good global structure (better than t-SNE, comparable to UMAP). Fewer intuition-heavy hyperparameters in practice.

**Failure modes.** Less mature than UMAP; fewer tutorials.

**When to use.** When UMAP gives distorted global structure and you want a second opinion.

## Decision tree (tiny)

- **Too many points / need speed** → PCA.
- **Care about clusters** → UMAP (first try) → t-SNE (if UMAP clumps too much).
- **Care about global structure** → PCA → MDS → TriMap.
- **Curved manifold (Swiss-roll-like)** → Isomap.
- **Pedagogical comparison** → run all seven and use DRExplorer's compare view.

## References

- Cutura, Kraus, Weiskopf, "DruidJS — A JavaScript Library for Dimensionality Reduction," VIS 2020 short paper
- Jolliffe, "Principal Component Analysis," 2002
- Kruskal, "Multidimensional scaling by optimizing goodness of fit to a nonmetric hypothesis," 1964
- Tenenbaum, de Silva, Langford, "A Global Geometric Framework for Nonlinear Dimensionality Reduction," 2000 (Isomap)
- Roweis & Saul, "Nonlinear Dimensionality Reduction by Locally Linear Embedding," 2000
- van der Maaten, Hinton, "Visualizing Data using t-SNE," 2008
- McInnes, Healy, Melville, "UMAP: Uniform Manifold Approximation and Projection for Dimension Reduction," 2018
- Amid, Warmuth, "TriMap: Large-scale Dimensionality Reduction Using Triplets," 2019
