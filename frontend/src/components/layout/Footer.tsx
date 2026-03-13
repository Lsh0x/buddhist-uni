import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-bg-border bg-bg-card">
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid gap-8 sm:grid-cols-3">
          <div>
            <h3 className="mb-3 font-serif text-lg font-bold text-burgundy">
              <span className="mr-1">&#9784;</span> Buddhist University
            </h3>
            <p className="text-sm text-fg-muted">
              A free Buddhist education for the digital generation. 4,494+ texts covering
              Theravada, Mahayana, and Vajrayana traditions.
            </p>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-semibold text-fg">Explore</h4>
            <div className="flex flex-col gap-2">
              <Link href="/library" className="text-sm text-fg-muted hover:text-saffron-dark">Library</Link>
              <Link href="/courses" className="text-sm text-fg-muted hover:text-saffron-dark">Courses</Link>
              <Link href="/study-plans" className="text-sm text-fg-muted hover:text-saffron-dark">Study Plans</Link>
              <Link href="/reading-path" className="text-sm text-fg-muted hover:text-saffron-dark">Reading Path</Link>
              <Link href="/search" className="text-sm text-fg-muted hover:text-saffron-dark">Search</Link>
            </div>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-semibold text-fg">About</h4>
            <div className="flex flex-col gap-2">
              <Link href="/about" className="text-sm text-fg-muted hover:text-saffron-dark">About</Link>
              <a href="https://github.com/buddhist-uni/buddhist-uni.github.io" target="_blank" rel="noopener noreferrer" className="text-sm text-fg-muted hover:text-saffron-dark">
                GitHub
              </a>
            </div>
          </div>
        </div>
        <div className="mt-8 border-t border-bg-border pt-6 text-center text-xs text-fg-subtle">
          Open source. Open access. Open hearts.
        </div>
      </div>
    </footer>
  );
}
