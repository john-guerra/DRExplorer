// runGallery — horizontal strip of run thumbnails for navigating between
// saved checkpoints. Selects a run and exposes it as the reactive value.
//
//   const picked = view(runGallery({
//     refreshToken: savedCount,
//     selectedId: currentRunId,
//     onDelete: (id) => { deleteRun(id); savedCount.value++; },
//   }));
//
// Dispatches "input" events with `.value = run` on click. The thumb itself
// handles the click and the gallery just bubbles. `refreshToken` is any
// reactive value that changes when the list should rebuild (e.g., the same
// savedCount Mutable used by the save button).

import * as htl from "npm:htl";
import { listRuns, deleteRun as storeDelete } from "../lib/run-store.js";
import { runThumb } from "./run-thumb.js";
import { reactiveWidget, setValue } from "./reactive-widget.js";

export function runGallery({
  refreshToken,
  selectedId = null,
  onDelete,
  height = 100,
  width = 120,
  emptyMessage = "No checkpoints yet. Run DR, then click Checkpoint to save this state.",
} = {}) {
  void refreshToken; // make the param visible to reactive-dep tracking

  const container = htl.html`<div class="drexplorer-run-gallery"
    style="display:flex;gap:.5em;overflow-x:auto;padding:.5em 0;min-height:${height + 12}px;align-items:stretch;"></div>`;
  const widget = reactiveWidget(container, { value: null });

  function render() {
    const runs = listRuns();
    if (runs.length === 0) {
      container.replaceChildren(htl.html`<div style="color:var(--theme-foreground-muted);font-size:.85em;padding:.5em;">${emptyMessage}</div>`);
      return;
    }
    container.replaceChildren(
      ...runs.map((r) => {
        const thumb = runThumb(r, { selected: selectedId, onClick: (run) => setValue(widget, run) }, {
          width, height,
        });
        // Tiny delete (×) in the corner. stopPropagation so it doesn't also
        // fire the thumb's click handler and swap the current selection.
        const del = htl.html`<button type="button" title="Delete checkpoint"
          style="position:absolute;top:2px;right:2px;background:rgba(255,255,255,.8);border:1px solid var(--theme-foreground-fainter);border-radius:50%;width:18px;height:18px;padding:0;cursor:pointer;font-size:.8em;line-height:1;">×</button>`;
        del.addEventListener("click", (e) => {
          e.stopPropagation();
          if (onDelete) onDelete(r.id);
          else storeDelete(r.id);
          render();
        });
        return htl.html`<div style="position:relative;">${thumb}${del}</div>`;
      }),
    );
  }

  container.refresh = render;
  render();
  return container;
}
