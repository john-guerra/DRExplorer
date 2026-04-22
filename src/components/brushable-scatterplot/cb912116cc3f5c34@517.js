import define1 from "./f75b3d782a2196ff@696.js";
import define2 from "./12a304c114eacf25@248.js";

function _1(md){return(
md`# Brushable ScatterPlot (Reactive Widget)

A reactive widget for an interactive scatterplot for dimensionality reduction using vega
lite. Features: 

* Brushing. 
* Nearest hover
* Nearest click
* Auto zoom to fit the x,y domain
* Color by selected.
* Quant vs Categorical color scales
* Mobile interaction

Returns a reactive widget that easily lets you get the selected document. Triggers the input event on interactions.

## Usage

\`\`\`js
import { BrushableScatterPlot } from "@john-guerra/brushable-scatterplot";

viewof selected = BrushableScatterPlot(dataToPlot, {
  color: "score",
  x: "x",
  y: "y",
  size: "score",
  id: "id",  
})

selected.clicked;
selected.brushed;
\`\`\`

where dataToPlot is a tidy array of objects containing an id, and x,y positions



Thanks Moritz Kohlenz and Edison Chen for help with Mobile support
`
)}

function _interactive(Inputs){return(
Inputs.toggle({
  // label: htl.html`<strong>Make chart interactive</strong>.<br> <small>Disable to speed up animation</small>`,
  label: "Interactive chart",
  value: true,
  width: 600
})
)}

function _colorScheme(Inputs){return(
Inputs.select(
  [
    "brownbluegreen",
    "blueorange",
    "blues",    
    "purples",
    "redyellowblue", 
    "spectral",
    "turbo",
    "cividis",
    "rainbow",
    "category20",
    "category10",
    "tableau20",
    
  ],
  { label: "Color scheme" }
)
)}

function _colorBy(Inputs){return(
Inputs.select(
  // attrs,
  [
    "id",
    "typeId",
    // "title",
    // "addons",
    // "recognitionIds",
    // "isBreak",
    // "importedId",
    // "source",
    // "trackId",
    // "tags",
    // "keywords",
    // "sessionIds",
    // "eventIds",
    // "abstract",
    // "authors",
    // "sessions",
    "firstSessionName",
    "firstSessionNameWord",
    "track",
    // "authorNames",
    // "url",
    "score"
  ],
  { label: "Color by", value: "score" }
)
)}

function _drSelection(BrushableScatterPlot,dataToPlot,colorBy,interactive){return(
BrushableScatterPlot(dataToPlot, {
  color: colorBy,
  size: colorBy,
  interactive,
  colorOnHover: true,
  tooltip: [
    "title",
    "award",
    "score",
    "track",
    "firstSessionName",
    "authorNames",
    "abstract"
  ]
})
)}

function _6(dataToPlot){return(
dataToPlot
)}

function _papersHighlighted(drSelection){return(
drSelection.brushed
)}

function _paperClicked(drSelection){return(
drSelection.clicked
)}

function _9(){return(
Array.from({ length: 100 }).map(() => ({
    x: Math.random(),
    y: Math.random()
  }))
)}

function _10(BrushableScatterPlot,vl){return(
BrushableScatterPlot(
  Array.from({ length: 100 }).map(() => ({
    x: Math.random(),
    y: Math.random(),
    type: ["a", "b", "c"][Math.floor(Math.random() * 3)]
  })),
  {
    shape: "type",
    shapeDomain: ["c", "b", "a"],
    size: 100,
    vegaSpecWrapper: (spec) => {
      const hello = vl
        .markText()
        .encode(
          vl.text().fieldN("text"),
          vl.x().fieldQ("x"),
          vl.y().fieldQ("y")
        )
        .data([{ text: "Hello", type: "text", x: 0, y: 0 }]);
      return vl.layer(spec, hello);
    }
  }
)
)}

function _maxPapers(Inputs,dataToPlot){return(
Inputs.range([0, dataToPlot.length], {
  label: "Papers to show",
  step: 1,
  value: 20
})
)}

function _selectedPapers(htl,paperClicked,renderItem,papersHighlighted,maxPapers){return(
htl.html`   
  <h2>CHI 2024 artifacts selected</h2>
  ${
    paperClicked.length
      ? htl.html`<strong>Clicked:</strong>${paperClicked.map(renderItem)}`
      : ""
  }
  <div style="display: flex; flex-wrap: wrap; max-height: 600px; overflow: scroll">
    
      ${papersHighlighted
        .sort((a, b) => b.score - a.score)
        .slice(0, maxPapers)
        .map(renderItem)}
`
)}

function _BrushableScatterPlot(getVegaView,vegaSelected,html){return(
async function BrushableScatterPlot(dataToPlot, options) {
  options = {
    interactive: true,
    colorScheme: undefined,
    colorSchemeNominal: "tableau20",
    colorSchemeQuantitative: "brownbluegreen",
    colorType: undefined,
    x: "x",
    y: "y",
    color: null, // null for no color, you can also pass an attribute name
    size: null, // null for no size, you can also pass an attribute name
    shape: null, // null for no shape, you can also pass an attribute name
    id: null, // null will use the index, you can also pass an attribute name for id
    tooltip: undefined,
    colorDomain: null, // e.g. [-0.2, 7]
    title: `${dataToPlot.length} documents by similarity`,
    //adjusts size of graph based on the size of the screen
    width: 600,
    height: 500,
    sizeRange: undefined, // e.g. [0, 100]
    vegaSpecWrapper: (d) => d, // Use it to enhance the vega spec, e.g. to add layers to it
    colorOnHover: true,
    shapeDomain: undefined, // provide a custom array of values from the domain if you want
    ...options
  };

  if (!options.id) {
    if (dataToPlot?.length && "id" in dataToPlot[0]) {
      options.id = "id";
    } else {
      // If no id, use the index as id
      dataToPlot.map((d, i) => (d.id = i));
      options.id = "id";
    }
  }

  // options.tooltip = options.tooltip || [
  //   options.id,
  //   options.x,
  //   options.y,
  //   options.color,
  //   options.size
  // ].filter(d => !!isNaN(d));

  if (!options.tooltip) {
    options.tooltip = [options.id, options.x, options.y];
    if (options.color) options.tooltip.push(options.color);
    if (options.size && typeof options.size === "string")
      options.tooltip.push(options.size);
  }

  const vegaView = options.vegaSpecWrapper(getVegaView(dataToPlot, options));
  let brushed = dataToPlot;
  let clicked = [];
  //stores data for double click
  let previousClickedIds = [];

  // *** Get Vega ***
  const vegaReactiveChart = await (options.interactive
    ? vegaSelected(vegaView.toSpec(), { renderer: "canvas" })
    : vegaView.render());

  const target = html`${vegaReactiveChart}`;

  // console.log("🗺️ new Brushablescatterplot", options.interactive, vegaReactiveChart, options);

  function setValue(brushed, clicked) {
    target.value = { brushed, clicked };
    // No need to disptach the input event as the one from the inner widget will bubble out
    // target.dispatchEvent(new CustomEvent("input", { bubbles: true }));
  }
  // Added a single event listener to handle interactions, simplifying the logic by adding both drag and click handling here
  vegaReactiveChart.addEventListener("input", (evt) => {
    // console.log("🔢 Brushable scatterplot input", evt);
    evt.stopPropagation();

    //Drag interaction: Filters the data points within the drag selection region
    if (vegaReactiveChart.value.drag) {
      brushed = vegaReactiveChart.value.drag
        ? dataToPlot.filter(
            (d) =>
              d.x >= vegaReactiveChart.value.drag.x[0] &&
              d.x <= vegaReactiveChart.value.drag.x[1] &&
              d.y >= vegaReactiveChart.value.drag.y[0] &&
              d.y <= vegaReactiveChart.value.drag.y[1]
          )
        : dataToPlot;
    }
    // Double-click interaction: Handles clicks on the chart to open a URL if the item was already clicked
    if (vegaReactiveChart.value.click) {
      const newlyClicked = dataToPlot.filter((d) =>
        vegaReactiveChart.value.click?.id.includes(d.id)
      );

      const newlyClickedIds = newlyClicked.map((d) => d.id);
      // Checks if the clicked item was already selected (double-click logic)
      const wasAlreadySelected = newlyClickedIds.some((id) =>
        previousClickedIds.includes(id)
      );

      if (wasAlreadySelected) {
        const paper = dataToPlot.find((d) => d.id === newlyClickedIds[0]);
        // Opens the URL of the double-clicked item in a new tab or window
        if (paper?.url) window.open(paper.url, "_blank");
      }
      // Updates clicked and brushed states to reflect the new selection
      clicked = newlyClicked;
      previousClickedIds = newlyClickedIds;
      brushed = dataToPlot; // Clears brush on a click interaction
    }

    setValue(brushed, clicked);
  });

  setValue(brushed, clicked);
  return target;
}
)}

function _getVegaView(vl){return(
function getVegaView(dataToPlot, options) {
  // Adapted from the user's chi2026 paper explorer getVegaView. Key
  // difference from the upstream notebook: we do NOT override
  // `selectInterval.on()` / `.translate()`. Those overrides were the
  // bug — they replaced Vega-Lite's default "mousedown→drag→mouseup
  // creates a live rectangle" behaviour with translate-only, so the
  // brush either grabbed nothing or everything depending on timing.
  // With the overrides removed, drag creates the expected rectangle
  // and the grey-when-not-selected condition on color gives visual
  // feedback.
  let {
    interactive,
    colorScheme,
    color,
    shape,
    x,
    y,
    size,
    id,
    tooltip,
    colorDomain,
    title,
    shapeDomain,
  } = options;

  // Colour scale — nominal vs. quantitative based on row 0's value for
  // the chosen field.
  if (dataToPlot.length && color && isNaN(dataToPlot[0][color])) {
    options.colorType = options.colorType || "nominal";
  } else {
    options.colorType = options.colorType || "quantitative";
  }
  colorScheme =
    colorScheme ||
    (options.colorType === "quantitative"
      ? options.colorSchemeQuantitative
      : options.colorSchemeNominal);

  let colorField = color
    ? vl
        .color()
        .field(color)
        .type(options.colorType)
        .scale({ scheme: colorScheme, domain: colorDomain })
    : null;

  let chart = vl
    .markPoint({ opacity: 0.6, filled: true, size: 100 })
    .encode(vl.x().fieldQ(x).axis(null), vl.y().fieldQ(y).axis(null))
    .width(options.width)
    .height(options.height)
    .data(dataToPlot);

  if (colorField) chart = chart.encode(colorField);

  if (size) {
    if (typeof size === "number") {
      chart = chart.encode(vl.size().value(size));
    } else {
      chart = chart.encode(
        vl.size().fieldQ(size).scale({ range: options.sizeRange }),
        vl.order().fieldQ(size),
      );
    }
  }

  if (shape) {
    let shapeEncoding = vl.shape().fieldN(shape);
    if (shapeDomain) shapeEncoding = shapeEncoding.scale({ domain: shapeDomain });
    chart = chart.encode(shapeEncoding);
  }

  if (!interactive) {
    return chart.title(title);
  }

  // Selection parameters. vl.selectInterval() without .on()/.translate()
  // overrides falls back to Vega-Lite's default stream, which is the
  // standard "mousedown drag mouseup creates a rectangle" affordance.
  const hover = vl
    .selectPoint("hover")
    .nearest(true)
    .on("mouseover,pointerover,touchmove")
    .clear("mouseout")
    .init({ x: [], y: [] });
  const drag = vl.selectInterval("drag");
  const click = vl
    .selectPoint("click")
    .fields([id])
    .nearest(true)
    .on("click,touchend")
    .init({ id: [] });
  const shiftClick = vl
    .selectPoint("shiftClick")
    .fields([id])
    .on("click[event.altKey]")
    .toggle("false")
    .init({ id: [] });

  if (tooltip) chart = chart.encode(vl.tooltip(tooltip));

  chart = chart
    .params(click, shiftClick, hover, drag)
    .encode(
      vl
        .stroke()
        .condition({ param: "click", value: "black", empty: false })
        .value(null),
    );

  if (colorField) {
    // When a selection is active, paint selected points with the real
    // colour scale and unselected points grey. `colorOnHover` widens
    // the selection to also include the nearest-hover point.
    const colorCondition = options.colorOnHover ? vl.or(hover, drag) : drag;
    chart = chart.encode(
      vl.color().if(colorCondition, colorField).value("grey"),
    );
  }

  return chart.title(title);
}
)}

function _renderItem(htl){return(
function renderItem(p) {
  return htl.html`
      <div style="width: 150px; flex: 1; padding-right: 10px; padding-bottom: 15px">
        <strong><a href=${p.url}>${p.title}</a></strong>  
        <div>Similarity score: ${(p.score * 100).toFixed(2)}% ${
    p.awards ? p.awards : ""
  }</div>
        <div style="font-style: italic; max-height: 4em; overflow: auto;">${p.authorsExpanded
          .map((a) => `${a.firstName} ${a.lastName}`)
          .join(", ")}</div>
        <div>${p.track} - ${p.firstSessionName}</div> 
        <div style="margin-top: 0.5em; max-height: 70px; overflow: auto">${
          p.abstract
        }</div>
      </div>
`;
}
)}

function _dataToPlot(FileAttachment){return(
FileAttachment("dataToPlot.json").json()
)}

export default function define(runtime, observer) {
  const main = runtime.module();
  function toString() { return this.url; }
  const fileAttachments = new Map([
    ["dataToPlot.json", {url: new URL("./files/5ef5c2660ea942b5c6ec07266ce30d4f45b1ed5b36e40878fd53df0efa42c852e49293dab19dac384a58ec0864ec103cd464d5ff08506149b7ee95ebfc42a3c9.json", import.meta.url), mimeType: "application/json", toString}]
  ]);
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));
  main.variable(observer()).define(["md"], _1);
  main.variable(observer("viewof interactive")).define("viewof interactive", ["Inputs"], _interactive);
  main.variable(observer("interactive")).define("interactive", ["Generators", "viewof interactive"], (G, _) => G.input(_));
  main.variable(observer("viewof colorScheme")).define("viewof colorScheme", ["Inputs"], _colorScheme);
  main.variable(observer("colorScheme")).define("colorScheme", ["Generators", "viewof colorScheme"], (G, _) => G.input(_));
  main.variable(observer("viewof colorBy")).define("viewof colorBy", ["Inputs"], _colorBy);
  main.variable(observer("colorBy")).define("colorBy", ["Generators", "viewof colorBy"], (G, _) => G.input(_));
  main.variable(observer("viewof drSelection")).define("viewof drSelection", ["BrushableScatterPlot","dataToPlot","colorBy","interactive"], _drSelection);
  main.variable(observer("drSelection")).define("drSelection", ["Generators", "viewof drSelection"], (G, _) => G.input(_));
  main.variable(observer()).define(["dataToPlot"], _6);
  main.variable(observer("papersHighlighted")).define("papersHighlighted", ["drSelection"], _papersHighlighted);
  main.variable(observer("paperClicked")).define("paperClicked", ["drSelection"], _paperClicked);
  main.variable(observer()).define(_9);
  main.variable(observer()).define(["BrushableScatterPlot","vl"], _10);
  main.variable(observer("viewof maxPapers")).define("viewof maxPapers", ["Inputs","dataToPlot"], _maxPapers);
  main.variable(observer("maxPapers")).define("maxPapers", ["Generators", "viewof maxPapers"], (G, _) => G.input(_));
  main.variable(observer("selectedPapers")).define("selectedPapers", ["htl","paperClicked","renderItem","papersHighlighted","maxPapers"], _selectedPapers);
  main.variable(observer("BrushableScatterPlot")).define("BrushableScatterPlot", ["getVegaView","vegaSelected","html"], _BrushableScatterPlot);
  main.variable(observer("getVegaView")).define("getVegaView", ["vl"], _getVegaView);
  main.variable(observer("renderItem")).define("renderItem", ["htl"], _renderItem);
  main.variable(observer("dataToPlot")).define("dataToPlot", ["FileAttachment"], _dataToPlot);
  const child1 = runtime.module(define1);
  main.import("vegaSelected", child1);
  const child2 = runtime.module(define2);
  main.import("vl", child2);
  return main;
}
