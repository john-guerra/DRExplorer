# CHI 2026 testbed

Source directory: `/Users/aguerra/workspace/chi2026_papers/`.

This is DRExplorer's v1 demo dataset: 2,769 CHI 2026 papers with pre-computed 384-dimensional `all-MiniLM-L6-v2` sentence embeddings. It is a real, non-trivial DR input — clusters are meaningful, algorithm differences are visible.

## Data files

| File | Schema | Records |
|---|---|---|
| `2026_04Apr_10_CHI_2026_program.json` | Top-level `{contents, sessions, events, tracks, people, ...}`. `contents[*] = {id, title, abstract, authors, trackId, tags, keywords, sessionIds}` | 2,771 items (2 papers lack abstracts) |
| `2026_04Apr_10_chi2026_embeddings_TitleAbstract.json` | `[{id, embedding: {dims, type, size: 384, data: {"0": float, "1": float, ...}}}]` — the 2 papers without abstracts are missing | 2,769 × 384 |
| `2026_04Apr_10_chi2026_umap_TitleAbstract.csv` | `id,x,y` | 2,769 rows |
| `2026_04Apr_10_chi2026_cluster_topics.json` | `{"0": "label1, label2, ...", ...}` — 6 HDBSCAN clusters labeled by c-TF-IDF | 6 |

## File naming convention (reuse)

`YYYY_MMmon_DD_<descr>.<ext>` — e.g., `2026_04Apr_10_chi2026_embeddings_TitleAbstract.json`. DRExplorer adopts this for its own dated artifacts.

## Loader output (`src/data/chi2026.json.js`)

The Observable Framework data loader reads the above files, flattens the nested `embedding.data` object into a Float32Array, and emits a tidy array of objects (the shape the `BrushableScatterPlot` widget expects):

```json
[
  {
    "id": "content_01",
    "title": "A Generative …",
    "authors": "…",
    "track": "Full Paper",
    "x": 1.23,                                        // precomputed UMAP baseline
    "y": -0.56,
    "cluster": "0",
    "clusterLabel": "llm, interface, chat, …",
    "embedding": [0.003, -0.011, 0.072, …]            // 384 numbers
  },
  …
]
```

Rationale for array-of-objects over typed arrays in the loader output: `BrushableScatterPlot`, `data-input`, and `navio` all consume tidy arrays. The embedding is preserved as a plain JS number array so downstream code can slice columns or build a matrix.

In a later optimization we may switch the loader output to Parquet + Arrow for faster parse / smaller bundle. Out of scope for v1.

## Source path

The data loader reads from an env var `CHI2026_DATA_DIR`. If unset, defaults to `/Users/aguerra/workspace/chi2026_papers/`. When deploying to EC2 we must either:

1. Copy the three source files into `DRExplorer/data/` before `npm run build`, or
2. Commit them into the repo (11+ MB each — prefer (1)).

## What is NOT reusable

The existing chi2026 web app at `/Users/aguerra/workspace/chi2026_papers/page/` embeds remote Observable notebooks via `@observablehq/runtime@5` (notebook `@john-guerra/chi2026-papers`). It is tightly coupled to the Observable runtime and to specific notebook cells. DRExplorer does **not** reuse the rendering layer. What we reuse is the data files and the naming convention.

## Baseline UMAP for v1

We use the precomputed `2026_04Apr_10_chi2026_umap_TitleAbstract.csv` as the "baseline" when the DRExplorer page first loads — it renders instantly without any DR compute, proving the scatter widget works. When the user presses "Run", DRExplorer re-computes UMAP in-browser via druid.js and replaces the baseline.
