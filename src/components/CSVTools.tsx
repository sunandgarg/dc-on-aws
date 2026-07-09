import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Download, Upload, X, FileSpreadsheet, AlertTriangle, CheckCircle2, History, FileJson, FilePlus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { toCSV, downloadCSV, parseCSV, coerceRow } from "@/lib/csv";
import { downloadJSON, parseJSONImport, buildFilename, rowsToJSON } from "@/lib/adminIO";
import { discoverTable, sniffSchema, inferSchemaFromRows, STRIPPED } from "@/lib/adminIOAuto";

interface Props {
  table: string;
  filename: string;
  /** Pass an explicit list, or "*" to auto-discover EVERY column on the table (no field gets dropped). */
  columns: string[] | "*";
  typeHints?: Record<string, "number" | "boolean" | "array" | "json">;
  required?: string[];
  upsertKey?: string;
  onImported?: () => void;
}

interface HistoryEntry { at: string; table: string; count: number; ok: boolean; fmt?: string; }

const HKEY = "csv-tools-history";

function readHistory(): HistoryEntry[] {
  try { return JSON.parse(localStorage.getItem(HKEY) || "[]"); } catch { return []; }
}
function pushHistory(e: HistoryEntry) {
  const list = [e, ...readHistory()].slice(0, 20);
  localStorage.setItem(HKEY, JSON.stringify(list));
}

/**
 * Universal admin Import/Export toolbar.
 * Supports CSV + JSON, bulk + single-row, with upsert-by-slug semantics.
 * Pass columns="*" to auto-discover every DB column so nothing is dropped.
 */
export function CSVTools({ table, filename, columns: columnsProp, typeHints: typeHintsProp = {}, required = [], upsertKey = "slug", onImported }: Props) {
  const csvFileRef = useRef<HTMLInputElement>(null);
  const jsonFileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<{ rows: any[]; raw: number; errors: { row: number; msg: string }[]; fmt: "csv" | "json" } | null>(null);
  const [singleOpen, setSingleOpen] = useState(false);
  const [singleText, setSingleText] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [autoCols, setAutoCols] = useState<string[] | null>(null);
  const [autoHints, setAutoHints] = useState<Record<string, "number" | "boolean" | "array" | "json">>({});
  const baseName = filename.replace(/\.csv$/i, "").replace(/\.json$/i, "");
  const isAuto = columnsProp === "*";

  useEffect(() => { setHistory(readHistory()); }, [showHistory]);

  useEffect(() => {
    if (!isAuto) return;
    let cancelled = false;
    sniffSchema(table).then((s) => {
      if (cancelled) return;
      setAutoCols(s.columns);
      setAutoHints(s.typeHints);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [table, isAuto]);

  const columns = useMemo<string[]>(
    () => (isAuto ? (autoCols ?? []) : (columnsProp as string[])),
    [isAuto, columnsProp, autoCols],
  );
  const typeHints = useMemo(() => ({ ...autoHints, ...typeHintsProp }), [autoHints, typeHintsProp]);

  const fetchAll = async () => {
    if (isAuto) {
      const { rows, schema } = await discoverTable(table);
      // refresh hints/cols from full data - guarantees nothing is dropped on export
      setAutoCols(schema.columns);
      setAutoHints(schema.typeHints);
      return rows;
    }
    const all: any[] = [];
    let from = 0;
    while (true) {
      const { data, error } = await supabase
        .from(table as any)
        .select((columnsProp as string[]).join(","))
        .range(from, from + 999);
      if (error) throw error;
      const chunk = (data || []) as any[];
      all.push(...chunk);
      if (chunk.length < 1000) break;
      from += 1000;
      if (from > 50_000) break;
    }
    return all;
  };

  const handleExportCSV = async () => {
    setBusy(true);
    try {
      const data = await fetchAll();
      // When auto, use the union of every key present in the fetched data so
      // no field is ever dropped. Otherwise use the explicit columns list.
      const cols = isAuto ? inferSchemaFromRows(data).columns : columns;
      const rows = data.map((r: any) => {
        const o: any = {};
        cols.forEach((c) => {
          const v = r[c];
          o[c] = Array.isArray(v) ? v.join("|") : v && typeof v === "object" ? JSON.stringify(v) : v ?? "";
        });
        return o;
      });
      downloadCSV(buildFilename(baseName, ["all"], "csv"), toCSV(rows, cols));
      toast.success(`Exported ${rows.length} rows · ${cols.length} fields (CSV)`);
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  const handleExportJSON = async () => {
    setBusy(true);
    try {
      const data = await fetchAll();
      const cols = isAuto ? inferSchemaFromRows(data).columns : columns;
      downloadJSON(buildFilename(baseName, ["all"], "json"), rowsToJSON(data, cols));
      toast.success(`Exported ${data.length} rows · ${cols.length} fields (JSON)`);
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  const handleTemplate = () => {
    const cols = columns.length ? columns : Object.keys(typeHints);
    const sample: any = {};
    cols.forEach((c) => {
      const t = typeHints[c];
      sample[c] = t === "number" ? 0 : t === "boolean" ? "true" : t === "array" ? "value1|value2" : t === "json" ? "{}" : required.includes(c) ? `<required>` : "";
    });
    downloadCSV(`${baseName}-template.csv`, toCSV([sample], cols));
  };


  const validate = (rows: any[]) => {
    const errors: { row: number; msg: string }[] = [];
    rows.forEach((r, i) => {
      required.forEach((k) => {
        if (r[k] === undefined || r[k] === null || String(r[k]).trim() === "") errors.push({ row: i + 2, msg: `Missing required: ${k}` });
      });
      Object.entries(typeHints).forEach(([k, t]) => {
        if (r[k] === undefined) return;
        if (t === "number" && Number.isNaN(Number(r[k]))) errors.push({ row: i + 2, msg: `${k} must be a number` });
      });
    });
    return errors;
  };

  /** Coerce JSON rows: string arrays "a|b" → array, "true"/"false" → bool, numeric strings → number. */
  const coerceJsonRow = (r: any) => {
    const out: any = { ...r };
    for (const [k, t] of Object.entries(typeHints)) {
      const v = out[k];
      if (v === undefined || v === null || v === "") { if (v === "") delete out[k]; continue; }
      if (t === "array" && typeof v === "string") out[k] = v.split("|").map((s) => s.trim()).filter(Boolean);
      else if (t === "number" && typeof v === "string") out[k] = Number(v);
      else if (t === "boolean" && typeof v === "string") out[k] = /^(1|true|yes|y)$/i.test(v);
      else if (t === "json" && typeof v === "string") { try { out[k] = JSON.parse(v); } catch { /* leave */ } }
    }
    return out;
  };

  const handleFile = (fmt: "csv" | "json") => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      toast.error("File too large (max 25 MB). Split it into smaller chunks.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      try {
        let rows: any[];
        let raw: number;
        if (fmt === "csv") {
          const parsed = parseCSV(text);
          raw = parsed.length;
          rows = parsed.map((r) => coerceRow(r, typeHints));
        } else {
          const parsed = parseJSONImport(text);
          raw = parsed.length;
          rows = parsed.map(coerceJsonRow);
        }
        if (rows.length > 10_000) {
          toast.error("Max 10,000 rows per import. Split the file.");
          return;
        }
        const errors = validate(rows);
        setPreview({ rows, raw, errors, fmt });
      } catch (err: any) {
        toast.error(`Parse error: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  const confirmImport = async () => {
    if (!preview) return;
    const valid = preview.rows.filter((_, i) => !preview.errors.some((e) => e.row === i + 2));
    setBusy(true);
    // Chunk to keep payloads safe and surface progress
    const CHUNK = 500;
    let done = 0;
    let lastError: any = null;
    for (let i = 0; i < valid.length; i += CHUNK) {
      const slice = valid.slice(i, i + CHUNK);
      const { error } = await supabase.from(table as any).upsert(slice as any, { onConflict: upsertKey });
      if (error) { lastError = error; break; }
      done += slice.length;
    }
    setBusy(false);
    pushHistory({ at: new Date().toISOString(), table, count: done, ok: !lastError, fmt: preview.fmt });
    if (lastError) return toast.error(`Imported ${done}/${valid.length} before error: ${lastError.message}`);
    toast.success(`Imported / updated ${done} rows`);
    setPreview(null);
    if (csvFileRef.current) csvFileRef.current.value = "";
    if (jsonFileRef.current) jsonFileRef.current.value = "";
    onImported?.();
  };


  const importSingle = async () => {
    if (!singleText.trim()) { toast.error("Paste a JSON object or CSV row first"); return; }
    setBusy(true);
    try {
      let row: any;
      const trimmed = singleText.trim();
      if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
        const arr = parseJSONImport(trimmed);
        if (arr.length !== 1) throw new Error("Paste exactly one object");
        row = coerceJsonRow(arr[0]);
      } else {
        // Assume CSV with header + 1 data line
        const parsed = parseCSV(trimmed);
        if (parsed.length !== 1) throw new Error("CSV must have 1 header + 1 data row");
        row = coerceRow(parsed[0], typeHints);
      }
      const missing = required.filter((k) => row[k] === undefined || String(row[k]).trim() === "");
      if (missing.length) throw new Error(`Missing required: ${missing.join(", ")}`);
      const { error } = await supabase.from(table as any).upsert([row] as any, { onConflict: upsertKey });
      if (error) throw error;
      pushHistory({ at: new Date().toISOString(), table, count: 1, ok: true, fmt: "single" });
      toast.success(`Imported 1 ${table} row`);
      setSingleOpen(false);
      setSingleText("");
      onImported?.();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-3 flex flex-wrap gap-2 items-center">
      <FileSpreadsheet className="w-4 h-4 text-muted-foreground" />
      <span className="text-sm font-medium mr-1">Bulk:</span>
      <Button size="sm" variant="outline" onClick={handleExportCSV} disabled={busy}>
        <Download className="w-3.5 h-3.5 mr-1" />CSV
      </Button>
      <Button size="sm" variant="outline" onClick={handleExportJSON} disabled={busy}>
        <FileJson className="w-3.5 h-3.5 mr-1" />JSON
      </Button>
      <Button size="sm" variant="ghost" onClick={handleTemplate}>Template</Button>

      <input ref={csvFileRef} type="file" accept=".csv,text/csv" onChange={handleFile("csv")} className="hidden" />
      <input ref={jsonFileRef} type="file" accept=".json,application/json" onChange={handleFile("json")} className="hidden" />

      <Button size="sm" variant="outline" onClick={() => csvFileRef.current?.click()} disabled={busy}>
        <Upload className="w-3.5 h-3.5 mr-1" />Import CSV
      </Button>
      <Button size="sm" variant="outline" onClick={() => jsonFileRef.current?.click()} disabled={busy}>
        <Upload className="w-3.5 h-3.5 mr-1" />Import JSON
      </Button>
      <Button size="sm" variant="outline" onClick={() => setSingleOpen(true)} disabled={busy}>
        <FilePlus className="w-3.5 h-3.5 mr-1" />Add single
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setShowHistory(true)}><History className="w-3.5 h-3.5 mr-1" />History</Button>
      <span className="text-[11px] text-muted-foreground">Upsert by <b>{upsertKey}</b> · max 1,000 rows · <b>|</b> separates array values</span>

      {preview && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setPreview(null)}>
          <Card className="max-w-3xl w-full p-5 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-lg">Preview {preview.fmt.toUpperCase()} Import</h3>
              <Button variant="ghost" size="sm" onClick={() => setPreview(null)}><X className="w-4 h-4" /></Button>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-3 text-sm">
              <div className="p-2.5 rounded-lg bg-muted"><div className="text-xs text-muted-foreground">Parsed</div><div className="font-bold">{preview.raw}</div></div>
              <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-700"><div className="text-xs">Valid</div><div className="font-bold flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" />{preview.rows.length - new Set(preview.errors.map((e) => e.row)).size}</div></div>
              <div className="p-2.5 rounded-lg bg-rose-50 text-rose-700"><div className="text-xs">Errors</div><div className="font-bold flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" />{preview.errors.length}</div></div>
            </div>
            {preview.errors.length > 0 && (
              <div className="mb-3 max-h-32 overflow-y-auto bg-rose-50/50 rounded-lg p-2 text-xs space-y-1">
                {preview.errors.slice(0, 30).map((e, i) => (
                  <div key={i} className="text-rose-700">Row {e.row}: {e.msg}</div>
                ))}
                {preview.errors.length > 30 && <div className="text-muted-foreground">+ {preview.errors.length - 30} more…</div>}
              </div>
            )}
            <div className="overflow-x-auto border rounded mb-4">
              <table className="text-xs w-full">
                <thead className="bg-muted"><tr>{columns.slice(0, 6).map((c) => <th key={c} className="text-left p-2">{c}</th>)}</tr></thead>
                <tbody>
                  {preview.rows.slice(0, 5).map((r, i) => (
                    <tr key={i} className="border-t">
                      {columns.slice(0, 6).map((c) => <td key={c} className="p-2 truncate max-w-[150px]">{Array.isArray(r[c]) ? r[c].join(", ") : String(r[c] ?? "")}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPreview(null)}>Cancel</Button>
              <Button onClick={confirmImport} disabled={busy || preview.rows.length === 0}>{busy ? "Importing..." : `Import ${preview.rows.length - new Set(preview.errors.map((e) => e.row)).size} valid rows`}</Button>
            </div>
          </Card>
        </div>
      )}

      {singleOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setSingleOpen(false)}>
          <Card className="max-w-2xl w-full p-5 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-lg flex items-center gap-2"><FilePlus className="w-4 h-4" />Add a single {table} row</h3>
              <Button variant="ghost" size="sm" onClick={() => setSingleOpen(false)}><X className="w-4 h-4" /></Button>
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              Paste a single JSON object <code className="text-[10px]">{"{ \"slug\": \"foo\", ... }"}</code> or a CSV header+row.
              Upserts by <b>{upsertKey}</b>.
            </p>
            <Textarea
              value={singleText}
              onChange={(e) => setSingleText(e.target.value)}
              placeholder={`{\n  "${upsertKey}": "example-slug",\n  ...\n}`}
              className="font-mono text-xs min-h-[200px]"
            />
            <div className="flex justify-end gap-2 mt-3">
              <Button variant="outline" onClick={() => setSingleOpen(false)}>Cancel</Button>
              <Button onClick={importSingle} disabled={busy}>{busy ? "Saving…" : "Save row"}</Button>
            </div>
          </Card>
        </div>
      )}

      {showHistory && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowHistory(false)}>
          <Card className="max-w-xl w-full p-5 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-lg flex items-center gap-2"><History className="w-4 h-4" />Import History</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowHistory(false)}><X className="w-4 h-4" /></Button>
            </div>
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground">No imports yet.</p>
            ) : (
              <div className="space-y-1.5 text-sm">
                {history.map((h, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-lg border">
                    <div>
                      <div className="font-medium">{h.table} · {h.count} rows {h.fmt ? <span className="text-xs text-muted-foreground">({h.fmt})</span> : null}</div>
                      <div className="text-xs text-muted-foreground">{new Date(h.at).toLocaleString()}</div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${h.ok ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>{h.ok ? "OK" : "Failed"}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
    </Card>
  );
}
