# DRExplorer

A browser-based dimensionality-reduction playground. Pick a DR algorithm, tune its parameters, watch it run live, and score the result with per-point quality metrics.

Built on [Observable Framework](https://observablehq.com/framework/). All compute runs in Web Workers — no server. Generalizes the [UMAP Playground](https://johnguerra.co/viz/umapPlayground/) to seven DR algorithms and adds quality metrics from [zadu-js](https://github.com/jonathantarun/zadu-js).

## Features

- Seven DR algorithms from [druid.js](https://github.com/saehm/DruidJS): PCA, MDS, Isomap, LLE, t-SNE, UMAP, TriMap.
- Schema-driven parameter panel — one UI, all algorithms.
- Iterative DR streamed into the scatter plot live (every few epochs).
- Quality metrics from zadu-js: Trustworthiness, Continuity, Steadiness, Cohesiveness — shown as *distributions*, not just scores, and encoded per-point on the scatter.
- Saved runs in localStorage, compared side-by-side with linked brushing.
- Load your own data (CSV / JSON) or use the built-in CHI 2026 papers demo (2,769 × 384-d sentence embeddings).

## Development

```sh
npm install
npm run dev          # preview server at http://127.0.0.1:3000
```

## Build

```sh
npm run build        # outputs to dist/
```

## Deploy

```sh
./update.sh          # rsync dist/ to EC2 (see the script for the target)
```

## Bring your own data

Drop a file into the "Load data" widget. Supported formats: JSON array, MongoDB export, CSV (auto-typed). DRExplorer infers numeric columns and lets you pick which ones form the high-dimensional vector.

For reproducibility you can also put a file under `src/data/` and reference it with `FileAttachment("./data/yours.csv").csv({typed: true})`.

## Documentation

- [`docs/PRD.md`](./docs/PRD.md) — product requirements document.
- [`docs/research/`](./docs/research/) — background knowledge on Observable Framework, druid.js, zadu-js, Fil's Worker, the reactive-widgets pattern, the UMAP Playground architecture, and the existing thesis prototype.
- [`CLAUDE.md`](./CLAUDE.md) — repo conventions for AI-assisted development.

## Related work

- Jonathan Tarun Rajasekaran, "ZADU.js — Measuring And Visualizing Distortions In Dimensionally Reduced Data On The Browser" (Master's thesis, Northeastern, Apr 2026) — the original browser-side prototype that DRExplorer generalizes. See `docs/research/thesis-summary.md`.
- John Guerra's [UMAP Playground](https://johnguerra.co/viz/umapPlayground/) — architectural template.
- [reactivewidgets.org](https://reactivewidgets.org) — the UI contract every control in this repo implements.

## License

MIT.
