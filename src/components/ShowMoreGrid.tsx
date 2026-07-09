import { ReactNode, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";

interface Props<T> {
  items: T[];
  /** Items per row at the largest breakpoint (used to compute initial visible). */
  perRow?: number;
  /** Initial visible rows (default 2). */
  initialRows?: number;
  /** Step rows (default 2). */
  stepRows?: number;
  className?: string;
  renderItem: (item: T, index: number) => ReactNode;
}

/** Generic grid that initially shows N rows then expands by N rows per click. */
export function ShowMoreGrid<T>({ items, perRow = 4, initialRows = 2, stepRows = 2, className, renderItem }: Props<T>) {
  const [rows, setRows] = useState(initialRows);
  const visibleCount = rows * perRow;
  const visible = items.slice(0, visibleCount);
  const hasMore = items.length > visibleCount;
  return (
    <div>
      <div className={className}>{visible.map((it, i) => renderItem(it, i))}</div>
      {hasMore && (
        <div className="flex justify-center mt-4">
          <Button variant="outline" onClick={() => setRows((r) => r + stepRows)} className="gap-1.5">
            Show more <ChevronDown className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
