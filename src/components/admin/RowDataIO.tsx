import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Download, FileJson, FileSpreadsheet } from "lucide-react";
import { rowToCSV, rowToJSON, downloadJSON, buildFilename } from "@/lib/adminIO";
import { downloadCSV } from "@/lib/csv";
import { STRIPPED } from "@/lib/adminIOAuto";

interface Props {
  row: any;
  /** Explicit column whitelist, or "*" to include every field present on the row (no field dropped). */
  columns: string[] | "*";
  /** Base filename, e.g. "college", "course". */
  base: string;
  /** Key on the row used to name the export file (usually "slug" or "id"). */
  nameKey?: string;
  size?: "icon" | "sm";
}

/**
 * Per-row Export menu (CSV or JSON). Drop this into any admin row's
 * action area to export a single record. Pass columns="*" to export every
 * field present on the row.
 */
export function RowDataIO({ row, columns, base, nameKey = "slug", size = "icon" }: Props) {
  const [open, setOpen] = useState(false);
  const safe = String(row?.[nameKey] || row?.id || "row").replace(/[^a-zA-Z0-9_-]+/g, "-");
  const resolved: string[] =
    columns === "*"
      ? Object.keys(row || {}).filter((k) => !STRIPPED.has(k))
      : columns;

  const exportCSV = () => {
    downloadCSV(buildFilename(base, [safe], "csv"), rowToCSV(row, resolved));
    setOpen(false);
  };
  const exportJSON = () => {
    downloadJSON(buildFilename(base, [safe], "json"), rowToJSON(row, resolved));
    setOpen(false);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size={size === "icon" ? "icon" : "sm"}
          className={size === "icon" ? "w-8 h-8" : ""}
          title="Export this row"
        >
          <Download className="w-3.5 h-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportCSV}>
          <FileSpreadsheet className="w-3.5 h-3.5 mr-2" /> Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportJSON}>
          <FileJson className="w-3.5 h-3.5 mr-2" /> Export as JSON
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => { navigator.clipboard.writeText(JSON.stringify(rowToJSON(row, resolved), null, 2)); setOpen(false); }}>
          Copy JSON to clipboard
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
