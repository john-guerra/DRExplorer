// runThumb — tiny canvas scatter preview of a saved run.
//
// Renders `run.embedding` as dots on a small canvas (default 100 × 70).
// Click the thumb to fire a bubbling "input" event with the run as .value,
// and apply a "selected" visual when `selected === run.id`.
//
//   const thumb = runThumb(run, { selected: currentRunId, onClick: (r) => ... });
//   // OR, if you just want .value + input event:
//   document.body.append(runThumb(run, { selected }));
//
// The thumb is a plain reactive widget: `.value` is the run it was created
// for; the "input" event bubbles when the user clicks it. Callers that want
// the whole gallery to react should wrap a row of thumbs (see run-gallery).

import * as htl from "npm:htl";
import { reactiveWidget, setValue } from "./reactive-widget.js";

const DEFAULTS = {
  width: 100,
  height: 70,
  pointRadius: 1.2,
  pointFill: "rgba(37, 99, 235, 0.6)",
  background: "var(--theme-background-alt, #fafafa)",
  selectedBorder: "2px solid var(--theme-foreground-focus, #2563eb)",
  border: "1px solid var(--theme-foreground-fainter, #ddd)",
};

export function runThumb(run, { selected = null, onClick } = {}, opts = {}) {
  const o = { ...DEFAULTS, ...opts };
  const isSelected = selected === run.id;

  const canvas = htl.html`<canvas
    width=${o.width}
    height=${o.height}
    style="display:block;background:${o.background};"></canvas>`;
  const container = htl.html`<div class="drexplorer-run-thumb" title=${run.name ?? run.algo}
    style="
      cursor:pointer;
      border:${isSelected ? o.selectedBorder : o.border};
      border-radius:4px;
      overflow:hidden;
      width:${o.width}px;
      transition:transform .1s;
    ">
    ${canvas}
    <div style="padding:2px 4px;font-size:.75em;line-height:1.2;background:var(--theme-background);">
      <div style="font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${run.algo}</div>
      <div style="color:var(--theme-foreground-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${run.name ?? new Date(run.createdAt).toLocaleTimeString()}</div>
    </div>
  </div>`;

  paintThumb(canvas, run.embedding ?? [], o);

  const widget = reactiveWidget(container, { value: run });
  container.addEventListener("click", () => {
    if (onClick) onClick(run);
    setValue(widget, run);
  });
  container.addEventListener("mouseenter", () => { container.style.transform = "translateY(-1px)"; });
  container.addEventListener("mouseleave", () => { container.style.transform = "none"; });
  return container;
}

// Exposed for testing — pure function that computes the (scaleX, scaleY)
// mapping a coordinate cloud onto a `[pad, width - pad] × [pad, height - pad]`
// canvas box. Returns `{ sx, sy }` as 1-arg functions.
export function fitScales(points, width, height, pad = 3) {
  if (!points.length) {
    return { sx: () => width / 2, sy: () => height / 2, xMin: 0, xMax: 0, yMin: 0, yMax: 0 };
  }
  let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity;
  for (const [x, y] of points) {
    if (x < xMin) xMin = x;
    if (x > xMax) xMax = x;
    if (y < yMin) yMin = y;
    if (y > yMax) yMax = y;
  }
  const dx = xMax - xMin || 1;
  const dy = yMax - yMin || 1;
  const plotW = Math.max(1, width - 2 * pad);
  const plotH = Math.max(1, height - 2 * pad);
  // Flip Y so higher y values render higher on the canvas.
  return {
    sx: (x) => pad + ((x - xMin) / dx) * plotW,
    sy: (y) => pad + ((yMax - y) / dy) * plotH,
    xMin, xMax, yMin, yMax,
  };
}

function paintThumb(canvas, embedding, o) {
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, o.width, o.height);
  if (!embedding.length) return;
  const { sx, sy } = fitScales(embedding, o.width, o.height);
  ctx.fillStyle = o.pointFill;
  for (const [x, y] of embedding) {
    ctx.beginPath();
    ctx.arc(sx(x), sy(y), o.pointRadius, 0, Math.PI * 2);
    ctx.fill();
  }
}
