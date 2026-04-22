// scatterControls — collapsible reactive widget for choosing which row
// attributes drive the scatter's color, size, and opacity channels.
//
//   const enc = view(scatterControls({
//     columns: ["track", "authors"],
//     extraColumns: ["trustworthiness", "continuity"],   // optional
//   }));
//   enc  // => { color: "track" | null, size: null, opacity: null }
//
// State persists across DR runs because the widget lives in its own
// reactive cell in src/index.md — downstream cells re-read .value but
// don't rebuild the widget, so the user's picks survive re-renders of
// the scatter.
//
// `extraColumns` are additional options appended to every channel's
// dropdown (separated visually in a second <optgroup>). Use this for
// virtual columns like metric scores that aren't present on every row
// but that do get attached to the data at display time.
//
// The returned element exposes a `setEncoding(channel, value)` method so
// external callers (e.g., a "Color by this metric" button in the metrics
// panel) can programmatically update the dropdown and fire the reactive
// input event. `value = null` resets that channel to "(none)".

import * as htl from "npm:htl";
import { reactiveWidget, dispatchInput } from "./reactive-widget.js";

const CHANNELS = ["color", "size", "opacity"];

function channelSelect(name, columns, extraColumns, current, onChange) {
  const mainOptions = columns.map(
    (c) => htl.html`<option value=${c} selected=${c === current}>${c}</option>`,
  );
  const extraOptions = extraColumns.length > 0
    ? htl.html`<optgroup label="metrics">${extraColumns.map(
        (c) => htl.html`<option value=${c} selected=${c === current}>${c}</option>`,
      )}</optgroup>`
    : null;

  // htl: boolean attributes via `selected=${bool}`, not string interpolation.
  const select = htl.html`<select style="min-width: 10em;">
    <option value="" selected=${current == null}>(none)</option>
    ${mainOptions}
    ${extraOptions}
  </select>`;
  select.addEventListener("input", (e) => onChange(e.target.value || null));
  return htl.html`<label style="display:flex;gap:.5em;align-items:center;margin:.25em 0;">
    <span style="min-width:5em;text-transform:capitalize;">${name}</span>
    ${select}
  </label>`;
}

export function scatterControls({
  columns = [],
  extraColumns = [],
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

  function commit(next, { silent = false } = {}) {
    current = next;
    widget.value = current;
    if (!silent) dispatchInput(widget);
    render();
  }

  function render() {
    body.replaceChildren(
      ...CHANNELS.map((ch) =>
        channelSelect(ch, columns, extraColumns, current[ch], (v) =>
          commit({ ...current, [ch]: v }),
        ),
      ),
    );
  }

  // External hook: programmatically set a channel. Dispatches the reactive
  // input event so consumers see the change.
  container.setEncoding = (channel, value) => {
    if (!CHANNELS.includes(channel)) return;
    if (current[channel] === value) return; // no-op (avoids reactive churn)
    commit({ ...current, [channel]: value });
  };

  render();
  return container;
}
