import { useState } from "react";
import { Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { FilterAccordionGroup, FilterGroupConfig } from "@/components/FilterAccordion";

interface MobileFilterSheetProps {
  filters: FilterGroupConfig[];
  activeCount: number;
  onClearAll: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  resultCount?: number;
}

export function MobileFilterSheet({ filters, activeCount, onClearAll, open, onOpenChange, resultCount }: MobileFilterSheetProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;
  const setOpen = isControlled ? (onOpenChange || (() => {})) : setInternalOpen;

  return (
    <Sheet open={isOpen} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="hidden lg:flex rounded-xl gap-2 h-9 text-xs">
          <Filter className="w-3.5 h-3.5" />
          Filters
          {activeCount > 0 && <Badge className="bg-primary text-primary-foreground text-[10px] px-1.5 h-4">{activeCount}</Badge>}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[90vh] p-0 flex flex-col rounded-t-2xl">
        <SheetHeader className="p-4 border-b border-border flex-shrink-0">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-base">
              Filters{activeCount > 0 && <span className="text-xs text-muted-foreground ml-2 font-normal">({activeCount} active)</span>}
            </SheetTitle>
            {activeCount > 0 && (
              <button onClick={onClearAll} className="text-xs font-semibold text-primary hover:underline">Clear all</button>
            )}
          </div>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-4">
          {filters.map((f, i) => (
            <FilterAccordionGroup
              key={f.title}
              {...f}
              defaultOpen={i === 0 && (f.selected?.length ?? 0) > 0}
              initialVisible={8}
            />
          ))}
        </div>
        <div className="p-4 border-t border-border flex-shrink-0 bg-background">
          <Button className="w-full rounded-xl h-11" onClick={() => setOpen(false)}>
            {typeof resultCount === "number" ? `Show ${resultCount} results` : "Apply Filters"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

