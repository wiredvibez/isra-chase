import * as XLSX from "xlsx";

export type Cell = string | number | boolean | null;

export interface Sheet {
  name: string;
  columns: string[];
  rows: Cell[][];
}

export type ExportFormat = "csv" | "json" | "xlsx";

function csvCell(value: Cell): string {
  if (value === null) return "";
  const text = String(value);
  // Prefix formula-looking cells so a spreadsheet never executes user text.
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function toCsv(sheet: Sheet): string {
  const lines = [sheet.columns.map(csvCell).join(",")];
  for (const row of sheet.rows) lines.push(row.map(csvCell).join(","));
  // BOM so Excel opens UTF-8 names correctly.
  return `﻿${lines.join("\r\n")}\r\n`;
}

export function toJson(sheet: Sheet): string {
  const objects = sheet.rows.map((row) =>
    Object.fromEntries(sheet.columns.map((column, i) => [column, row[i] ?? null])),
  );
  return JSON.stringify(objects, null, 2);
}

export function toXlsx(sheet: Sheet): Buffer {
  const worksheet = XLSX.utils.aoa_to_sheet([sheet.columns, ...sheet.rows]);
  const book = XLSX.utils.book_new();
  // Excel rejects sheet names over 31 chars or containing []:*?/\.
  XLSX.utils.book_append_sheet(book, worksheet, sheet.name.slice(0, 31));
  return XLSX.write(book, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

const CONTENT_TYPE: Record<ExportFormat, string> = {
  csv: "text/csv; charset=utf-8",
  json: "application/json; charset=utf-8",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

export function exportResponse(
  sheet: Sheet,
  format: ExportFormat,
  filename: string,
): Response {
  const bodyFor = () => {
    if (format === "csv") return toCsv(sheet);
    if (format === "json") return toJson(sheet);
    return toXlsx(sheet);
  };
  const body = bodyFor();
  return new Response(body as BodyInit, {
    headers: {
      "content-type": CONTENT_TYPE[format],
      "content-disposition": `attachment; filename="${filename}.${format}"`,
      "cache-control": "no-store",
    },
  });
}

/** Slug safe for a Content-Disposition filename. */
export function slug(value: string): string {
  return (
    value
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase()
      .slice(0, 48) || "export"
  );
}
