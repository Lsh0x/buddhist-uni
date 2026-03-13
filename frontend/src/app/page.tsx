"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Search, BookOpen, Compass, Heart, Brain, ArrowRight, RefreshCw, Library, Sparkles, Scale, Globe, Feather, Eye } from "lucide-react";
import { motion } from "framer-motion";
import { POPULAR_TOPICS } from "@/lib/constants";
import { STUDY_PLANS } from "@/lib/study-plans";
import { getAllInProgress } from "@/lib/progress";
import { getSuttas, getRandomItems, type LocalSutta } from "@/lib/local-content";

const PLAN_ICONS: Record<string, React.ReactNode> = {
  brain: <Brain size={28} />,
  heart: <Heart size={28} />,
  "hands-helping": <BookOpen size={28} />,
  compass: <Compass size={28} />,
  sparkles: <Sparkles size={28} />,
  scale: <Scale size={28} />,
  globe: <Globe size={28} />,
  feather: <Feather size={28} />,
  eye: <Eye size={28} />,
  "book-open": <BookOpen size={28} />,
};

export default function HomePage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const inProgress = getAllInProgress();
  const [randomSuttas, setRandomSuttas] = useState<LocalSutta[]>([]);

  const loadRandomSuttas = () => {
    getSuttas().then((all) => {
      const local = all.filter((s) => s.local);
      setRandomSuttas(getRandomItems(local, 3));
    });
  };

  useEffect(() => { loadRandomSuttas(); }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-saffron/10 via-cream to-burgundy/5 px-4 py-24 text-center dark:from-saffron/5 dark:via-bg dark:to-burgundy/5">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <p className="mb-2 text-sm font-medium tracking-widest text-saffron-dark uppercase">
            The Open Buddhist University
          </p>
          <h1 className="mx-auto max-w-3xl font-serif text-5xl font-bold leading-tight text-burgundy-dark md:text-6xl">
            A Free Buddhist Education
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-fg-muted">
            4,494+ texts, suttas, lectures, and courses across Theravada, Mahayana, and Vajrayana traditions.
          </p>

          <form onSubmit={handleSearch} className="mx-auto mt-8 max-w-lg">
            <div className="relative">
              <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-fg-subtle" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search the Dharma..."
                className="w-full rounded-full border border-bg-border bg-bg py-3.5 pl-12 pr-6 text-base text-fg shadow-sm placeholder:text-fg-subtle focus:border-saffron focus:outline-none focus:ring-2 focus:ring-saffron/30"
              />
            </div>
          </form>

          <div className="mx-auto mt-4 flex max-w-lg flex-wrap justify-center gap-2">
            {POPULAR_TOPICS.map((topic) => (
              <Link
                key={topic}
                href={`/search?q=${encodeURIComponent(topic)}`}
                className="rounded-full border border-saffron/20 bg-saffron/5 px-3 py-1 text-sm text-saffron-dark transition-colors hover:bg-saffron/15"
              >
                {topic}
              </Link>
            ))}
          </div>
        </motion.div>

        {/* Decorative lotus */}
        <div className="absolute -bottom-8 right-8 text-[120px] leading-none text-saffron/5 select-none">
          &#10047;
        </div>
      </section>

      {/* Random Suttas */}
      {randomSuttas.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-12">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="font-serif text-2xl font-bold text-fg">Today&apos;s Readings</h2>
              <p className="mt-1 text-sm text-fg-muted">Random suttas from the Pali Canon</p>
            </div>
            <button
              onClick={loadRandomSuttas}
              className="flex items-center gap-1.5 rounded-full border border-bg-border px-3 py-1.5 text-sm text-fg-muted transition-colors hover:border-saffron/40 hover:text-saffron-dark"
            >
              <RefreshCw size={14} /> New readings
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {randomSuttas.map((sutta) => (
              <Link
                key={sutta.id}
                href={`/suttas/${sutta.id}`}
                className="group rounded-xl border border-bg-border bg-bg-card p-5 transition-all hover:border-saffron/40 hover:shadow-md"
              >
                <span className="mb-2 inline-flex items-center gap-1 rounded-full bg-sage/10 px-2 py-0.5 text-xs font-medium text-sage">
                  <BookOpen size={10} /> offline
                </span>
                <h3 className="font-serif text-base font-bold leading-snug text-fg group-hover:text-saffron-dark">
                  {sutta.title}
                </h3>
                {sutta.translator && (
                  <p className="mt-1 text-xs text-fg-subtle">tr. {sutta.translator}</p>
                )}
                {sutta.description && (
                  <p className="mt-2 text-sm leading-relaxed text-fg-muted line-clamp-3">
                    {sutta.description}
                  </p>
                )}
                {sutta.tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {sutta.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="rounded-full bg-bg-border px-2 py-0.5 text-xs text-fg-subtle">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Resume Learning */}
      {inProgress.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-12">
          <h2 className="mb-6 font-serif text-2xl font-bold text-fg">Resume Learning</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {inProgress.slice(0, 3).map((p) => (
              <Link
                key={p.courseId}
                href={`/courses/${p.courseId}`}
                className="group flex items-center justify-between rounded-xl border border-bg-border bg-bg-card p-5 transition-all hover:border-saffron/40 hover:shadow-md"
              >
                <div>
                  <p className="font-serif font-medium text-fg group-hover:text-saffron-dark">
                    {p.courseId}
                  </p>
                  <p className="mt-1 text-sm text-fg-muted">
                    {p.completedItems.length} items completed
                  </p>
                </div>
                <ArrowRight size={18} className="text-fg-subtle group-hover:text-saffron" />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Study Plans */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="mb-8 text-center">
          <h2 className="font-serif text-3xl font-bold text-fg">Study Plans</h2>
          <p className="mt-2 text-fg-muted">Curated learning journeys through the teachings</p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {STUDY_PLANS.map((plan, i) => (
            <motion.div
              key={plan.slug}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
            >
              <Link
                href={`/study-plans/${plan.slug}`}
                className="group block rounded-xl border border-bg-border bg-bg-card p-6 transition-all hover:border-saffron/40 hover:shadow-lg"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-saffron/10 text-saffron-dark">
                  {PLAN_ICONS[plan.icon] ?? <BookOpen size={28} />}
                </div>
                <h3 className="font-serif text-lg font-bold text-fg group-hover:text-saffron-dark">
                  {plan.title}
                </h3>
                <p className="mt-1 text-sm text-fg-muted">{plan.subtitle}</p>
                <p className="mt-3 text-xs text-saffron-dark">{plan.stages.length} stages &rarr;</p>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Quick Links */}
      <section className="border-t border-bg-border bg-bg-card px-4 py-16">
        <div className="mx-auto grid max-w-5xl gap-8 sm:grid-cols-4">
          <Link href="/library" className="group text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-lotus/10 text-lotus transition-colors group-hover:bg-lotus/20">
              <Library size={24} />
            </div>
            <h3 className="font-serif text-lg font-bold text-fg">Library</h3>
            <p className="mt-1 text-sm text-fg-muted">828 suttas available offline</p>
          </Link>
          <Link href="/courses" className="group text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-burgundy/10 text-burgundy transition-colors group-hover:bg-burgundy/20">
              <BookOpen size={24} />
            </div>
            <h3 className="font-serif text-lg font-bold text-fg">71 Courses</h3>
            <p className="mt-1 text-sm text-fg-muted">Structured learning paths</p>
          </Link>
          <Link href="/search" className="group text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-saffron/10 text-saffron-dark transition-colors group-hover:bg-saffron/20">
              <Search size={24} />
            </div>
            <h3 className="font-serif text-lg font-bold text-fg">4,494+ Texts</h3>
            <p className="mt-1 text-sm text-fg-muted">Semantic search across all content</p>
          </Link>
          <Link href="/reading-path" className="group text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-sage/10 text-sage transition-colors group-hover:bg-sage/20">
              <Compass size={24} />
            </div>
            <h3 className="font-serif text-lg font-bold text-fg">Reading Paths</h3>
            <p className="mt-1 text-sm text-fg-muted">Personalized study journeys</p>
          </Link>
        </div>
      </section>
    </div>
  );
}
