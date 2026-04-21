# zadu (Python)

The parent library that `zadu-js` ports from. Repo: https://github.com/hj-n/zadu

## What zadu is

ZADU is a Python library that unifies a wide range of distortion / reliability measures for evaluating dimensionality-reduction (DR) embeddings under a single, efficient API. It was introduced by Jeon et al. at IEEE VIS 2023 and is designed to let researchers run many metrics over the same `(hd, ld)` pair while sharing expensive intermediate computations (e.g. kNN graphs, pairwise distances).

This doc exists so DRExplorer's backlog has a single authoritative reference for *what we could eventually port into zadu-js*. See the mapping table at the bottom.

## Metrics inventory

Metrics are grouped by the scope at which they evaluate distortion: *point-wise* (per-point reliability), *cluster-level* (how well cluster structure is preserved) and *global* (overall structure). Input shape is always `hd: (n, D_high)` and `ld: (n, D_low)` unless noted. "Output" is what `ZADU.measure` returns.

| Scope | Metric | Spec ID | Output |
|---|---|---|---|
| Point-wise | Trustworthiness | `trustworthiness` | scalar in [0, 1] |
| Point-wise | Continuity | `continuity` | scalar in [0, 1] |
| Point-wise | Trustworthiness & Continuity (joint) | `tnc` | `{trustworthiness, continuity}` |
| Point-wise | Mean Relative Rank Error | `mrre` | `{mrre_false, mrre_missing}` |
| Point-wise | Local Continuity Meta-Criterion | `lcmc` | scalar |
| Point-wise | Neighborhood Hit | `neighborhood_hit` | scalar (needs labels) |
| Point-wise | Neighbor Dissimilarity | `neighbor_dissimilarity` | scalar |
| Point-wise | Class-Aware Trustworthiness & Continuity | `ca_tnc` | `{ca_trustworthiness, ca_continuity}` (labels) |
| Point-wise | Procrustes (local) | `procrustes` | scalar |
| Point-wise | Stress (Kruskal) | `stress` | scalar |
| Cluster-level | Steadiness & Cohesiveness | `snc` | `{steadiness, cohesiveness}` |
| Cluster-level | Distance Consistency | `dsc` | scalar (needs labels) |
| Cluster-level | Label-Trustworthiness & Continuity | `l_tnc` | `{l_trustworthiness, l_continuity}` (labels) |
| Cluster-level | Silhouette | `silhouette` | scalar (labels) |
| Cluster-level | Calinski-Harabasz | `ch` | scalar (labels) |
| Cluster-level | Davies-Bouldin | `dbi` | scalar (labels) |
| Cluster-level | Internal Validation Measure set | `ivm` | dict |
| Cluster-level | Clustering + HDBSCAN agreement | `c_evm` | dict |
| Global | Stress | `stress` | scalar |
| Global | Kullback-Leibler Divergence | `kl_div` | scalar |
| Global | Distance-to-Measure | `dtm` | scalar |
| Global | Pearson r of pairwise distances | `pearson_r` | scalar |
| Global | Spearman rho of pairwise distances | `spearman_rho` | scalar |
| Global | Mutual Information (pairwise) | `mutual_info` | scalar |
| Global | Random-Triplet Accuracy | `random_triplet` | scalar |
| Global | Topographic Product | `topographic_product` | scalar |

Most point-wise metrics also return a per-point array via `measure_with_local`.

## API shape

```python
from zadu import ZADU

spec = [
    {"id": "tnc",    "params": {"k": 20}},
    {"id": "snc",    "params": {"k": 50, "clustering": "hdbscan"}},
    {"id": "stress", "params": {}},
]

scores = ZADU(spec, hd).measure(ld)
scores, local = ZADU(spec, hd).measure_with_local(ld)
```

- `spec_list` is a list of dicts with `id` and `params`.
- The constructor takes the high-dimensional data **once**; `.measure(ld)` evaluates one or more embeddings.
- Because many metrics share a high-D kNN graph, ZADU caches it on the instance and reuses it across specs that declare the same `k`. This is the optimization DRExplorer wants to mirror in `src/lib/metrics-worker.js`.
- `measure_with_local` also returns per-point local distortion arrays, used by `zaduvis`.

## Dependencies and why it's browser-hostile

- `numpy`, `scipy` (pairwise distances, stats)
- `scikit-learn` (NearestNeighbors, silhouette, CH, DBI, MI)
- `hdbscan` (cluster-level specs, `snc` / `c_evm`)
- `numba` in hot loops (trustworthiness, MRRE, steadiness / cohesiveness)
- `pandas` (result frames)

Compiled extensions (numba, scikit-learn BLAS kernels, hdbscan's Cython) mean you can't run zadu under Pyodide at interactive speeds, and there is no WebAssembly build. That is the motivation for the TypeScript/JS port `zadu-js` — see `zadu-js.md`.

## zaduvis companion

`zaduvis` consumes the `local` output from `measure_with_local` and renders:

- **Shepard diagrams** — scatter of high-D vs low-D pairwise distances.
- **CheckViz** — Voronoi tiles of the 2D embedding colored by per-point trustworthiness / continuity loss.
- **Local distortion maps** — continuous heatmaps of per-point steadiness / cohesiveness or MRRE.
- **Reliability / distortion arrows** — per-point glyphs showing missing vs. false neighbors.

For DRExplorer: CheckViz and Shepard diagrams are the highest ROI since we already compute `tnc` and can add pairwise-distance scatter cheaply. Local S/Co maps are the natural next step once `snc` local arrays are surfaced.

## Mapping: zadu-js coverage today

| Python zadu metric | In zadu-js? |
|---|---|
| `trustworthiness` | yes |
| `continuity` | yes |
| `tnc` | yes |
| `snc` (steadiness & cohesiveness) | yes |
| `mrre` | no |
| `lcmc` | no |
| `neighborhood_hit` | no |
| `neighbor_dissimilarity` | no |
| `ca_tnc` | no |
| `procrustes` | no |
| `stress` / `kl_div` | no |
| `dsc` | no |
| `l_tnc` | no |
| `silhouette`, `ch`, `dbi`, `ivm` | no |
| `c_evm` | no |
| `dtm` | no |
| `pearson_r`, `spearman_rho`, `mutual_info` | no |
| `random_triplet` | no |
| `topographic_product` | no |

Everything beyond the first four rows is a potential contribution back to zadu-js.

## Citation

```bibtex
@inproceedings{jeon2023zadu,
  title         = {ZADU: A Python Library for Evaluating the Reliability of
                   Dimensionality Reduction Embeddings},
  author        = {Jeon, Hyeon and Aupetit, Michael and Shin, Soohyun and
                   Chung, Aeri and Park, Takanori and Seo, Jinwook},
  booktitle     = {2023 IEEE Visualization and Visual Analytics (VIS)},
  year          = {2023},
  pages         = {196--200},
  publisher     = {IEEE},
  doi           = {10.1109/VIS54172.2023.00048},
  eprint        = {2308.00282},
  archivePrefix = {arXiv}
}
```

## See also

- https://github.com/hj-n/zadu
- https://github.com/hj-n/zaduvis
- https://arxiv.org/abs/2308.00282
- https://github.com/hj-n/steadiness-cohesiveness (original S & C reference implementation)
- `zadu-js.md`, `quality-metrics.md` (sibling docs)
