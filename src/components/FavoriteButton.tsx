import { Heart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useFavorites, useToggleFavorite } from "@/hooks/useFavorites";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface Props {
  collegeSlug: string;
  variant?: "icon" | "button";
  className?: string;
}

export function FavoriteButton({ collegeSlug, variant = "icon", className }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: favs } = useFavorites();
  const toggle = useToggleFavorite();
  const isFav = !!favs?.some((f) => f.college_slug === collegeSlug);

  const onClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      navigate(`/auth?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    toggle.mutate({ collegeSlug, isFav });
  };

  if (variant === "button") {
    return (
      <button
        onClick={onClick}
        aria-pressed={isFav}
        aria-label={isFav ? "Remove from favourites" : "Add to favourites"}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-4 h-10 text-sm font-medium border transition-colors",
          isFav
            ? "bg-primary/10 text-primary border-primary/30"
            : "bg-card text-foreground border-border hover:bg-muted",
          className,
        )}
      >
        <Heart className={cn("w-4 h-4", isFav && "fill-primary text-primary")} />
        {isFav ? "Saved" : "Save"}
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      aria-pressed={isFav}
      aria-label={isFav ? "Remove from favourites" : "Add to favourites"}
      className={cn(
        "inline-flex items-center justify-center w-9 h-9 rounded-full bg-card/95 backdrop-blur border border-border shadow-sm hover:bg-card transition-colors",
        className,
      )}
    >
      <Heart
        className={cn(
          "w-4 h-4 transition-all",
          isFav ? "fill-primary text-primary scale-110" : "text-foreground",
        )}
      />
    </button>
  );
}
