// drControls — reactive widget that renders a schema-driven parameter form.
//
//   const config = view(drControls({ algo: "UMAP" }));
//   config  // => { algo, params, showDynamic }
//
// Schemas live in dr-schemas.js. To support a new algorithm, add its schema —
// this file needs no changes.

import * as htl from "npm:htl";
import { DR_SCHEMAS, DR_ALGORITHMS, defaultParams } from "./dr-schemas.js";
import { reactiveWidget, dispatchInput } from "./reactive-widget.js";

function renderParam(param, value, onChange) {
  switch (param.type) {
    case "int":
    case "float": {
      const step = param.step ?? (param.type === "int" ? 1 : 0.01);
      const input = htl.html`<input
        type="range"
        min="${param.min}" max="${param.max}" step="${step}"
        value="${value}"
        style="flex:1;">`;
      const number = htl.html`<input
        type="number"
        min="${param.min}" max="${param.max}" step="${step}"
        value="${value}"
        style="width:5rem;">`;
      const sync = (v) => {
        const n = param.type === "int" ? Math.round(+v) : +v;
        input.value = n;
        number.value = n;
        onChange(n);
      };
      input.addEventListener("input", (e) => sync(e.target.value));
      number.addEventListener("input", (e) => sync(e.target.value));
      return htl.html`<label style="display:flex;gap:.5em;align-items:center;margin:.25em 0;">
        <span style="min-width:10em;" title="${param.description ?? ""}">${param.name}</span>
        ${input}
        ${number}
      </label>`;
    }
    case "select": {
      const select = htl.html`<select>
        ${param.options.map((o) => htl.html`<option value=${o} selected=${o === value}>${o}</option>`)}
      </select>`;
      select.addEventListener("input", (e) => onChange(e.target.value));
      return htl.html`<label style="display:flex;gap:.5em;align-items:center;margin:.25em 0;">
        <span style="min-width:10em;" title="${param.description ?? ""}">${param.name}</span>
        ${select}
      </label>`;
    }
    case "bool": {
      const input = htl.html`<input type="checkbox" checked=${Boolean(value)}>`;
      input.addEventListener("input", (e) => onChange(e.target.checked));
      return htl.html`<label style="display:flex;gap:.5em;align-items:center;margin:.25em 0;">
        <span style="min-width:10em;" title="${param.description ?? ""}">${param.name}</span>
        ${input}
      </label>`;
    }
    default:
      return htl.html`<div>Unknown param type: ${param.type}</div>`;
  }
}

export function drControls({ algo: initialAlgo = "UMAP", showAdvanced = false } = {}) {
  const container = htl.html`<div class="drexplorer-dr-controls"></div>`;
  let current = {
    algo: initialAlgo,
    params: defaultParams(initialAlgo),
    showDynamic: true,
  };

  const widget = reactiveWidget(container, { value: current });

  function update(patch) {
    current = { ...current, ...patch };
    widget.value = current;
    dispatchInput(widget);
  }

  function render() {
    const schema = DR_SCHEMAS[current.algo];
    const visibleParams = schema.params.filter((p) => showAdvanced || !p.advanced);

    const algoSelect = htl.html`<select style="font-weight:600;">
      ${DR_ALGORITHMS.map((a) => htl.html`<option value=${a} selected=${a === current.algo}>${DR_SCHEMAS[a].label}</option>`)}
    </select>`;
    algoSelect.addEventListener("input", (e) => {
      const algo = e.target.value;
      update({ algo, params: defaultParams(algo) });
      render();
    });

    const dynamicToggle = htl.html`<input type="checkbox" checked=${Boolean(current.showDynamic)}>`;
    dynamicToggle.addEventListener("input", (e) => update({ showDynamic: e.target.checked }));

    container.replaceChildren(
      htl.html`<div style="display:flex;gap:.5em;align-items:center;margin-bottom:.5em;">
        <label>Algorithm: ${algoSelect}</label>
        <label style="margin-left:auto;">${dynamicToggle} Show dynamic</label>
      </div>`,
      ...visibleParams.map((p) =>
        renderParam(p, current.params[p.name], (v) => update({ params: { ...current.params, [p.name]: v } }))
      ),
      schema.params.some((p) => p.advanced)
        ? htl.html`<details style="margin-top:.5em;"><summary>Advanced</summary>
            ${schema.params
              .filter((p) => p.advanced)
              .map((p) => renderParam(p, current.params[p.name], (v) => update({ params: { ...current.params, [p.name]: v } })))}
          </details>`
        : htl.html``
    );
  }

  render();
  return container;
}
