// scatterControls — collapsible reactive widget for choosing which row
// attributes drive the scatter's color, size, and opacity channels.
//
//   const enc = view(scatterControls({ columns: ["track", "trustworthiness", …] }));
//   enc  // => { color: "track" | null, size: "trustworthiness" | null, opacity: null }
//
// State persists across DR runs because the widget lives in its own
// reactive cell in src/index.md — downstream cells re-read .value but
// don't rebuild the widget, so the user's picks survive re-renders of
// the scatter.

import * as htl from "npm:htl";
import { reactiveWidget, dispatchInput } from "./reactive-widget.js";

const CHANNELS = ["color", "size", "opacity"];

function channelSelect(name, columns, current, onChange) {
  // htl requires boolean attributes via `selected=${bool}`, not bare string
  // interpolation in attribute position. Same gotcha as dr-controls.js.
  const select = htl.html`<select style="min-width: 9em;">
    <option value="" selected=${current == null}>(none)</option>
    ${columns.map(
      (c) => htl.html`<option value=${c} selected=${c === current}>${c}</option>`,
    )}
  </select>`;
  select.addEventListener("input", (e) => onChange(e.target.value || null));
  return htl.html`<label style="display:flex;gap:.5em;align-items:center;margin:.25em 0;">
    <span style="min-width:5em;text-transform:capitalize;">${name}</span>
    ${select}
  </label>`;
}

export function scatterControls({
  columns = [],
  defaults = { color: null, size: null, opacity: null },
  label = "Scatter encodings",
  open = true,
} = {}) {
  const container = htl.html`<details class="drexplorer-scatter-controls" open=${Boolean(open)} style="margin:.5em 0;">
    <summary style="cursor:pointer;font-weight:600;">${label}</summary>
    <div class="drexplorer-scatter-controls-body" style="padding:.25em 0;"></div>
  </details>`;
  const body = container.querySelector(".drexplorer-scatter-controls-body");

  let current = { ...defaults };
  const widget = reactiveWidget(container, { value: current });

  function render() {
    body.replaceChildren(
      ...CHANNELS.map((ch) =>
        channelSelect(ch, columns, current[ch], (v) => {
          current = { ...current, [ch]: v };
          widget.value = current;
          dispatchInput(widget);
          render();
        }),
      ),
    );
  }

  render();
  return container;
}
