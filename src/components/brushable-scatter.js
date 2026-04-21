// BrushableScatterPlot — a reactive scatter widget.
//
// Matches the API of @john-guerra/brushable-scatterplot so we can swap in
// John's full Vega-Lite widget later without changing callers:
//
//   const sel = view(BrushableScatterPlot(data, {x, y, id, color, size, tooltip, interactive}));
//   sel.brushed  // array of rows inside the brush (or null)
//   sel.clicked  // last-clicked row (or null)
//
// v0 implementation uses Observable Plot (npm:@observablehq/plot) for speed of
// bring-up. The reactive-widget contract is identical, so the swap is local.
//
// TODO(phase1): evaluate swapping in @john-guerra/brushable-scatterplot by
// loading docs/brushable-scatterplot.tgz through an Observable runtime wrapper.
// Tracked in the plan.

import * as Plot from "npm:@observablehq/plot";
import * as d3 from "npm:d3";
import * as htl from "npm:htl";
import { reactiveWidget } from "./reactive-widget.js";

export function BrushableScatterPlot(data, options = {}) {
  const {
    x = "x",
    y = "y",
    color,
    size,
    tooltip = [],
    interactive = true,
    width = 640,
    height = 480,
    colorScheme,
  } = options;

  const container = htl.html`<div class="drexplorer-scatter" style="max-width:${width}px;"></div>`;
  const widget = reactiveWidget(container, { value: { brushed: null, clicked: null } });

  const colorAccessor = typeof color === "function" ? color : color ? (d) => d[color] : null;
  const sizeAccessor = typeof size === "function" ? size : size ? (d) => d[size] : null;
  const isColorNumeric = colorAccessor && data.length > 0 && typeof colorAccessor(data[0]) === "number";

  const marks = [
    Plot.dot(data, {
      x,
      y,
      r: sizeAccessor ? sizeAccessor : 2.5,
      fill: colorAccessor ?? "currentColor",
      stroke: "none",
      title: (d) => tooltip.map((k) => `${k}: ${d[k]}`).join("\n"),
    }),
  ];

  const plot = Plot.plot({
    width,
    height,
    color: colorAccessor
      ? {
          scheme: colorScheme ?? (isColorNumeric ? "turbo" : "tableau10"),
          legend: true,
          type: isColorNumeric ? "quantitative" : "categorical",
        }
      : undefined,
    r: sizeAccessor ? { range: [2, 12] } : undefined,
    marks,
  });

  container.append(plot);

  if (interactive) {
    // Plot's built-in pointer/interval is experimental; for Phase 0 we
    // implement brush + click by hand on the rendered SVG.
    const svg = plot;
    svg.style.cursor = "crosshair";

    const getPointFromEvent = (evt) => {
      const rect = svg.getBoundingClientRect();
      const px = evt.clientX - rect.left;
      const py = evt.clientY - rect.top;
      // Plot exposes scales:
      const sx = svg.scale("x");
      const sy = svg.scale("y");
      return { dx: sx.invert(px), dy: sy.invert(py), px, py };
    };

    svg.addEventListener("click", (evt) => {
      const { dx, dy } = getPointFromEvent(evt);
      // nearest-row click
      const nearest = d3.least(data, (d) => Math.hypot(d[x] - dx, d[y] - dy));
      widget.setValue({ ...widget.value, clicked: nearest });
    });

    let startPt = null;
    svg.addEventListener("mousedown", (evt) => {
      startPt = getPointFromEvent(evt);
    });
    svg.addEventListener("mouseup", (evt) => {
      if (!startPt) return;
      const endPt = getPointFromEvent(evt);
      const xr = [Math.min(startPt.dx, endPt.dx), Math.max(startPt.dx, endPt.dx)];
      const yr = [Math.min(startPt.dy, endPt.dy), Math.max(startPt.dy, endPt.dy)];
      const dragPx = Math.hypot(endPt.px - startPt.px, endPt.py - startPt.py);
      startPt = null;
      if (dragPx < 4) return; // click, not brush
      const brushed = data.filter(
        (d) => d[x] >= xr[0] && d[x] <= xr[1] && d[y] >= yr[0] && d[y] <= yr[1]
      );
      widget.setValue({ ...widget.value, brushed });
    });
  }

  return container;
}
