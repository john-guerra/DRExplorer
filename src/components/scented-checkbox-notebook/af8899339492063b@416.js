import define1 from "./79750b3b8e929d9d@239.js";
import define2 from "./600f1f80e771a771@509.js";
import define3 from "./9ac406907b45efa2@569.js";

function _1(md){return(
md`# Scented Checkbox

Given a dataset and a categorical attribute accessor, build a set of checkboxes that also display the counts for each attribute value. Inspired by [Willet, Heer and Agrawala's scented widgets paper](http://vis.stanford.edu/papers/scented-widgets). 
## Usage

\`\`\`js
import {scentedCheckbox} from "@john-guerra/scented-checkbox"
\`\`\``
)}

function _selectedIsland(scentedCheckbox,penguins){return(
scentedCheckbox(penguins, (d) => d.island)
)}

function _3(selectedIsland){return(
selectedIsland
)}

function _selectedSpecies(scentedCheckbox,penguins){return(
scentedCheckbox(penguins, (d) => d.species, {
  showTotal: false,
  label: "Species",
  value: ["Gentoo", "Chinstrap"],
  search: true // Use the search checkbox
})
)}

function _selectedSpeciesCustom(scentedCheckbox,penguins,multiAutoSelect){return(
scentedCheckbox(penguins, (d) => d.species, {
  showTotal: false,
  label: "Species",
  value: ["Gentoo", "Chinstrap"],
  checkbox: multiAutoSelect // Use a custom checkbox
})
)}

function _6(md){return(
md`### Use scentedCheckbox outside of Observable

See [a demo on codepen](https://codepen.io/duto_guerra/pen/gOZGNNg)

\`\`\`html
<h1>scentedCheckboxes demo</h1>
<div id="target"></div> 
<output id="results"></output>
<script type="module">
  const data = [ {type: "a"}, {type: "a"}, {type: "a"}, {type: "a"}, {type: "b"}, {type: "b"}, {type: "c"}];
  
  import { Runtime } from "https://cdn.jsdelivr.net/npm/@observablehq/runtime@5/dist/runtime.js";
  import define from "https://api.observablehq.com/@john-guerra/scented-checkbox.js?v=3";
  
  async function runIt() {
    const scentedCheckbox = await new Runtime().module(define).value("scentedCheckbox");

    const myCheckbox = scentedCheckbox(data, d => d.type);

    document.getElementById("target").appendChild(myCheckbox);
    
    const showSelected = () =>  document
      .getElementById("results")
      .innerHTML="Selected = " + myCheckbox.value.join(", ");
    
    myCheckbox.addEventListener("change", showSelected);
    
    showSelected();
  }
  
  runIt();
  
</script>
\`\`\``
)}

function _selectedI(scentedCheckbox,penguins){return(
scentedCheckbox(
  penguins.map((d, i) => ({ ...d, i })),
  (d) => d.species,
  { cutoff: 60, maxHeight: 200 }
)
)}

function _scentedCheckbox(d3,Inputs,htl,searchCheckbox,Event){return(
function scentedCheckbox(data, attr = (d) => d[0], _options) {
  let options = {
    barWidth: 50,
    barFill: "#cdcdcd",
    barBorder: "#bbb",
    barBorderWidth: "0.5px",
    showTotal: false, // Should use the max category as a reference (false) for the bars or the overall total (true)
    selectAll: true, // Have all attributes selected by default
    format: (d) => d,
    cutoff: 5, // Any groups with less than this number will be grouped into other
    othersLabel: "Others", // Label to show for others
    arrayAttrib: false, // attribute values are arrays,
    valueFont: `ultra-condensed 0.8em "Fira Sans", sans-serif`,
    valueFmt: d3.format(",d"),
    search: false,
    checkbox: Inputs.checkbox,
    maxHeight: null, // e.g. 200px
    ..._options
  };

  // Check if attr is array
  if (options.arrayAttrib || (data.length && Array.isArray(attr(data[0])))) {
    let unrolledData = [];

    data = data
      .map((d) => {
        const attrD = attr(d);
        // check if array is null or empty
        return attrD
          ? attrD.map((attrValue) => ({ ...d, __unrolledAttr: attrValue }))
          : [{ ...d, __unrolledAttr: attrD }];
      })
      .flat();
    attr = (d) => d.__unrolledAttr;
    options.arrayAttrib = true;
  }

  const dataGrouped = d3.group(data, attr);
  let dataGroupedSorted = Array.from(dataGrouped.entries()).sort((a, b) =>
    d3.descending(a[1].length, b[1].length)
  );

  console.log("dataGrouped", dataGrouped);

  // Array with all the keys that didn't make the cutoff
  let othersKeys = [];

  if (options.cutoff) {
    let dataGroupsSortedWithCutoff = [];
    // A group for everything below the cutoff
    let othersGroup = [options.othersLabel, []];
    for (let [k, v] of dataGroupedSorted) {
      if (v.length > options.cutoff) {
        dataGroupsSortedWithCutoff.push([k, v]);
      } else {
        othersGroup[1].push(v);
        othersKeys.push(k);
      }
    }
    // Did we find any items for the cutoff
    if (othersGroup[1].length > 0) {
      dataGroupsSortedWithCutoff.push(othersGroup);
      dataGroupedSorted = dataGroupsSortedWithCutoff;
      dataGrouped.set(options.othersLabel, othersGroup[1]);
    }
  }
  const keys = dataGroupedSorted.map((d) => d[0]);
  const values = dataGroupedSorted.map((d) => d[1]);
  const maxValue = d3.max(values, (v) => v.length);
  const totalValue = d3.sum(values, (v) => v.length);
  const fmtPct = d3.format(".1%");
  const fmt = d3.format(",");

  const x = d3
    .scaleLinear()
    .domain([0, options.showTotal ? totalValue : maxValue])
    .range([0, options.barWidth]);

  const oldFormat = options.format;
  options.format = (d) => {
    const dValue = dataGrouped.get(d).length;
    return htl.html`${oldFormat(d)} 
    <span 
      style='
        position: relative;
        top: 0px;
        left: 0px;
        display: inline-block;
      '    
      title='${d} ${dValue} records ${fmtPct(dValue / totalValue)}'
    >
      <span 
        style='
        min-width:${x.range()[1]}px; 
        border: solid ${options.barBorderWidth} ${options.barBorder};      
        display:flex;
        height: 100%;
      '>&nbsp;</span>
        
      <span 
      style='
        min-width:${x(dValue)}px; 
        background:${options.barFill};
        display:flex;
        position: absolute;
        top: ${options.barBorderWidth};
        left:  ${options.barBorderWidth};
        height: calc(100% - 3 * ${options.barBorderWidth});
        align-items: center;        
        font: ${options.valueFont};        
      '>${options.valueFmt(dValue)}</span>
      
    </span>
    `;
  };

  if (options.selectAll && !options.value) {
    options.value = keys;
  }
  let checkboxes;

  if (options.search) {
    checkboxes = searchCheckbox(keys, options);
  } else {
    checkboxes = options.checkbox(keys, options);
  }
  const target = htl.html`<div 
    style="${
      options.maxHeight ? `max-height:${options.maxHeight}; overflow: scroll;` : ""
    }">${checkboxes}</div>`;

  checkboxes.oninput = (evt) => {
    setValue();
  };

  function setValue() {
    let value = [];
    for (let v of checkboxes.value) {
      // If we have others in the keys, replace them with the original keys
      if (v === options.othersLabel) {
        value = value.concat(othersKeys);
      } else {
        value.push(v);
      }
    }
    target.value = value;

    target.dispatchEvent(new CustomEvent("input", { bubbles: true }));
  }

  setValue();

  target.addEventListener("input", () => {
    checkboxes.dispatchEvent(new Event("input", { bubbles: false }));
  });

  return target;
}
)}

function _10(md){return(
md`## Test cases`
)}

function _selected2(scentedCheckbox){return(
scentedCheckbox(
  [
    { a: [1, 2, 3] },
    { a: [2, 3] },
    { a: [2] },
    { a: [4] },
    { a: [5] },
    { a: [6] },
    { a: [7] },
    { a: [8] },
    { a: [9] },
    { a: [10] }
  ],
  (d) => d.a,
  {
    cutoff: 2
  }
)
)}

function _12(selected2){return(
selected2
)}

function _16($0,Event)
{
  ($0).value = ["Biscoe"];
  ($0).dispatchEvent(new Event("input", { bubbles: true }));
}


export default function define(runtime, observer) {
  const main = runtime.module();
  main.variable(observer()).define(["md"], _1);
  main.variable(observer("viewof selectedIsland")).define("viewof selectedIsland", ["scentedCheckbox","penguins"], _selectedIsland);
  main.variable(observer("selectedIsland")).define("selectedIsland", ["Generators", "viewof selectedIsland"], (G, _) => G.input(_));
  main.variable(observer()).define(["selectedIsland"], _3);
  main.variable(observer("viewof selectedSpecies")).define("viewof selectedSpecies", ["scentedCheckbox","penguins"], _selectedSpecies);
  main.variable(observer("selectedSpecies")).define("selectedSpecies", ["Generators", "viewof selectedSpecies"], (G, _) => G.input(_));
  main.variable(observer("viewof selectedSpeciesCustom")).define("viewof selectedSpeciesCustom", ["scentedCheckbox","penguins","multiAutoSelect"], _selectedSpeciesCustom);
  main.variable(observer("selectedSpeciesCustom")).define("selectedSpeciesCustom", ["Generators", "viewof selectedSpeciesCustom"], (G, _) => G.input(_));
  main.variable(observer()).define(["md"], _6);
  main.variable(observer("viewof selectedI")).define("viewof selectedI", ["scentedCheckbox","penguins"], _selectedI);
  main.variable(observer("selectedI")).define("selectedI", ["Generators", "viewof selectedI"], (G, _) => G.input(_));
  main.variable(observer("scentedCheckbox")).define("scentedCheckbox", ["d3","Inputs","htl","searchCheckbox","Event"], _scentedCheckbox);
  main.variable(observer()).define(["md"], _10);
  main.variable(observer("viewof selected2")).define("viewof selected2", ["scentedCheckbox"], _selected2);
  main.variable(observer("selected2")).define("selected2", ["Generators", "viewof selected2"], (G, _) => G.input(_));
  main.variable(observer()).define(["selected2"], _12);
  const child1 = runtime.module(define1);
  main.import("aq", child1);
  main.import("op", child1);
  const child2 = runtime.module(define2);
  main.import("searchCheckbox", child2);
  const child3 = runtime.module(define3);
  main.import("multiAutoSelect", child3);
  main.variable(observer()).define(["viewof selectedIsland","Event"], _16);
  return main;
}
