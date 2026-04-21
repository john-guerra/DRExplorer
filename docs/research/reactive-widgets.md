# Reactive widgets

Pattern by John Alexis Guerra Gómez. Paper: "Towards Reusable and Reactive Widgets for Information Visualization Research and Dissemination". Site: https://reactivewidgets.org

This is **not** a framework — it is a convention. No runtime, no build step, no adapter. A reactive widget is a DOM element that behaves like a native `<input>`.

## The contract

A widget is an `HTMLElement` that:

1. Exposes a `.value` property (any JS value — primitive, object, Set, Array).
2. Dispatches `new Event("input", { bubbles: true })` whenever `.value` changes in response to user interaction.

That is the entire API. Because it matches the native `<input>` contract, any consumer that understands native inputs works without adapters:

- **Observable / Observable Framework**: `const x = view(MyWidget(...))`
- **React**: `<div ref={r => r?.replaceChildren(MyWidget(...))} onInput={e => setX(e.target.value)} />`
- **Svelte**: `<div use:mount bind:value />`
- **Vanilla**: `el.addEventListener("input", e => ...)`

## Minimal example

```js
import * as htl from "htl";

export function BarChart(data) {
  const el = htl.html`<svg width="400" height="200">...</svg>`;
  el.value = [];
  el.addEventListener("click", (e) => {
    el.value = pick(data, e);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
  return el;
}
```

Consumers:

```js
// Observable Framework
const selection = view(BarChart(data));

// Vanilla
const w = BarChart(data);
document.body.appendChild(w);
w.addEventListener("input", (e) => console.log(e.target.value));

// React
<div ref={r => r?.replaceChildren(BarChart(data))}
     onInput={e => setSelection(e.target.value)} />
```

## Reactive-widget-helper

There is a small helper (imported as `require("reactive-widget-helper")` in John's notebooks) that wraps any DOM node into a widget. You hand it a `container` and an `{value}` initial, and it gives back the same container with `.value` plumbed and a `setValue(v)` method that silently writes *and* fires the `input` event:

```js
const widget = ReactiveWidget(container, { value: initial });
widget.setValue(nextValue);              // fires input event
widget.value = nextValue;                // would not fire — use setValue
```

## Rules that avoid gotchas

- **User-initiated changes → fire `input`.** Programmatic restore (e.g., "restore a saved run") should set `.value` silently: consumers downstream don't want to react as if the user picked it.
- **Bubble, always.** `{bubbles: true}` is not optional. Observable's `view()`, delegated listeners, and native form composition all rely on bubbling.
- **`.value` is whatever makes sense.** For a brush, an array of selected ids. For a slider, a number. For a scatter, an object like `{brushed, clicked}`. Document the shape.
- **One source of truth.** If the widget reconstructs internal state when `.value` is assigned externally, honor it. Otherwise document that `.value` is read-only from outside.

## Why DRExplorer uses this pattern

Every custom control in DRExplorer — file picker, algorithm selector, parameter panel, scatter brush, run-list selector, compare-mode toggle — is a reactive widget. This means:

- Each control works standalone in an HTML smoke test.
- Each control drops into Observable Framework via `view()` with zero glue.
- Each control can be lifted out later into a React port or a standalone page with no code changes.
- Controls compose: a param panel is a reactive widget made out of other reactive widgets.

## See also

- https://reactivewidgets.org
- https://observablehq.com/@john-guerra/reactive-widgets
- `guerra-widgets.md` — the three widgets DRExplorer reuses (`data-input`, `brushable-scatterplot`, `navio`) all implement this contract.
