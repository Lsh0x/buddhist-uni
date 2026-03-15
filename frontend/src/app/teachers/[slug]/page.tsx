"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { User } from "lucide-react";
import { getTeacher } from "@/lib/api";
import { ContentCard } from "@/components/content/ContentCard";
import { CardSkeleton } from "@/components/ui/Skeleton";

function formatName(slug: string) {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default function TeacherPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { data: works, isLoading } = useQuery({
    queryKey: ["teacher", slug],
    queryFn: () => getTeacher(slug),
  });

  const name = formatName(slug);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8 flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-burgundy/10 text-burgundy">
          <User size={28} />
        </div>
        <div>
          <h1 className="font-serif text-3xl font-bold text-fg">{name}</h1>
          <p className="text-fg-muted">Works in the library</p>
        </div>
      </div>

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 6 }, (_, i) => <CardSkeleton key={i} />)}
        </div>
      )}

      {works && (
        <>
          <p className="mb-4 text-sm text-fg-muted">{works.length} items</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {works.map((item, i) => (
              <ContentCard key={`${item.url}-${i}`} item={item} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
