// dataInput — reactive widget for loading a dataset.
//
// Matches the API of @john-guerra/data-input (see docs/research/guerra-widgets.md):
//
//   const data = view(dataInput({ value, initialValue, accept, delimiter, format, label }));
//
// format ∈ { "auto", "JSON", "MongoExport", "CSV", "CSVNoAutoType" }
//
// TODO(phase1): swap in the full @john-guerra/data-input by loading
// docs/data-input.tgz through an Observable runtime wrapper.

import * as htl from "npm:htl";
import * as d3 from "npm:d3";
import { reactiveWidget } from "./reactive-widget.js";

function parseJSON(text) {
  const parsed = JSON.parse(text);
  if (!Array.isArray(parsed)) throw new Error("JSON is not an array");
  return parsed;
}

function parseMongoExport(text) {
  const rows = [];
  for (const line of text.split("\n")) {
    if (line === "") continue;
    rows.push(JSON.parse(line));
  }
  if (rows.length === 0) throw new Error("MongoExport parse produced no rows");
  return rows;
}

function parseCSVAutoType(text, delimiter = ",") {
  const parse = delimiter === "\t" ? d3.tsvParse : d3.dsvFormat(delimiter).parse;
  return parse(text, d3.autoType);
}

function parseCSV(text, delimiter = ",") {
  const parse = delimiter === "\t" ? d3.tsvParse : d3.dsvFormat(delimiter).parse;
  return parse(text);
}

function detect(text, delimiter = ",") {
  const attempts = [
    () => parseJSON(text),
    () => parseMongoExport(text),
    () => parseCSVAutoType(text, delimiter),
    () => parseCSV(text, delimiter),
  ];
  for (const fn of attempts) {
    try {
      const result = fn();
      if (Array.isArray(result) && result.length > 0) return result;
    } catch {
      // try next
    }
  }
  throw new Error("Could not auto-detect format");
}

export function dataInput({
  value = [],
  initialValue,
  accept = "",
  delimiter = ",",
  format = "auto",
  label,
} = {}) {
  if (initialValue !== undefined && value.length === 0) value = initialValue;

  const fileInput = htl.html`<input type="file" accept="${accept}">`;
  let holder;
  if (label) {
    fileInput.style.display = "none";
    const labelButton = htl.html`<button type="button">${label}</button>`;
    labelButton.addEventListener("click", (evt) => {
      evt.preventDefault();
      fileInput.click();
    });
    holder = htl.html`<label>${labelButton} ${fileInput}</label>`;
  } else {
    holder = htl.html`${fileInput}`;
  }

  const form = htl.html`<form>${holder}</form>`;
  const widget = reactiveWidget(form, { value });

  fileInput.addEventListener("change", async (evt) => {
    evt.preventDefault();
    const file = fileInput.files?.[0];
    if (!file) return;
    const text = await file.text();
    let parsed;
    try {
      switch (format.toUpperCase()) {
        case "AUTO":
          parsed = detect(text, delimiter);
          break;
        case "JSON":
          parsed = parseJSON(text);
          break;
        case "MONGOEXPORT":
          parsed = parseMongoExport(text);
          break;
        case "CSV":
          parsed = parseCSVAutoType(text, delimiter);
          break;
        case "CSVNOAUTOTYPE":
        case "CSVNOAUTO":
          parsed = parseCSV(text, delimiter);
          break;
        default:
          parsed = detect(text, delimiter);
      }
    } catch (err) {
      console.warn("[data-input] parse failed:", err);
      return;
    }
    widget.setValue(parsed);
  });

  return form;
}
