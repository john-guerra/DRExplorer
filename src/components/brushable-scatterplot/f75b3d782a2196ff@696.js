import define1 from "./12a304c114eacf25@248.js";

function _1(md){return(
md`# Vega Selected

Render a Vega-Lite specs while listening to it's signals to obtain the current selected items. Useful to using Vega-Lite charts as filtering widgets

Usage: 

~~~js
import {vegaSelected} from "@john-guerra/vega-selected"

viewof selected = vegaSelected( vegaLiteSpec )
~~~`
)}

function _2(md){return(
md`## Example`
)}

function _selected(vegaSelected,spec,invalidation){return(
vegaSelected(spec, {invalidation})
)}

function _4(selected,md){return(
md`## Your selection
Origin (mouseover): **${selected.mouseover ? selected.mouseover.Origin[0] : "All"}** <br/>
Cylinders (brush): **${selected.brush ? selected.brush.Cylinders.join(", "): "All"}**

and the full selected object`
)}

function _5(selected){return(
selected
)}

function _6(md){return(
md`## Here is the chart spec`
)}

function _spec(vl,data)
{
  const brush = vl.selectInterval("brush").encodings("y");
  const single = vl.selectSingle("mouseover").encodings("y").on("mouseover");

  const base = vl
    .markBar()
    .select(brush)
    .encode(
      vl.x().count(),
      vl.y().fieldO("Cylinders"),
      vl.color().if(brush, vl.value("steelblue")).value("gray")
    );

  return vl
    .concat(
      vl.layer(base),
      base
        .select(single)
        .encode(
          vl.y().fieldN("Origin"),
          vl.color().if(single, vl.value("steelblue")).value("gray")
        )
    )
    .data(data)
    .toSpec();
}


function _8(md){return(
md`# Listening to a specific signal

If you only care for a signal you can specify which one to listen to`
)}

function _selected2(vegaSelected,specScatterplot)
{
  return vegaSelected(specScatterplot, {
    signal: "brush"
  });
}


function _10(md){return(
md`## Experiment setting the brush value`
)}

function _specScatterplot2(vl,data)
{
  const brush = vl.selectInterval("brush").encodings(["x", "y"]);
  return vl
    .markPoint()
    .select(brush)
    .encode(
      vl.x().fieldQ("Horsepower"),
      vl.y().fieldQ("Miles_per_Gallon"),
      vl.color().if(brush, "steelblue").value("gray")
    )
    .data(data)
    .render();
}


function _12(specScatterplot2)
{
  specScatterplot2
    .signal("brush", {
      Horsepower: [49.576251296997064, 74.26375556945801],
      Miles_per_Gallon: [17.703124999999996, 29.869791666666668]
    })
    ;
  // specScatterplot2
  //   .signal("brush_x", [82.62708549499511, 123.77292594909669])
  //   .run();
  return specScatterplot2.runAsync();
}


function _13(getSignals,specScatterplot2){return(
getSignals(specScatterplot2)
)}

function _14(specScatterplot2){return(
JSON.stringify(specScatterplot2.signal("brush"))
)}

function _specScatterplot(vl,data)
{
  const brush = vl.selectInterval("brush").encodings(["x", "y"]);
  return vl.markPoint()
    .select(brush)
    .encode(
      vl.x().fieldQ("Horsepower"),
      vl.y().fieldQ("Miles_per_Gallon"),
      vl.color().if(brush, "steelblue").value("gray")
    )
    .data(data)
    .toSpec();
}


function _vegaSelected(require){return(
require("vega-selected@0.0.3")
)}

function _getSignals(vl){return(
(view) => {
  const state = view.getState({
    data: vl.vega.falsy,
    signals: vl.vega.truthy,
    recurse: true
  });
  // console.log("signals", state.signals);
  return Object.keys(state.signals)
    // .filter((d) => d !== "unit"); // Terrible hack due to my ignorance 🤷
}
)}

function _data(vegaDatasets){return(
vegaDatasets["cars.json"]().then(data => data.map(d => (d.date = new Date(d.date), d)))
)}

function _19(md){return(
md`---
## Appendix`
)}

function _vegaDatasets(require){return(
require("vega-datasets@3.1.0")
)}

function _vegaEmbed(require){return(
require("vega-embed@7.0.2")
)}

export default function define(runtime, observer) {
  const main = runtime.module();
  main.variable(observer()).define(["md"], _1);
  main.variable(observer()).define(["md"], _2);
  main.variable(observer("viewof selected")).define("viewof selected", ["vegaSelected","spec","invalidation"], _selected);
  main.variable(observer("selected")).define("selected", ["Generators", "viewof selected"], (G, _) => G.input(_));
  main.variable(observer()).define(["selected","md"], _4);
  main.variable(observer()).define(["selected"], _5);
  main.variable(observer()).define(["md"], _6);
  main.variable(observer("spec")).define("spec", ["vl","data"], _spec);
  main.variable(observer()).define(["md"], _8);
  main.variable(observer("viewof selected2")).define("viewof selected2", ["vegaSelected","specScatterplot"], _selected2);
  main.variable(observer("selected2")).define("selected2", ["Generators", "viewof selected2"], (G, _) => G.input(_));
  main.variable(observer()).define(["md"], _10);
  main.variable(observer("viewof specScatterplot2")).define("viewof specScatterplot2", ["vl","data"], _specScatterplot2);
  main.variable(observer("specScatterplot2")).define("specScatterplot2", ["Generators", "viewof specScatterplot2"], (G, _) => G.input(_));
  main.variable(observer()).define(["specScatterplot2"], _12);
  main.variable(observer()).define(["getSignals","specScatterplot2"], _13);
  main.variable(observer()).define(["specScatterplot2"], _14);
  main.variable(observer("specScatterplot")).define("specScatterplot", ["vl","data"], _specScatterplot);
  main.variable(observer("vegaSelected")).define("vegaSelected", ["require"], _vegaSelected);
  main.variable(observer("getSignals")).define("getSignals", ["vl"], _getSignals);
  main.variable(observer("data")).define("data", ["vegaDatasets"], _data);
  main.variable(observer()).define(["md"], _19);
  main.variable(observer("vegaDatasets")).define("vegaDatasets", ["require"], _vegaDatasets);
  const child1 = runtime.module(define1);
  main.import("vl", child1);
  main.variable(observer("vegaEmbed")).define("vegaEmbed", ["require"], _vegaEmbed);
  return main;
}
