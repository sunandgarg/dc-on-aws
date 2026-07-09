import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";

export function WordCounter() {
  const [text, setText] = useState("");

  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const characters = text.length;
  const charsNoSpaces = text.replace(/\s/g, "").length;
  const sentences = text.trim() ? text.split(/[.!?]+/).filter(s => s.trim()).length : 0;
  const paragraphs = text.trim() ? text.split(/\n\n+/).filter(p => p.trim()).length : 0;
  const readingTime = `${Math.max(1, Math.ceil(words / 200))} min`;

  const stats = [
    { label: "Words", value: words },
    { label: "Characters", value: characters },
    { label: "No Spaces", value: charsNoSpaces },
    { label: "Sentences", value: sentences },
    { label: "Paragraphs", value: paragraphs },
    { label: "Reading Time", value: readingTime },
  ];

  return (
    <div className="space-y-4">
      <h3 className="font-bold text-foreground">Word & Character Counter</h3>
      <p className="text-sm text-muted-foreground">Count words, characters, sentences, and estimate reading time.</p>

      <Textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Paste or type your text here..."
        className="min-h-[120px] rounded-xl text-sm resize-none"
      />

      <div className="grid grid-cols-3 gap-2">
        {stats.map(s => (
          <div key={s.label} className="bg-muted/40 rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-foreground">{s.value}</p>
            <p className="text-[10px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
