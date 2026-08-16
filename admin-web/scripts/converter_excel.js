const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');
const file = path.join('C:/Users/ansantos/OneDrive - CMPC/Área de Trabalho/APK', 'EC_DADOS_030826.xlsx');
const outFile = path.join('C:/Users/ansantos/OneDrive - CMPC/Área de Trabalho/APK', 'ec_dados.csv');
try {
  const workbook = xlsx.readFile(file);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const csvStr = xlsx.utils.sheet_to_csv(sheet);
  fs.writeFileSync(outFile, csvStr);
  console.log("Converted to ec_dados.csv");
} catch (e) {
  console.error(e);
}
