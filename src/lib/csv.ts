// ---------------------------------------------------------------------------
// CSV Utilities — zero dependencies
// ---------------------------------------------------------------------------

/**
 * Escape a single cell value for CSV.
 * Wraps in double-quotes if the value contains commas, quotes, or newlines.
 */
function escapeCell(value: unknown): string {
  const str = value == null ? "" : String(value);
  if (str.includes('"') || str.includes(",") || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/** Convert an array of objects to a CSV string. */
export function toCSV<T extends Record<string, unknown>>(
  data: T[],
  columns?: { key: keyof T; label: string }[],
): string {
  if (data.length === 0) return "";

  const cols =
    columns ??
    Object.keys(data[0]).map((k) => ({ key: k as keyof T, label: k as string }));

  const header = cols.map((c) => escapeCell(c.label)).join(",");
  const rows = data.map((row) =>
    cols.map((c) => escapeCell(row[c.key])).join(","),
  );

  return [header, ...rows].join("\n");
}

/** Parse a CSV string into an array of objects. First row = headers. */
export function fromCSV(csv: string): Record<string, string>[] {
  if (!csv.trim()) return [];

  const rows = parseRows(csv);
  if (rows.length < 2) return [];

  const headers = rows[0];
  return rows.slice(1).map((row) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = row[i] ?? "";
    });
    return obj;
  });
}

/**
 * Low-level row parser. Handles quoted fields (with escaped quotes),
 * commas inside quotes, and newlines inside quoted values.
 */
function parseRows(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  let i = 0;

  while (i < csv.length) {
    const ch = csv[i];

    if (inQuotes) {
      if (ch === '"') {
        // escaped quote ("") or end of quoted field
        if (i + 1 < csv.length && csv[i + 1] === '"') {
          cell += '"';
          i += 2;
        } else {
          inQuotes = false;
          i++;
        }
      } else {
        cell += ch;
        i++;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
        i++;
      } else if (ch === ",") {
        row.push(cell);
        cell = "";
        i++;
      } else if (ch === "\r") {
        // handle \r\n and lone \r
        row.push(cell);
        cell = "";
        rows.push(row);
        row = [];
        i += csv[i + 1] === "\n" ? 2 : 1;
      } else if (ch === "\n") {
        row.push(cell);
        cell = "";
        rows.push(row);
        row = [];
        i++;
      } else {
        cell += ch;
        i++;
      }
    }
  }

  // flush last cell / row
  if (cell || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}

/** Trigger a browser download of a CSV string as a file. */
export function downloadCSV(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
