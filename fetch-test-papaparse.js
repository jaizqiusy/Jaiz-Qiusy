import Papa from 'papaparse';

fetch("https://docs.google.com/spreadsheets/d/1G7x3dtE2KFF338w6qdd4jrMkz-yrbThlzx5Vi0I8AqQ/gviz/tq?tqx=out:csv&sheet=Operator+bs")
  .then(r => r.text())
  .then(csvText => {
    Papa.parse(csvText, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
          console.log(results.data.map(r => r.url_foto));
        }
    });
  });
