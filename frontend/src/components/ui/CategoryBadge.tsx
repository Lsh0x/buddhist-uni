import { getCategoryMeta } from "@/lib/constants";

export function CategoryBadge({ category }: { category: string }) {
  const meta = getCategoryMeta(category);
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${meta.color}`}>
      {meta.label}
    </span>
  );
}
