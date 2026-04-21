# Observable Framework

## Overview
Observable Framework is an open-source static site generator for data apps, dashboards, and reports. You write Markdown pages that intermingle HTML, reactive JavaScript, SQL, and inline expressions; Framework compiles everything into a static site (HTML, JS, CSS, plus pre-built data snapshots) that runs on the Observable runtime and can be hosted anywhere. Docs: https://observablehq.com/framework/

## Project structure
A Framework project has a source root (default `src/`) and an `observablehq.config.js` at the repo root. Inside `src/` you put Markdown pages (file-based routing: `src/foo.md` → `/foo`), a recommended `src/data/` for data loaders, and a recommended `src/components/` for shared JS. An auto-generated `src/.observablehq/cache/` holds data-loader outputs and npm downloads. `observablehq.config.js` configures title, sidebar nav (`pages`), theme, source root, interpreters, head/header/footer, and build output. Docs: https://observablehq.com/framework/project-structure, https://observablehq.com/framework/config

```
src/
  index.md
  data/quakes.csv.ts      # data loader
  components/dotmap.js    # shared JS
observablehq.config.js
```

## Authoring model (Markdown + JS)
Pages are Markdown with two JS constructs: fenced js blocks and inline `${ ... }` expressions. Expression blocks (no trailing semicolon) implicitly display; program blocks (semicolons, `const`, etc.) don't, but can call `display(value)`. An expression returning a DOM node is inserted into the page. Top-level `const`/`let` in any JS block become page-wide **reactive** variables usable from any other block or `${}` interpolation. TS blocks are supported (transpiled, not type-checked). Docs: https://observablehq.com/framework/javascript, https://observablehq.com/framework/markdown

## Reactivity model
Most important concept. Framework is a dataflow graph at the JS-language layer, not a framework API. Top-level variables are nodes; cells that reference them are edges. Cells run in topological order, not document order, and only downstream cells re-run when a dependency changes. Promises are implicitly awaited across cells (so `const data = FileAttachment("x.json").json()` can be referenced elsewhere as resolved data), and async generators are implicitly iterated — every yielded value pushes through the graph. `view(element)` displays an input element and returns a generator of its `.value` (via `Generators.input`). `Mutable(initial)` is a write-yourself reactive cell (like `useState`). `invalidation` is a promise resolved when a cell is about to re-run — use it to cancel timers / sockets / workers. Docs: https://observablehq.com/framework/reactivity

```js
const params = view(Inputs.form({perplexity: Inputs.range([5, 100], {step: 1, value: 30})}));
const embedding = runTSNE(data, params); // re-runs when params change
```

## Imports
Four flavors: `npm:` (auto-downloaded and self-hosted via jsDelivr's `esm.run`, cached in `.observablehq/cache/_npm`, semver supported), bare specifiers resolved from local `node_modules/` (transpiled by esbuild), local `./foo.js` (with HMR), and remote URLs (not self-hosted — use sparingly). Static `import` is preloaded; dynamic `await import("npm:...")` works but must use a static string literal. Local JS modules are NOT reactive internally — export async/generator functions if you want to feed the reactive graph. Docs: https://observablehq.com/framework/imports

## Data loaders
A data loader is a program named after the file it produces: `src/data/points.parquet.py` runs `python3` at build time and its stdout becomes `/data/points.parquet`. Out-of-the-box: `.js`, `.ts`, `.py`, `.R`, `.rs`, `.go`, `.java`, `.jl`, `.php`, `.sh`, `.exe`. Loaders run on first reference during preview (cached) and at build time for production. They can emit `.zip`/`.tar.gz` archives from which `FileAttachment` pulls individual members. Docs: https://observablehq.com/framework/data-loaders

## FileAttachment
`FileAttachment("path")` returns a lazy handle. Its argument must be a **static string literal** — this is enforced so the build can statically extract referenced files and hash-bust them. Content methods: `.text()`, `.json()`, `.csv({typed: true})`, `.tsv()`, `.dsv()`, `.arrow()`, `.arquero()`, `.parquet()`, `.sqlite()`, `.arrayBuffer()`, `.blob()`, `.stream()`, `.image()`, `.html()`, `.xml()`, `.xlsx()`, `.zip()`, plus `.href`. Relative to the calling `.md`/`.js`. Docs: https://observablehq.com/framework/files

## Inputs
`Inputs.*` library (`npm:@observablehq/inputs`, implicit in Markdown) gives button, checkbox, color, date, file, form, radio, range, search, select, table, text, textarea, toggle. Reactive pattern: `const x = view(Inputs.range([0,1]))`. Any HTML element that exposes `.value` and fires `input` events plugs into this pattern — custom widgets are first-class. **This is exactly the reactive-widgets contract** (see `reactive-widgets.md`). Docs: https://observablehq.com/framework/inputs, https://observablehq.com/framework/lib/inputs

## Components / custom widgets
Put reusable widgets in `src/components/foo.js` and `import {foo} from "./components/foo.js"`. Modules are plain ESM — export pure rendering functions that return DOM nodes (via `hypertext-literal`, Plot, D3, etc.). They have no internal reactivity; pass inputs in, return a node, let the caller place it in the reactive graph. For shared reactive state, export async generators.

## Workers and heavy compute (critical for DRExplorer)
Framework has **no first-class Web Worker abstraction**. For DR we ship a worker script as a local file, `new Worker(import.meta.resolve("./components/dr-worker.js"), {type: "module"})`, wrap it in `Generators.observe` so each iteration streams into the graph, and close in `invalidation.then(() => worker.terminate())`. Fil's `@observablehq/worker` helper is a thin wrapper around this pattern (see `fil-worker.md`). DuckDB-WASM handles heavy tabular off main thread.

## Styling
Built-in themes set CSS custom properties. Light: `air` (default), `cotton`, `glacier`, `parchment`. Dark: `near-midnight` (default), `slate`, `ink`, `midnight`, `coffee`. `theme: ["light", "dark"]` for auto `prefers-color-scheme`. Modifiers: `alt`, `wide`. `dashboard` = `[light, dark, alt, wide]`. Classes: `.card`, `.grid`, `.grid-cols-N`. Reactive `width` variable + `resize((w, h) => ...)` helper. Docs: https://observablehq.com/framework/themes

## Build and deploy
`npm run dev` → preview server at `127.0.0.1:3000` with HMR. `npm run build` → `dist/`: HTML, JS, CSS, hashed data under `_file/`, self-hosted npm deps under `_npm/`. Deploy anywhere static. Canonical GitHub Actions workflow: `npm ci && npm run build` and upload `dist/`, with cache on `src/.observablehq/cache` keyed by `src/data/*` hash. Docs: https://observablehq.com/framework/deploying

## Gotchas for a DR playground
- **Re-run on demand**: no imperative re-run cell API. Restart pattern = `Mutable` run-token that a button increments, or re-assign params.
- **Long-running iterative compute**: async generator yields intermediate embeddings; downstream plots auto-refresh. Cleanup via `invalidation.then(() => worker.terminate())`.
- **Persisted state across reloads**: Framework provides nothing. Use `localStorage`/`IndexedDB`, or `idb-keyval` from `npm:`. For saved runs, IndexedDB is recommended because embeddings can be MBs.
- **Shipping MBs of embeddings**: Statically analyzed `FileAttachment` files go into `dist/_file/` with content hashes + long cache. Fine for hundreds of MB. Prefer Parquet over JSON. For truly large data, compute DR in a data loader and ship only 2D/3D.
- **Cells scoped per page**: global app state across routes = URL params, localStorage, or a shared JS module.

## When Framework vs Vite + React
Framework: document-shaped app, mostly panels + inputs, interaction fits "inputs → recompute → redraw". Way less code. Vite + React: routed multi-view app shell, complex stateful components, design system, SSR/auth, fine-grained worker orchestration. For a DR playground Framework is the right default.

## See also
- https://observablehq.com/framework/
- https://observablehq.com/framework/getting-started
- https://observablehq.com/framework/project-structure
- https://observablehq.com/framework/markdown
- https://observablehq.com/framework/javascript
- https://observablehq.com/framework/reactivity
- https://observablehq.com/framework/imports
- https://observablehq.com/framework/data-loaders
- https://observablehq.com/framework/files
- https://observablehq.com/framework/inputs
- https://observablehq.com/framework/lib/inputs
- https://observablehq.com/framework/themes
- https://observablehq.com/framework/config
- https://observablehq.com/framework/deploying
