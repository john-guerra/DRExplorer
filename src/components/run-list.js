// runList — reactive widget showing saved runs with selection + delete.
//
//   const pick = view(runList({ refreshToken }));
//   pick  // => selected run object { id, name, algo, createdAt, ... } or null
//
// `refreshToken` is any value that changes when the list should rebuild
// (e.g., an increment from a "Save run" button). Passing it through the
// argument object keeps the widget reactive without reaching into globals.
// Omit it and the list builds once at creation time.
//
// Backing store is localStorage via src/lib/run-store.js.

import * as htl from "npm:htl";
import { reactiveWidget, dispatchInput } from "./reactive-widget.js";
import { listRuns, deleteRun } from "../lib/run-store.js";

export function runList({ refreshToken } = {}) {
  const container = htl.html`<div class="drexplorer-run-list"></div>`;
  const widget = reactiveWidget(container, { value: null });
  // Track the refreshToken so we can tell whether to clear the selection on
  // a rebuild. When refreshToken changes, treat the list as freshly built.
  void refreshToken;

  function render() {
    const runs = listRuns();
    if (runs.length === 0) {
      container.replaceChildren(htl.html`<div style="color:var(--theme-foreground-muted);padding:.5em;">No saved runs yet. Press "Save run" to keep one here.</div>`);
      return;
    }
    container.replaceChildren(htl.html`<ul style="list-style:none;padding:0;margin:0;">
      ${runs.map((r) => {
        const selectBtn = htl.html`<div style="flex:1;cursor:pointer;">
          <div style="font-weight:600;">${r.name ?? r.algo}</div>
          <div style="font-size:.85em;color:var(--theme-foreground-muted);">${r.algo} · ${new Date(r.createdAt).toLocaleString()}</div>
          ${r.metrics?.trustworthiness ? htl.html`<div style="font-size:.8em;">T ${r.metrics.trustworthiness.score?.toFixed(3)} · C ${r.metrics.continuity?.score?.toFixed(3)}</div>` : htl.html``}
        </div>`;
        selectBtn.addEventListener("click", () => {
          widget.value = r;
          dispatchInput(widget);
          // re-render so the current row shows as selected
          render();
        });
        const delBtn = htl.html`<button type="button" title="Delete run" style="background:none;border:none;color:var(--theme-foreground-muted);cursor:pointer;font-size:1.1em;padding:.2em .4em;">×</button>`;
        delBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          deleteRun(r.id);
          if (widget.value?.id === r.id) {
            widget.value = null;
            dispatchInput(widget);
          }
          render();
        });
        const isSelected = widget.value?.id === r.id;
        return htl.html`<li style="display:flex;gap:.25em;padding:.25em;border-bottom:1px solid var(--theme-foreground-fainter);align-items:center;${isSelected ? "background:var(--theme-background-alt);" : ""}">
          ${selectBtn}
          ${delBtn}
        </li>`;
      })}
    </ul>`);
  }

  container.refresh = render;
  render();
  return container;
}

export { deleteRun };
