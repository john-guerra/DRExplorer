# Thesis summary — ZADU.js

Source: `docs/Jonathan_Tarun_Rajasekaran___Master_Thesis_after_defense.pdf`.

## Abstract / research question
"ZADU.js — Measuring And Visualizing Distortions In Dimensionally Reduced Data On The Browser" by Jonathan Tarun Rajasekaran (MS Computer Science, Northeastern, Apr 2026; advised by Dr. John A. Guerra-Gomez; readers Dr. Yifan Hu, Dr. Miguel Fuentes-Cabrera). Addresses a gap in DR tooling: existing quality frameworks (Python ZADU, CheckViz) require server-side Python, inaccessible in browser-based visual analytics. Analysts rely on aggregate scores that cannot localize distortion. The research question: can browser-native, per-point DR quality assessment be made practical and useful for interactive parameter tuning?

## The zadu-js library
Open-source JavaScript port of a subset of the Python ZADU library, covering four metrics:
- **Trustworthiness (T)**: false neighbors (neighbors in LD that weren't neighbors in HD).
- **Continuity (C)**: missing neighbors (neighbors in HD that aren't neighbors in LD).
- **Steadiness (S)**: phantom cluster detection.
- **Cohesiveness (Co)**: cluster dispersion.

T and C are point-level, from ranks of k-nearest neighbors in HD and LD using the Venna/Kaski formulation. S and Co are cluster-level via HDBSCAN plus random-walk sampling using Shared-Nearest-Neighbor distances (Jeon et al.). Design choices: ES modules, no Python or server dependency, npm + CDN distribution, array-based API returning per-point scores aligned with input arrays so they map directly to D3 / Vega-Lite visual channels (color, size, opacity). Algorithm-agnostic; interoperates with druid.js for UMAP.

## The DR Explorer web application (existing prototype)
Self-contained HTML file `visualize-tuning-digits.html` integrates druid.js UMAP + ZADU.js + D3.js rendering, no build step. Layout: Quality Overview panel with color-coded severity badges, UMAP Parameters panel with sliders for `n_neighbors` (5–50) and `min_dist` (0.01–0.50), side-by-side baseline-vs-current scatter. Each point is a 28x28 canvas-drawn digit thumbnail; border = class, fill = per-point metric score. Features: metric selector (T/C/S/Co), color schemes (viridis, spectral, turbo, grayscale, blue-red), hover tooltips with D3 force-simulation separation for overlapping points, click-to-highlight 7-NN linking across both panels, baseline-vs-optimized metrics comparison table with green / red change indicators.

## Evaluation results
MNIST-200 (200 samples, 784 → 2D). Baseline (`n_neighbors=15, min_dist=0.10`): T=0.9281, C=0.9494, S=0.7913, Co=0.6432. Directional parameter sweep across 20 configurations: best composite 0.853 at `n_neighbors=25, min_dist=0.14`, raising Cohesiveness to 0.681. Per-point analysis: digits 0, 1, 6 project reliably; 3, 4, 8, 9 consistently low (min T=0.505, C=0.440), matching known pixel-space overlap. Performance: T ~18–24 ms, C ~18–24 ms, S+Co ~233 ms; all four metrics under 280 ms total — well within interactive thresholds.

## Future work and limitations (from thesis)
- O(n²·d) pairwise distance breaks around n=10,000. HNSW approximate NN → O(n log n).
- Metric computation blocks main thread. **WebWorker parallelization needed.** *(DRExplorer fixes this.)*
- S and Co rely on offline HDBSCAN precomputation because no browser HDBSCAN exists.
- No formal user study conducted (protocol drafted for 10–14 participants, 60-min think-aloud).
- Per-class quality breakdowns for labeled datasets.
- Real-time quality feedback fed back into UMAP optimization epochs.

## DRExplorer's relation to the thesis
The thesis proved one static DR (UMAP) + zadu-js works in the browser for 200 points. DRExplorer builds on that proof by generalizing to seven algorithms, adding saved / comparable runs, moving all compute (DR **and** metrics) into workers, and showing metrics as distributions (per John's review note) rather than single numbers.

## Resources
- npm `zadu-js`, repo `github.com/jonathantarun/zadu-js`
- Live demo `jonathantarun.github.io/zadu-js/examples/visualize-tuning-digits.html`
- VIS 2025 paper explorer `johnguerra.co/viz/ieeevis2025Papers/`
