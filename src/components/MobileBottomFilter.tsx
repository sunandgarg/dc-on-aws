import { Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface MobileBottomFilterProps {
  activeCount: number;
  onOpen: () => void;
}

export function MobileBottomFilter({ activeCount, onOpen }: MobileBottomFilterProps) {
  return (
    <>
      <button
        onClick={onOpen}
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 lg:hidden flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-full shadow-lg hover:shadow-xl transition-shadow text-sm font-semibold"
      >
        <Filter className="w-4 h-4" />
        Filters
        {activeCount > 0 && (
          <Badge className="bg-primary-foreground text-primary text-[10px] px-1.5 h-5 ml-1">
            {activeCount}
          </Badge>
        )}
      </button>
      {/* Spacer for bottom filter button */}
      <div className="h-16 lg:hidden" />
    </>
  );
}
