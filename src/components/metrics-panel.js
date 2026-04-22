// metricsPanel — reactive widget showing zadu-js metrics for a run.
//
//   const pick = view(metricsPanel(metricsResult, { k }));
//   pick  // => { colorBy: "trustworthiness" | "continuity" | null }
//
// Shows, for each metric:
//   - Global score with a color-coded severity badge
//   - Distribution histogram of localScores (per John's thesis-review note:
//     "show a distribution, not just a score")
//   - A "Color scatter by this metric" button that emits .value
//
// `metricsResult` shape (from src/lib/metrics-worker.js):
//   { trustworthiness: { score, localScores, k, n },
//     continuity:      { score, localScores, k, n } }
// or null while a run is still in progress.

import * as Plot from "npm:@observablehq/plot";
import * as htl from "npm:htl";
import { reactiveWidget, dispatchInput } from "./reactive-widget.js";

// ─── USER CONTRIBUTION SLOT ───────────────────────────────────────────────
// Decide how many bins to use for the local-score distribution histogram.
//
// This is a UX call more than a math call — the histogram has to read well
// for datasets of ~200 to ~3000 points. Options to consider:
//
//   (a) Fixed count (e.g. 20). Simple, consistent look across datasets,
//       but may look under- or over-binned at the extremes.
//   (b) Square-root rule: Math.ceil(Math.sqrt(n)). Classic default; scales
//       smoothly with n. For n=200 → 15 bins, n=2700 → 52 bins.
//   (c) Sturges: Math.ceil(Math.log2(n) + 1). Assumes roughly normal data;
//       gives ~9 bins for n=200, ~12 for n=2700 — chunkier shapes.
//   (d) Freedman-Diaconis: 2·IQR·n^(-1/3). Adaptive to spread, bins narrow
//       for tight distributions, wider for spread. Most "statistically
//       correct" but can produce very many or very few bins.
//
// The localScores array is usually left-skewed (most points have high T,
// a long tail of distorted ones). We want the tail to be visible, but we
// don't want 300 bins on a 2,700-point run.
//
// TODO: Implement chooseBinCount(n, localScores) returning an integer.
// Keep it simple (5-10 lines). Clamp to a reasonable range so a pathological
// input can't blow up the chart.
function chooseBinCount(n, localScores) {
  if (n < 2) return 6;
  const sorted = [...localScores].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const iqr = q3 - q1;
  if (iqr === 0) return 10; // all scores collapsed; any bin count is lying
  const binWidth = 2 * iqr * Math.pow(n, -1 / 3);
  const range = sorted[sorted.length - 1] - sorted[0];
  const bins = Math.ceil(range / binWidth);
  return Math.max(6, Math.min(50, bins));
}
// ──────────────────────────────────────────────────────────────────────────

function severityBadge(score) {
  const pct = Math.round(score * 100);
  const color = score >= 0.9 ? "#16a34a"    // green
              : score >= 0.75 ? "#ca8a04"   // amber
              : "#dc2626";                  // red
  return htl.html`<span style="background:${color};color:white;padding:.1em .5em;border-radius:3px;font-weight:600;font-size:.85em;">${pct}%</span>`;
}

function histogram(localScores, { width = 240, height = 80 }) {
  if (!localScores || localScores.length === 0) return htl.html`<div style="color:var(--theme-foreground-muted);font-size:.85em;">no data</div>`;
  const thresholds = chooseBinCount(localScores.length, localScores);
  return Plot.plot({
    width, height,
    marginLeft: 28, marginBottom: 22, marginTop: 4, marginRight: 4,
    x: { label: "score", domain: [0, 1] },
    y: { label: "n", nice: true },
    marks: [
      Plot.rectY(localScores, Plot.binX({ y: "count" }, { x: (d) => d, thresholds, fill: "currentColor", fillOpacity: 0.7 })),
      Plot.ruleY([0]),
    ],
  });
}

function metricRow(name, result, pickedColorBy, onColorBy) {
  if (!result) return htl.html``;
  const { score, localScores, k } = result;
  const btnLabel = pickedColorBy === name ? "● coloring by this" : "Color scatter by this";
  const btn = htl.html`<button type="button" style="font-size:.85em;padding:.15em .5em;${pickedColorBy === name ? "font-weight:600;" : ""}">${btnLabel}</button>`;
  btn.addEventListener("click", () => onColorBy(pickedColorBy === name ? null : name));
  const worst = localScores.map((s, i) => ({ i, s })).sort((a, b) => a.s - b.s).slice(0, 3);
  return htl.html`<div style="display:flex;gap:1em;align-items:flex-start;padding:.5em;border:1px solid var(--theme-foreground-fainter);border-radius:4px;">
    <div style="min-width:10em;">
      <div style="font-weight:600;text-transform:capitalize;">${name}</div>
      <div style="font-size:.85em;color:var(--theme-foreground-muted);">k = ${k}, n = ${result.n}</div>
      <div style="margin:.3em 0;">${severityBadge(score)} ${score.toFixed(4)}</div>
      ${btn}
      <div style="margin-top:.4em;font-size:.8em;color:var(--theme-foreground-muted);">
        Worst points: ${worst.map(({ i, s }) => htl.html`<span title="row ${i}">${s.toFixed(2)}</span>`).reduce((a, b) => htl.html`${a} · ${b}`)}
      </div>
    </div>
    <div>${histogram(localScores, {})}</div>
  </div>`;
}

export function metricsPanel(result, { k = 20 } = {}) {
  const container = htl.html`<div class="drexplorer-metrics-panel" style="display:flex;flex-direction:column;gap:.5em;"></div>`;
  const widget = reactiveWidget(container, { value: { colorBy: null } });

  function render() {
    if (!result) {
      container.replaceChildren(htl.html`<div style="color:var(--theme-foreground-muted);font-size:.85em;">Run a DR to compute quality metrics.</div>`);
      return;
    }
    const onColorBy = (name) => {
      widget.value = { colorBy: name };
      dispatchInput(widget);
      render();
    };
    container.replaceChildren(
      metricRow("trustworthiness", result.trustworthiness, widget.value.colorBy, onColorBy),
      metricRow("continuity",      result.continuity,      widget.value.colorBy, onColorBy),
    );
  }

  render();
  return container;
}
