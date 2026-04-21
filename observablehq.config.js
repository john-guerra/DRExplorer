export default {
  title: "DRExplorer",
  theme: ["air", "dashboard"],
  root: "src",
  output: "dist",
  pages: [
    { name: "Explore", path: "/index" },
    { name: "Compare", path: "/compare" },
  ],
  head: `<link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>📉</text></svg>">`,
  footer: `Built with <a href="https://observablehq.com/framework/">Observable Framework</a> · <a href="https://github.com/">source</a>`,
};
