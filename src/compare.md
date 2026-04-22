# Compare runs

Pick two saved runs to see them side-by-side. Brushing in either scatter
highlights the same point ids in the other — so you can spot distortion by
finding a region that clusters tightly on one side and scatters on the other.

```js
import { BrushableScatterPlot } from "./components/brushable-scatter.js";
import { runList } from "./components/run-list.js";
import { listRuns } from "./lib/run-store.js";
```

```js
// Two run-lists so the user can select one per side. savedCount is managed
// on index.md; on this page we only read — changes won't flow in until we
// navigate, which is fine for comparing pinned runs.
const runs = listRuns();
```

<div class="grid grid-cols-2">
  <div class="card">
    <h3>Left run</h3>

```js
const leftPick = view(runList());
```

  </div>
  <div class="card">
    <h3>Right run</h3>

```js
const rightPick = view(runList());
```

  </div>
</div>

```js
// Fall back to the two most recent if the user hasn't picked.
const leftRun = leftPick ?? runs[0] ?? null;
const rightRun = rightPick ?? runs[1] ?? null;
```

```js
// Shared brush state: a Set of point ids selected on either side. Empty set
// means "no brush". Kept in its own cell so consumer cells that read it
// properly re-run on .value changes. `setBrushed` is co-located with the
// Mutable so it inherits the cell's write privilege; call it from any
// cell to update.
const brushed = Mutable(new Set());
const setBrushed = (ids) => { brushed.value = ids; };
```

```js
function rowsFor(run) {
  if (!run) return [];
  const ids = run.ids ?? run.embedding.map((_, i) => i);
  return run.embedding.map((xy, i) => ({ id: ids[i], x: xy[0], y: xy[1] }));
}

// makeScatter receives the current `brushed` Set via closure capture (as a
// reference to the Mutable). It also needs to *read* the current value to
// paint, but we accept `brushedSet` as an explicit parameter so the caller's
// cell tracks brushed as a reactive dependency.
function makeScatter(run, brushedSet) {
  if (!run) return html`<em>No run on this side yet</em>`;
  const rows = rowsFor(run);
  const hasBrush = brushedSet.size > 0;
  const colored = rows.map((d) => ({
    ...d,
    brushed: hasBrush ? (brushedSet.has(d.id) ? 1 : 0) : 0.5,
  }));
  const widget = BrushableScatterPlot(colored, {
    x: "x", y: "y", id: "id",
    color: hasBrush ? "brushed" : undefined,
    colorScheme: "blues",
    width: 420,
    height: 360,
  });
  widget.addEventListener("input", () => {
    const ids = new Set((widget.value?.brushed ?? []).map((d) => d.id));
    setBrushed(ids);
  });
  return widget;
}
```

```js
// Each scatter gets its own cell, depending on `brushed`. When brushed
// changes, each cell re-runs, makeScatter rebuilds the widget with the
// new Set, and the `${leftScatter}` / `${rightScatter}` expression cells
// swap the DOM node.
const leftScatter = makeScatter(leftRun, brushed);
```

```js
const rightScatter = makeScatter(rightRun, brushed);
```

<div class="grid grid-cols-2">
  <div class="card">
    <h3>${leftRun?.name ?? "Left"}</h3>
    ${leftRun?.metrics ? html`<div style="font-size:.85em;color:var(--theme-foreground-muted);">T ${leftRun.metrics.trustworthiness?.score?.toFixed(3)} · C ${leftRun.metrics.continuity?.score?.toFixed(3)}</div>` : ""}
    ${leftScatter}
  </div>
  <div class="card">
    <h3>${rightRun?.name ?? "Right"}</h3>
    ${rightRun?.metrics ? html`<div style="font-size:.85em;color:var(--theme-foreground-muted);">T ${rightRun.metrics.trustworthiness?.score?.toFixed(3)} · C ${rightRun.metrics.continuity?.score?.toFixed(3)}</div>` : ""}
    ${rightScatter}
  </div>
</div>

```js
const clearBtn = Inputs.button("Clear brush", {
  value: 0,
  reduce: (v) => { setBrushed(new Set()); return v + 1; },
});
display(html`<div style="display:flex;gap:.5em;align-items:center;color:var(--theme-foreground-muted);font-size:.85em;margin-top:.5em;">
  Brushed: <strong>${brushed.size}</strong> point${brushed.size === 1 ? "" : "s"}
  ${brushed.size > 0 ? clearBtn : ""}
</div>`);
```

TODO (Phase 5): per-side metrics histograms, Procrustes-aligned overlay, worst-offender highlighting.
