/**
 * CSV utilities - no extra dependencies.
 * Handles quoted values, commas, newlines and escapes.
 */

export function toCSV(rows: Record<string, any>[], columns?: string[]): string {
  if (!rows.length) return "";
  const cols = columns || Object.keys(rows[0]);
  const escape = (v: any): string => {
    if (v === null || v === undefined) return "";
    let s = typeof v === "object" ? JSON.stringify(v) : String(v);
    if (/[",\n\r]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const head = cols.join(",");
  const body = rows.map(r => cols.map(c => escape(r[c])).join(",")).join("\n");
  return head + "\n" + body;
}

export function downloadCSV(filename: string, csv: string) {
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export function parseCSV(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQ) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') inQ = false;
      else field += ch;
    } else {
      if (ch === '"') inQ = true;
      else if (ch === ",") { cur.push(field); field = ""; }
      else if (ch === "\n") { cur.push(field); rows.push(cur); cur = []; field = ""; }
      else if (ch === "\r") { /* skip */ }
      else field += ch;
    }
  }
  if (field.length || cur.length) { cur.push(field); rows.push(cur); }
  if (!rows.length) return [];
  const headers = rows.shift()!.map(h => h.trim());
  return rows.filter(r => r.some(c => c.length)).map(r => {
    const o: Record<string, string> = {};
    headers.forEach((h, i) => { o[h] = r[i] ?? ""; });
    return o;
  });
}

/** Coerces CSV strings into proper types based on a hint map. */
export function coerceRow(row: Record<string, string>, hints: Record<string, "number" | "boolean" | "array" | "json">) {
  const out: Record<string, any> = { ...row };
  for (const [k, t] of Object.entries(hints)) {
    if (out[k] === undefined || out[k] === "") { delete out[k]; continue; }
    const v = out[k];
    if (t === "number") out[k] = Number(v);
    else if (t === "boolean") out[k] = /^(1|true|yes|y)$/i.test(v);
    else if (t === "array") out[k] = String(v).split("|").map(s => s.trim()).filter(Boolean);
    else if (t === "json") { try { out[k] = JSON.parse(v); } catch { /* leave */ } }
  }
  return out;
}
