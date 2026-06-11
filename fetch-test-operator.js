fetch("https://docs.google.com/spreadsheets/d/1G7x3dtE2KFF338w6qdd4jrMkz-yrbThlzx5Vi0I8AqQ/gviz/tq?tqx=out:csv&sheet=Operator+bs")
  .then(r => r.text())
  .then(t => console.log(t.split("\n").slice(0, 15).join("\n")))
  .catch(e => console.error(e));
