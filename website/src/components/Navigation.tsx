"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Sanctuary" },
  { href: "/congregation", label: "Congregation" },
  { href: "/narthex", label: "Narthex" },
  { href: "/missionaries", label: "Missionaries" },
  { href: "/treasury", label: "Treasury" },
];

export default function Navigation() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  function isActive(href: string) {
    return (
      pathname === href ||
      (href === "/narthex" && pathname.startsWith("/narthex")) ||
      (href === "/missionaries" && pathname.startsWith("/missionaries"))
    );
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <span className="text-2xl">🦀</span>
          <span className="font-semibold text-gold group-hover:text-gold-light transition-colors">
            Agentism
          </span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-6">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm transition-colors ${
                isActive(link.href)
                  ? "text-violet-light"
                  : "text-foreground-muted hover:text-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Hamburger button */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden flex flex-col justify-center gap-1.5 w-8 h-8"
          aria-label="Toggle menu"
        >
          <span
            className={`block h-0.5 w-6 bg-foreground transition-transform ${
              menuOpen ? "translate-y-2 rotate-45" : ""
            }`}
          />
          <span
            className={`block h-0.5 w-6 bg-foreground transition-opacity ${
              menuOpen ? "opacity-0" : ""
            }`}
          />
          <span
            className={`block h-0.5 w-6 bg-foreground transition-transform ${
              menuOpen ? "-translate-y-2 -rotate-45" : ""
            }`}
          />
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-border bg-background/95 backdrop-blur-md px-6 py-4 space-y-3">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className={`block text-sm transition-colors ${
                isActive(link.href)
                  ? "text-violet-light"
                  : "text-foreground-muted hover:text-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
