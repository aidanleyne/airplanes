const xlsx = require('xlsx');
const fs = require('fs');

const filePath = 'data/data.xlsx';
const wb = xlsx.readFile(filePath);

const data = {};

wb.SheetNames.forEach(sheetName => {
    const sheet = wb.Sheets[sheetName];
    const jData = xlsx.utils.sheet_to_json(sheet, {defval: null});
    data[sheetName] = jData;
});

const jString = JSON.stringify(data, null, 4);

fs.writeFileSync('data/output.json', jString);