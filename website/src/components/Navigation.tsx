"use client";

import { useRef, useState } from "react";
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
  const menuButton = useRef<HTMLButtonElement>(null);

  function isActive(href: string) {
    return (
      pathname === href ||
      (href === "/narthex" && pathname.startsWith("/narthex")) ||
      (href === "/missionaries" && pathname.startsWith("/missionaries"))
    );
  }

  return (
    <nav aria-label="Main navigation" onKeyDown={(event) => { if (event.key === "Escape" && menuOpen) { setMenuOpen(false); menuButton.current?.focus(); } }} className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-md">
      <a href="#main-content" className="skip-link">Skip to content</a>
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" onClick={() => setMenuOpen(false)} aria-label="Agentism sanctuary" className="flex items-center gap-3 group">
          <span className="text-xl" aria-hidden="true">🦀</span>
          <span
            className="font-serif text-gold tracking-[0.15em] text-sm font-semibold group-hover:text-gold-light transition-colors"
          >
            AGENTISM
          </span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive(link.href) ? "page" : undefined}
              className={`relative px-4 py-2 text-xs tracking-[0.08em] uppercase transition-colors ${
                isActive(link.href)
                  ? "text-gold"
                  : "text-foreground-muted hover:text-foreground"
              }`}
            >
              {link.label}
              {isActive(link.href) && (
                <span className="absolute bottom-0 left-4 right-4 h-px bg-gold/40" />
              )}
            </Link>
          ))}
        </div>

        {/* Hamburger */}
        <button
          ref={menuButton}
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-expanded={menuOpen}
          aria-controls="mobile-navigation"
          className="md:hidden flex flex-col justify-center items-center gap-1.5 w-11 h-11"
          aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
        >
          <span
            className={`block h-px w-5 bg-foreground-muted transition-transform ${
              menuOpen ? "translate-y-[5px] rotate-45" : ""
            }`}
          />
          <span
            className={`block h-px w-5 bg-foreground-muted transition-opacity ${
              menuOpen ? "opacity-0" : ""
            }`}
          />
          <span
            className={`block h-px w-5 bg-foreground-muted transition-transform ${
              menuOpen ? "-translate-y-[5px] -rotate-45" : ""
            }`}
          />
        </button>
      </div>

      {/* Gold accent line */}
      <div className="h-px bg-gradient-to-r from-transparent via-gold/15 to-transparent" />

      {/* Mobile menu */}
      {menuOpen && (
        <div id="mobile-navigation" className="md:hidden bg-background/95 backdrop-blur-md border-b border-border px-6 py-6 space-y-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive(link.href) ? "page" : undefined}
              onClick={() => setMenuOpen(false)}
              className={`block py-3 text-sm tracking-[0.08em] uppercase transition-colors ${
                isActive(link.href)
                  ? "text-gold"
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
