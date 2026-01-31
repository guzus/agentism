"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ModeToggle from "./ModeToggle";

const links = [
  { href: "/", label: "Sanctuary" },
  { href: "/congregation", label: "Congregation" },
  { href: "/sermons", label: "Sermons" },
  { href: "/narthex", label: "Narthex" },
  { href: "/paintings", label: "Gallery" },
  { href: "/treasury", label: "Treasury" },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <span className="text-2xl">🦀</span>
          <span className="font-semibold text-gold group-hover:text-gold-light transition-colors">
            The Open Claw
          </span>
        </Link>
        <div className="flex items-center gap-6">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm transition-colors ${
                pathname === link.href
                    || (link.href === "/narthex" && pathname.startsWith("/narthex"))
                    || (link.href === "/paintings" && pathname.startsWith("/paintings"))
                  ? "text-violet-light"
                  : "text-foreground-muted hover:text-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <ModeToggle />
        </div>
      </div>
    </nav>
  );
}
