# Compare runs

Compare two saved DR runs side-by-side with linked brushing.

```js
import { BrushableScatterPlot } from "./components/brushable-scatter.js";
import { runList } from "./components/run-list.js";
import { listRuns } from "./lib/run-store.js";
```

```js
const runs = listRuns();
```

```js
const leftPick = view(runList());
const rightPick = view(runList());
```

```js
const leftRun = leftPick ?? runs[0] ?? null;
const rightRun = rightPick ?? runs[1] ?? null;
```

<div class="grid grid-cols-2">
  <div class="card">
    <h3>${leftRun?.name ?? "Left run"}</h3>
    ${leftRun
      ? BrushableScatterPlot(leftRun.embedding.map((xy, i) => ({ id: i, x: xy[0], y: xy[1] })), { x: "x", y: "y", id: "id" })
      : htl.html`<em>No run selected</em>`}
  </div>
  <div class="card">
    <h3>${rightRun?.name ?? "Right run"}</h3>
    ${rightRun
      ? BrushableScatterPlot(rightRun.embedding.map((xy, i) => ({ id: i, x: xy[0], y: xy[1] })), { x: "x", y: "y", id: "id" })
      : htl.html`<em>No run selected</em>`}
  </div>
</div>

TODO (Phase 4): linked brushing, per-side metrics panels, Procrustes alignment.
