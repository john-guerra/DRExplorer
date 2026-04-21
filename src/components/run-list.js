// runList — reactive widget showing saved runs with selection.
//
//   const pick = view(runList());
//   pick  // => selected run object { id, name, algo, createdAt, ... } or null
//
// Backing store is localStorage via src/lib/run-store.js.

import * as htl from "npm:htl";
import { reactiveWidget, dispatchInput } from "./reactive-widget.js";
import { listRuns, deleteRun } from "../lib/run-store.js";

export function runList() {
  const container = htl.html`<div class="drexplorer-run-list"></div>`;
  const widget = reactiveWidget(container, { value: null });

  function render() {
    const runs = listRuns();
    if (runs.length === 0) {
      container.replaceChildren(htl.html`<div style="color:var(--theme-foreground-muted);padding:.5em;">No saved runs yet. Press "Run" and then "Save run" to keep one here.</div>`);
      return;
    }
    container.replaceChildren(htl.html`<ul style="list-style:none;padding:0;margin:0;">
      ${runs.map((r) => {
        const row = htl.html`<li style="display:flex;gap:.5em;padding:.25em;border-bottom:1px solid var(--theme-foreground-fainter);cursor:pointer;align-items:center;">
          <div style="flex:1;">
            <div style="font-weight:600;">${r.name ?? r.algo}</div>
            <div style="font-size:.85em;color:var(--theme-foreground-muted);">${r.algo} · ${new Date(r.createdAt).toLocaleString()}</div>
          </div>
          ${r.metrics?.trustworthiness ? htl.html`<div style="font-size:.85em;">T ${r.metrics.trustworthiness.score?.toFixed(3)}</div>` : htl.html``}
        </li>`;
        row.addEventListener("click", () => {
          widget.value = r;
          dispatchInput(widget);
        });
        return row;
      })}
    </ul>`);
  }

  container.refresh = render;
  render();
  return container;
}

export { deleteRun };
