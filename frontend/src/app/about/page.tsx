import { BookOpen, Search, Compass, Users } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 font-serif text-3xl font-bold text-fg">About</h1>

      <div className="prose-buddhist space-y-6 text-fg-muted">
        <p className="text-lg">
          The Open Buddhist University is a free, comprehensive library of Buddhist teachings
          spanning Theravada, Mahayana, and Vajrayana traditions. Our mission is to make the
          Buddha&apos;s teachings accessible to everyone in the digital age.
        </p>

        <h2 className="font-serif text-xl font-bold text-fg">What We Offer</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-bg-border bg-bg-card p-5">
            <BookOpen size={24} className="mb-2 text-burgundy" />
            <h3 className="font-serif font-bold text-fg">4,494+ Resources</h3>
            <p className="mt-1 text-sm">
              Suttas, articles, books, audio lectures, and video teachings curated for quality.
            </p>
          </div>
          <div className="rounded-xl border border-bg-border bg-bg-card p-5">
            <Search size={24} className="mb-2 text-saffron-dark" />
            <h3 className="font-serif font-bold text-fg">Semantic Search</h3>
            <p className="mt-1 text-sm">
              AI-powered search that understands meaning, not just keywords.
            </p>
          </div>
          <div className="rounded-xl border border-bg-border bg-bg-card p-5">
            <Compass size={24} className="mb-2 text-sage" />
            <h3 className="font-serif font-bold text-fg">71 Courses</h3>
            <p className="mt-1 text-sm">
              Structured learning paths from introductory to advanced studies.
            </p>
          </div>
          <div className="rounded-xl border border-bg-border bg-bg-card p-5">
            <Users size={24} className="mb-2 text-lotus" />
            <h3 className="font-serif font-bold text-fg">200+ Teachers</h3>
            <p className="mt-1 text-sm">
              Works from venerable monastics and respected scholars.
            </p>
          </div>
        </div>

        <h2 className="font-serif text-xl font-bold text-fg">Open Source</h2>
        <p>
          This project is fully open source. The entire library, including all metadata and the
          search infrastructure, is available on{" "}
          <a
            href="https://github.com/buddhist-uni/buddhist-uni.github.io"
            target="_blank"
            rel="noopener noreferrer"
            className="text-saffron-dark underline hover:text-saffron"
          >
            GitHub
          </a>
          . Contributions are welcome.
        </p>

        <div className="rounded-xl border border-saffron/20 bg-saffron/5 p-6 text-center">
          <p className="font-serif text-lg italic text-fg">
            &ldquo;An insincere and evil friend is more to be feared than a wild beast; a wild
            beast may wound your body, but an evil friend will wound your mind.&rdquo;
          </p>
          <p className="mt-2 text-sm text-saffron-dark">&mdash; The Buddha</p>
        </div>
      </div>
    </div>
  );
}
