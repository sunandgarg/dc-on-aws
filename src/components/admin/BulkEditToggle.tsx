import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Settings2, X } from "lucide-react";
import { BulkEditGrid, type BulkColumn } from "@/components/admin/BulkEditGrid";

interface Props {
  table: string;
  columns: BulkColumn[];
  searchKeys?: string[];
  orderBy?: { column: string; ascending?: boolean };
}

/** Toggle button + inline bulk edit panel for any list page. */
export function BulkEditToggle({ table, columns, searchKeys, orderBy }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant={open ? "default" : "outline"}
        size="sm"
        onClick={() => setOpen((o) => !o)}
        className="rounded-xl gap-2"
      >
        {open ? <X className="w-4 h-4" /> : <Settings2 className="w-4 h-4" />}
        {open ? "Close Bulk Edit" : "Bulk Edit"}
      </Button>
      {open && (
        <div className="my-3 bg-card border border-border rounded-2xl p-3">
          <BulkEditGrid table={table} columns={columns} searchKeys={searchKeys} orderBy={orderBy} />
        </div>
      )}
    </>
  );
}
