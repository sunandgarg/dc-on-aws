import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { UserCheck } from "lucide-react";

interface Props {
  authorId?: string | null;
  fallbackName?: string;
  className?: string;
}

/** Compact "Written by ..." byline strip. Renders nothing when no author resolved. */
export function AuthorByline({ authorId, fallbackName, className = "" }: Props) {
  const [a, setA] = useState<{ name: string; slug: string; photo: string; designation: string } | null>(null);

  useEffect(() => {
    if (!authorId) { setA(null); return; }
    (supabase as any)
      .from("authors")
      .select("name,slug,photo,designation")
      .eq("id", authorId)
      .maybeSingle()
      .then(({ data }: any) => setA(data || null));
  }, [authorId]);

  if (!a && !fallbackName) return null;

  if (!a && fallbackName) {
    return (
      <div className={`flex items-center gap-2 text-xs text-muted-foreground ${className}`}>
        <span className="inline-flex w-6 h-6 rounded-full bg-primary/10 items-center justify-center"><UserCheck className="w-3 h-3 text-primary" /></span>
        <span>Written by <span className="font-medium text-foreground">{fallbackName}</span></span>
      </div>
    );
  }

  return (
    <Link to={`/author/${a!.slug}`} className={`inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition ${className}`}>
      {a!.photo ? (
        <img src={a!.photo} alt={a!.name} className="w-6 h-6 rounded-full object-cover" loading="lazy" />
      ) : (
        <span className="inline-flex w-6 h-6 rounded-full bg-primary/10 items-center justify-center"><UserCheck className="w-3 h-3 text-primary" /></span>
      )}
      <span>Written by <span className="font-medium text-foreground">{a!.name}</span>{a!.designation ? <span className="hidden sm:inline"> · {a!.designation}</span> : null}</span>
    </Link>
  );
}
