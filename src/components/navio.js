// navio — reactive widget for summarizing / filtering tabular data.
// Wraps https://navio.dev (npm: navio) in the reactive-widgets contract.
//
// navio's own API mounts into a d3 selection and calls `updateCallback` when
// the filtered selection changes. We turn that into a DOM element whose
// `.value` is the current filtered data and which dispatches a bubbling
// `input` event on every filter change.
//
//   const filtered = view(navio(data, { height, maxNumDistictForCategorical }));
//
// Empty data returns a thin placeholder so the page isn't blank while the
// user is picking a file or while a DR rerun is mid-flight.

import * as d3 from "npm:d3";
import * as htl from "npm:htl";
import navioFactory from "npm:navio";
import { reactiveWidget, setValue } from "./reactive-widget.js";

const DEFAULTS = {
  height: 260,
  attribWidth: 12,
  y0: 70,
  maxNumDistictForCategorical: 10,
  maxNumDistictForOrdered: 90,
};

export function navio(data, options = {}) {
  const opts = { ...DEFAULTS, ...options };
  const container = htl.html`<div class="drexplorer-navio" style="width:100%;overflow:auto;"></div>`;
  const widget = reactiveWidget(container, { value: data });

  if (!Array.isArray(data) || data.length === 0) {
    container.append(
      htl.html`<div style="color:var(--theme-foreground-muted);font-size:.85em;padding:.5em;">navio — load a dataset to see summary columns here.</div>`
    );
    return widget;
  }

  // navio mounts into a d3 selection; give it an inner target so our
  // outer container can keep its widget semantics.
  const target = htl.html`<div></div>`;
  container.append(target);

  const nv = navioFactory(d3.select(target), opts.height);
  for (const k of Object.keys(opts)) {
    if (k !== "height") nv[k] = opts[k];
  }
  nv.updateCallback((selected) => {
    setValue(widget, selected ?? []);
  });
  nv.data(data);
  nv.addAllAttribs();

  return widget;
}
