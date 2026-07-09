import { Sparkles } from "lucide-react";
import { RichTextEditor } from "@/components/RichTextEditor";

interface PageSummaryFieldProps {
  value: string;
  onChange: (v: string) => void;
}

/**
 * Admin field for writing a "Quick Summary" of the whole page.
 * Strips HTML tags only for word count - the editor still saves rich HTML.
 */
export function PageSummaryField({ value, onChange }: PageSummaryFieldProps) {
  const text = (value || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const words = text ? text.split(" ").length : 0;
  const inRange = words >= 200 && words <= 800;
  const tooShort = words > 0 && words < 200;
  const tooLong = words > 800;

  return (
    <div className="rounded-xl border border-primary/25 bg-primary/[0.04] p-3 md:p-4">
      <div className="flex items-start gap-3 mb-2">
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-foreground shrink-0">
          <Sparkles className="w-4 h-4" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground">Quick Summary (Page Summary)</p>
          <p className="text-[12px] text-muted-foreground mt-0.5 leading-relaxed">
            <b>Summarise the whole page in 200–800 words.</b> This is the very first block students
            see - it stays collapsed by default with a "Quick Summary" heading and opens on click.
            Write it like you're explaining the page to a friend: clear, helpful, easy to scan.
          </p>
        </div>
      </div>
      <RichTextEditor
        bare
        label=""
        value={value}
        onChange={onChange}
        rows={8}
        placeholder="Start the summary here… Cover the most important things a student would want to know about this page in 200–800 words."
      />
      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
        <span
          className={
            "px-2 py-0.5 rounded-full font-semibold " +
            (inRange
              ? "bg-success/15 text-success"
              : tooShort
              ? "bg-amber-500/15 text-amber-600"
              : tooLong
              ? "bg-destructive/15 text-destructive"
              : "bg-muted text-muted-foreground")
          }
        >
          {words} {words === 1 ? "word" : "words"}
          {inRange ? " · perfect" : tooShort ? " · add a bit more (min 200)" : tooLong ? " · trim down (max 800)" : " · target 200–800"}
        </span>
        <span className="text-muted-foreground">Headings, lists and tables are supported.</span>
      </div>
    </div>
  );
}
