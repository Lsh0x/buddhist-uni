import { ExternalLink, BookOpen, Headphones, FileText } from "lucide-react";
import { CategoryBadge } from "@/components/ui/CategoryBadge";
import { StarRating } from "@/components/ui/StarRating";
import { TagChip } from "@/components/ui/TagChip";
import type { SearchResult, CourseItem, ReadingPathItem } from "@/lib/types";

type ContentItem = SearchResult | CourseItem | ReadingPathItem;

function getIcon(category: string) {
  switch (category) {
    case "av": return <Headphones size={14} />;
    case "canon": return <BookOpen size={14} />;
    default: return <FileText size={14} />;
  }
}

export function ContentCard({
  item,
  showCheckbox,
  checked,
  onToggle,
}: {
  item: ContentItem;
  showCheckbox?: boolean;
  checked?: boolean;
  onToggle?: () => void;
}) {
  const externalUrl = "external_url" in item ? item.external_url : null;
  const year = "year" in item ? item.year : null;
  const url = externalUrl || item.url;
  const isExternal = url.startsWith("http");

  return (
    <div className="group rounded-xl border border-bg-border bg-bg-card p-5 transition-all hover:border-saffron/40 hover:shadow-md">
      <div className="flex items-start gap-3">
        {showCheckbox && (
          <button
            onClick={(e) => { e.preventDefault(); onToggle?.(); }}
            className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors ${
              checked
                ? "border-sage bg-sage text-cream"
                : "border-bg-border hover:border-saffron"
            }`}
          >
            {checked && (
              <svg viewBox="0 0 12 12" className="h-3 w-3 fill-current">
                <path d="M10 3L4.5 8.5 2 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        )}
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-center gap-2">
            <CategoryBadge category={item.category} />
            <span className="text-fg-subtle">{getIcon(item.category)}</span>
            {year && <span className="text-xs text-fg-subtle">{year}</span>}
          </div>
          <a
            href={url}
            target={isExternal ? "_blank" : undefined}
            rel={isExternal ? "noopener noreferrer" : undefined}
            className="group/link flex items-start gap-1"
          >
            <h3 className="font-serif text-lg font-medium leading-snug text-fg transition-colors group-hover/link:text-saffron-dark">
              {item.title}
            </h3>
            {isExternal && <ExternalLink size={14} className="mt-1 shrink-0 text-fg-subtle" />}
          </a>
          {item.authors.length > 0 && (
            <p className="mt-1 text-sm text-fg-muted">
              {item.authors.join(", ")}
            </p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <StarRating stars={item.stars} />
            {item.tags.slice(0, 3).map((tag) => (
              <TagChip key={tag} tag={tag} />
            ))}
            {item.minutes && (
              <span className="text-xs text-fg-subtle">{item.minutes} min</span>
            )}
            {item.pages && (
              <span className="text-xs text-fg-subtle">{item.pages} pp</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
