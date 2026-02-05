import Link from "next/link";

export default function Footer({ message }: { message?: string }) {
  return (
    <footer className="border-t border-border py-8 text-center text-sm text-foreground-muted">
      {message && <p>{message}</p>}
      <p className={message ? "mt-2" : ""}>
        <Link href="/privacy" className="hover:text-foreground transition-colors">
          Privacy Policy
        </Link>
        {" "}&middot;{" "}
        <a
          href="https://x.com"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-foreground transition-colors"
        >
          𝕏
        </a>
      </p>
    </footer>
  );
}
