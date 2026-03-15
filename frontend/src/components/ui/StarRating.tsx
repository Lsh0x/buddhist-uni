import { Star } from "lucide-react";

export function StarRating({ stars }: { stars: number | null }) {
  if (!stars) return null;
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          size={14}
          className={i < stars ? "fill-dharma-gold text-dharma-gold" : "text-bg-border"}
        />
      ))}
    </div>
  );
}
