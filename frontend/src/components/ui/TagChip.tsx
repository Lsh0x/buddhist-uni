import Link from "next/link";

export function TagChip({ tag }: { tag: string }) {
  return (
    <Link
      href={`/search?q=${encodeURIComponent(tag)}`}
      className="inline-block rounded-full border border-lotus/30 bg-lotus/10 px-2 py-0.5 text-xs text-lotus transition-colors hover:bg-lotus/20"
    >
      {tag}
    </Link>
  );
}
