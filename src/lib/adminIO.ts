/**
 * Shared admin import / export helpers.
 * Used by CSVTools, RowDataIO, and SimpleTableAdmin to provide CSV + JSON
 * export / import for both bulk and single-row workflows.
 */
import { toCSV, parseCSV, coerceRow, downloadCSV } from "@/lib/csv";

export type TypeHints = Record<string, "number" | "boolean" | "array" | "json">;

export function downloadBlob(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadJSON(filename: string, data: any) {
  downloadBlob(filename, JSON.stringify(data, null, 2), "application/json");
}

/** Strip auto-managed columns before exporting / importing. */
const STRIPPED = new Set(["id", "created_at", "updated_at", "priority_updated_at"]);

export function pickColumns(row: any, columns: string[]): Record<string, any> {
  const out: any = {};
  for (const c of columns) {
    if (STRIPPED.has(c)) continue;
    const v = row?.[c];
    out[c] =
      Array.isArray(v) ? v.join("|") :
      v && typeof v === "object" ? JSON.stringify(v) :
      v ?? "";
  }
  return out;
}

export function rowToCSV(row: any, columns: string[]): string {
  return toCSV([pickColumns(row, columns)], columns.filter((c) => !STRIPPED.has(c)));
}

export function rowsToCSV(rows: any[], columns: string[]): string {
  const cleanCols = columns.filter((c) => !STRIPPED.has(c));
  return toCSV(rows.map((r) => pickColumns(r, columns)), cleanCols);
}

export function rowToJSON(row: any, columns: string[]): any {
  // Keep native arrays/objects in JSON
  const out: any = {};
  for (const c of columns) {
    if (STRIPPED.has(c)) continue;
    out[c] = row?.[c] ?? null;
  }
  return out;
}

export function rowsToJSON(rows: any[], columns: string[]): any[] {
  return rows.map((r) => rowToJSON(r, columns));
}

export function parseJSONImport(text: string): any[] {
  const data = JSON.parse(text);
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") return [data];
  throw new Error("Expected an object or an array of objects");
}

/** Normalise CSV row strings to typed values matching DB columns. */
export function normaliseCsvRows(rawRows: any[], typeHints: TypeHints) {
  return rawRows.map((r) => coerceRow(r, typeHints));
}

/** Make a safe slug filename: "colleges_7d_2026-05-25.csv" */
export function buildFilename(base: string, parts: (string | null | undefined)[], ext: string) {
  const safe = parts.filter(Boolean).join("_").replace(/[^a-zA-Z0-9_-]+/g, "-");
  const date = new Date().toISOString().slice(0, 10);
  return `${base}${safe ? "_" + safe : ""}_${date}.${ext}`;
}

export { toCSV, parseCSV, coerceRow, downloadCSV };
