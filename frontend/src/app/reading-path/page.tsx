"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Compass } from "lucide-react";
import { motion } from "framer-motion";
import { getReadingPath } from "@/lib/api";
import { ContentCard } from "@/components/content/ContentCard";
import { CardSkeleton } from "@/components/ui/Skeleton";

const LEVELS = [
  { id: "beginner", label: "Beginner", desc: "Audio/video & booklets" },
  { id: "intermediate", label: "Intermediate", desc: "Articles & monographs" },
  { id: "advanced", label: "Advanced", desc: "Papers & canonical texts" },
];

export default function ReadingPathPage() {
  const [topic, setTopic] = useState("");
  const [level, setLevel] = useState("beginner");
  const [submittedTopic, setSubmittedTopic] = useState("");

  const { data: path, isLoading } = useQuery({
    queryKey: ["reading-path", submittedTopic, level],
    queryFn: () => getReadingPath({ topic: submittedTopic, level, limit: 10 }),
    enabled: submittedTopic.length >= 2,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (topic.trim()) setSubmittedTopic(topic.trim());
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-sage/10 text-sage">
          <Compass size={28} />
        </div>
        <h1 className="font-serif text-3xl font-bold text-fg">Reading Path Generator</h1>
        <p className="mt-2 text-fg-muted">
          Enter a topic and level to generate a personalized study journey
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mx-auto max-w-lg">
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="e.g. meditation, dependent origination, compassion..."
          className="w-full rounded-xl border border-bg-border bg-bg-card px-4 py-3 text-fg placeholder:text-fg-subtle focus:border-saffron focus:outline-none focus:ring-2 focus:ring-saffron/30"
        />

        <div className="mt-4 flex justify-center gap-3">
          {LEVELS.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => setLevel(l.id)}
              className={`rounded-lg border px-4 py-2 text-sm transition-colors ${
                level === l.id
                  ? "border-saffron bg-saffron/10 text-saffron-dark"
                  : "border-bg-border text-fg-muted hover:border-saffron/40"
              }`}
            >
              <span className="font-medium">{l.label}</span>
              <br />
              <span className="text-xs opacity-70">{l.desc}</span>
            </button>
          ))}
        </div>

        <button
          type="submit"
          className="mx-auto mt-6 block rounded-full bg-saffron px-8 py-2.5 font-medium text-cream transition-colors hover:bg-saffron-dark"
        >
          Generate Path
        </button>
      </form>

      {isLoading && (
        <div className="mt-10 space-y-4">
          {Array.from({ length: 5 }, (_, i) => <CardSkeleton key={i} />)}
        </div>
      )}

      {path && path.length > 0 && (
        <div className="relative mt-10">
          {/* Timeline line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-bg-border" />

          <div className="space-y-6">
            {path.map((item, i) => (
              <motion.div
                key={`${item.url}-${i}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: i * 0.1 }}
                className="relative pl-16"
              >
                {/* Step number */}
                <div className="absolute left-3 flex h-7 w-7 items-center justify-center rounded-full border-2 border-saffron bg-bg text-xs font-bold text-saffron-dark">
                  {item.path_order}
                </div>
                <ContentCard item={item} />
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {path && path.length === 0 && (
        <div className="mt-10 text-center">
          <p className="text-4xl">&#10047;</p>
          <p className="mt-4 text-fg-muted">No path found for this topic. Try different keywords.</p>
        </div>
      )}
    </div>
  );
}
