"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search, Menu, X } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

const NAV_LINKS = [
  { href: "/library", label: "Library" },
  { href: "/suttas", label: "Suttas" },
  { href: "/courses", label: "Courses" },
  { href: "/study-plans", label: "Study Plans" },
  { href: "/reading-path", label: "Reading Path" },
  { href: "/notes", label: "Notes" },
  { href: "/about", label: "About" },
];

export function Navbar() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      setQuery("");
    }
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-bg-border bg-bg/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-1 text-burgundy" aria-label="Home">
          <span className="text-2xl">&#9784;</span>
        </Link>

        <div className="hidden items-center gap-6 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-fg-muted transition-colors hover:text-saffron-dark"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <form onSubmit={handleSearch} className="hidden sm:block">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search the Dharma..."
                className="w-56 rounded-full border border-bg-border bg-bg-card py-1.5 pl-9 pr-4 text-sm text-fg placeholder:text-fg-subtle focus:border-saffron focus:outline-none focus:ring-1 focus:ring-saffron"
              />
            </div>
          </form>
          <ThemeToggle />
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="rounded-full p-2 text-fg-muted md:hidden"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-bg-border px-4 py-4 md:hidden">
          <form onSubmit={handleSearch} className="mb-4">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search the Dharma..."
                className="w-full rounded-full border border-bg-border bg-bg-card py-2 pl-9 pr-4 text-sm text-fg placeholder:text-fg-subtle focus:border-saffron focus:outline-none"
              />
            </div>
          </form>
          <div className="flex flex-col gap-3">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="text-sm font-medium text-fg-muted transition-colors hover:text-saffron-dark"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
