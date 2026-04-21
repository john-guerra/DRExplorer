// Reactive-widgets helpers.
// Contract: HTMLElement with `.value` + bubbling `input` event on user-driven change.
// See docs/research/reactive-widgets.md.

const INPUT_EVENT = () => new Event("input", { bubbles: true });

export function dispatchInput(el) {
  el.dispatchEvent(INPUT_EVENT());
}

export function setValue(el, value) {
  el.value = value;
  dispatchInput(el);
}

// Wrap a container DOM node as a reactive widget.
// Returns the container with `.value` defined, plus a `.setValue(v)` method that
// assigns and fires the input event. `.value = v` assigns silently (for state hydration).
export function reactiveWidget(container, { value } = {}) {
  let current = value;
  Object.defineProperty(container, "value", {
    get: () => current,
    set: (v) => { current = v; },
    configurable: true,
  });
  container.setValue = (v) => {
    current = v;
    dispatchInput(container);
  };
  return container;
}
