# Compare runs

Pick two saved runs to see them side-by-side. Brushing in either scatter
highlights the same point ids in the other — so you can spot distortion by
finding a region that clusters tightly on one side and scatters on the other.

```js
import { BrushableScatterPlot } from "./components/brushable-scatter.js";
import { runList } from "./components/run-list.js";
import { metricsPanel } from "./components/metrics-panel.js";
import { listRuns } from "./lib/run-store.js";
import { procrustes } from "./lib/procrustes.js";
```

```js
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
const leftRun = leftPick ?? runs[0] ?? null;
const rightRun = rightPick ?? runs[1] ?? null;
```

```js
// Shared brush state: a Set of point ids selected on either side. Empty set
// means "no brush". `setBrushed` is co-located with the Mutable so it
// inherits the cell's write privilege.
const brushed = Mutable(new Set());
const setBrushed = (ids) => { brushed.value = ids; };
```

## Alignment

```js
// Procrustes aligns the right embedding to the left via SVD rotation +
// uniform scaling. Useful because two DR runs of the same data land in
// arbitrary rotations / reflections — alignment makes a "points moved here
// vs there" read meaningful.
const alignOn = view(Inputs.toggle({ label: "Procrustes-align right → left", value: false }));
```

```js
function rowsFor(run, align = null) {
  if (!run) return [];
  const ids = run.ids ?? run.embedding.map((_, i) => i);
  // align: optional 2×2 rotation + translation + scale producing aligned coords.
  if (align) {
    return run.embedding.map((xy, i) => {
      const [x, y] = align.apply(xy[0], xy[1]);
      return { id: ids[i], x, y };
    });
  }
  return run.embedding.map((xy, i) => ({ id: ids[i], x: xy[0], y: xy[1] }));
}

async function makeScatter(run, brushedSet, align = null) {
  if (!run) return html`<em>No run on this side yet</em>`;
  const rows = rowsFor(run, align);
  const hasBrush = brushedSet.size > 0;
  const colored = rows.map((d) => ({
    ...d,
    brushed: hasBrush ? (brushedSet.has(d.id) ? 1 : 0) : 0.5,
  }));
  const widget = await BrushableScatterPlot(colored, {
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

// When align is on, fit the right embedding onto the left via ids that
// appear in both. Skips alignment gracefully if fewer than 3 common ids
// (degenerate SVD).
function alignmentFor(left, right) {
  if (!left || !right) return null;
  const leftIds = left.ids ?? left.embedding.map((_, i) => i);
  const rightIds = right.ids ?? right.embedding.map((_, i) => i);
  const leftByIndex = new Map(leftIds.map((id, i) => [id, left.embedding[i]]));
  const common = [];
  for (let j = 0; j < rightIds.length; j++) {
    const lp = leftByIndex.get(rightIds[j]);
    if (lp) common.push({ src: right.embedding[j], dst: lp });
  }
  if (common.length < 3) return null;
  return procrustes(common.map((c) => c.src), common.map((c) => c.dst));
}
```

```js
const rightAlign = alignOn ? alignmentFor(leftRun, rightRun) : null;
const leftScatter = makeScatter(leftRun, brushed);
```

```js
const rightScatter = makeScatter(rightRun, brushed, rightAlign);
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
    ${rightAlign ? html`<div style="font-size:.8em;color:var(--theme-foreground-muted);">aligned via ${rightAlign.n} shared ids</div>` : ""}
    ${rightScatter}
  </div>
</div>

```js
// Worst-N highlighter: surface the N lowest per-point metric scores on
// either side as the brushed selection. Makes it trivial to answer "where
// do the most-distorted points on UMAP land on PCA?".
const worstN = view(Inputs.range([1, 50], { value: 10, step: 1, label: "Highlight N worst" }));
```

```js
function worstIdsFrom(run, metric = "trustworthiness", n = 10) {
  if (!run?.metrics?.[metric]?.localScores || !run.ids) return new Set();
  const scores = run.metrics[metric].localScores;
  const paired = run.ids.map((id, i) => ({ id, s: scores[i] }));
  paired.sort((a, b) => a.s - b.s);
  return new Set(paired.slice(0, n).map((p) => p.id));
}

const worstLeftBtn = Inputs.button([
  ["worst N by T (left)", () => setBrushed(worstIdsFrom(leftRun, "trustworthiness", worstN))],
  ["worst N by C (left)", () => setBrushed(worstIdsFrom(leftRun, "continuity", worstN))],
]);
const worstRightBtn = Inputs.button([
  ["worst N by T (right)", () => setBrushed(worstIdsFrom(rightRun, "trustworthiness", worstN))],
  ["worst N by C (right)", () => setBrushed(worstIdsFrom(rightRun, "continuity", worstN))],
]);
const clearBtn = Inputs.button("Clear brush", { value: 0, reduce: (v) => { setBrushed(new Set()); return v + 1; } });

display(html`<div style="display:flex;gap:.5em;align-items:center;flex-wrap:wrap;margin:.5em 0;">
  ${worstLeftBtn} ${worstRightBtn} ${clearBtn}
  <span style="color:var(--theme-foreground-muted);font-size:.85em;">Brushed: <strong>${brushed.size}</strong></span>
</div>`);
```

## Per-side metric distributions

```js
// metricsPanel already renders histograms + worst-point lists per metric.
// Re-use it with `result` built from each saved run's stored metrics.
const leftMetrics = view(metricsPanel(leftRun?.metrics ?? null, { k: leftRun?.metrics?.trustworthiness?.k ?? 20 }));
```

```js
const rightMetrics = view(metricsPanel(rightRun?.metrics ?? null, { k: rightRun?.metrics?.trustworthiness?.k ?? 20 }));
```

<div class="grid grid-cols-2">
  <div class="card">${leftMetrics}</div>
  <div class="card">${rightMetrics}</div>
</div>
