const xlsx = require('xlsx');
const path = require('path');
const file = path.join('C:/Users/ansantos/OneDrive - CMPC/Área de Trabalho/APK', 'EC_DADOS_030826.xlsx');
try {
  const workbook = xlsx.readFile(file);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const json = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  console.log("SHEET NAME:", sheetName);
  console.log("HEADERS:", json[0]);
  console.log("ROW 1:", json[1]);
} catch (e) {
  console.error(e);
}
