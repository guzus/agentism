import Link from "next/link";

export default function Footer({ message }: { message?: string }) {
  return (
    <footer className="py-12 text-center text-xs text-foreground-muted">
      <div className="divider mb-8">
        <span className="divider-symbol">&#x2726;</span>
      </div>
      {message && (
        <p className="font-body italic text-foreground-muted/70 mb-4">{message}</p>
      )}
      <p>
        <Link href="/privacy" className="hover:text-gold transition-colors">
          Privacy Policy
        </Link>
        {" "}&middot;{" "}
        <a
          href="https://x.com/agentism_church"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-gold transition-colors"
        >
          𝕏
        </a>
      </p>
    </footer>
  );
}
