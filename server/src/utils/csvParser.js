const fs = require('fs');

function parseCSV(text) {
  const result = [];
  let row = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        row.push(cell.trim());
        cell = '';
      } else if (char === '\n' || char === '\r') {
        if (char === '\r' && nextChar === '\n') {
          i++;
        }
        row.push(cell.trim());
        if (row.length > 0 && row.some((c) => c !== '')) {
          result.push(row);
        }
        row = [];
        cell = '';
      } else {
        cell += char;
      }
    }
  }

  if (cell || row.length > 0) {
    row.push(cell.trim());
    result.push(row);
  }
  return result;
}

const parseCsvFile = (filePath) => {
  const content = fs.readFileSync(filePath, 'utf-8');
  const { data } = parseCSVString(content);
  return data;
};

const parseCSVString = (content) => {
  const rows = parseCSV(content);
  if (rows.length === 0) return { headers: [], data: [] };

  // Clean headers (remove UTF-8 BOM if present, trim whitespaces)
  const headers = rows[0].map((h) => h.replace(/^\uFEFF/, '').trim());

  const data = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length === 0 || (row.length === 1 && row[0] === '')) continue;
    const obj = {};
    headers.forEach((header, idx) => {
      obj[header] = row[idx] ?? '';
    });
    data.push(obj);
  }
  return { headers, data };
};

module.exports = { parseCsvFile, parseCSVString, parseCSV };
