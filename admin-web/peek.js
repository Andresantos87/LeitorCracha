const fs = require('fs');
const csv = require('csv-parser');

const results = [];
fs.createReadStream('C:\\\\Users\\\\ansantos\\\\OneDrive - CMPC\\\\Área de Trabalho\\\\APK\\\\mifibra_transcript_000000000000.csv')
  .pipe(csv())
  .on('data', (data) => {
    results.push(data);
    if (results.length === 1) {
      console.log(JSON.stringify(results[0], null, 2));
      process.exit(0);
    }
  });
