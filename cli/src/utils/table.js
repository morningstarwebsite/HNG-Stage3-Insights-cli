import Table from "cli-table3";

export function renderTable(rows) {
  if (!rows || rows.length === 0) {
    return "No records found.";
  }

  const headers = Object.keys(rows[0]);
  const table = new Table({ head: headers });

  for (const row of rows) {
    table.push(headers.map((key) => normalizeCell(row[key])));
  }

  return table.toString();
}

function normalizeCell(value) {
  if (value === null || value === undefined) {
    return "-";
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}
