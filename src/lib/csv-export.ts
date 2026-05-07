// Small CSV export helper used by Legal Connect operational reporting.
// Keeps the API tiny: pass an array of rows + the column order to stamp.

export function toCsv<T>(rows: T[], columns: Array<keyof T | string>): string {
  const escape = (v: unknown): string => {
    if (v === null || v === undefined) return "";
    const s = typeof v === "object" ? JSON.stringify(v) : String(v);
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const header = columns.map((c) => escape(String(c))).join(",");
  const body = rows.map((r) => columns.map((c) => escape((r as any)[c as string])).join(","));
  return [header, ...body].join("\n");
}

export function downloadFile(filename: string, content: string, mime = "text/csv;charset=utf-8") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadCsv<T>(filename: string, rows: T[], columns: Array<keyof T | string>) {
  downloadFile(filename, toCsv(rows, columns), "text/csv;charset=utf-8");
}

export function downloadJson(filename: string, data: unknown) {
  downloadFile(filename, JSON.stringify(data, null, 2), "application/json");
}
