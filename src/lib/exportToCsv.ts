/**
 * Convert an array of records into a CSV string and trigger a browser download.
 * Values containing commas, quotes, or newlines are safely escaped.
 */

function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  let str: string;
  if (typeof value === "object") {
    try {
      str = JSON.stringify(value);
    } catch {
      str = String(value);
    }
  } else {
    str = String(value);
  }
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportToCsv<T extends Record<string, unknown>>(
  rows: T[],
  filename: string,
  columns?: { key: keyof T; header?: string }[],
): void {
  if (rows.length === 0) {
    const blob = new Blob(["No data\n"], { type: "text/csv;charset=utf-8" });
    triggerDownload(blob, filename);
    return;
  }

  const cols =
    columns ??
    (Object.keys(rows[0]) as (keyof T)[]).map((k) => ({ key: k, header: String(k) }));

  const headerRow = cols.map((c) => escapeCell(c.header ?? String(c.key))).join(",");
  const dataRows = rows.map((row) =>
    cols.map((c) => escapeCell(row[c.key])).join(","),
  );

  const csv = [headerRow, ...dataRows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  triggerDownload(blob, filename);
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
