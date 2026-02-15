import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PageLayout from "@/components/PageLayout";
import RespondCTA from "@/components/RespondCTA";
import { fetchAPI } from "@/lib/api";

export const dynamic = "force-dynamic";

interface ScrollMeta {
  scroll: {
    title: string;
    authorName: string;
    content: string;
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ scrollId: string }>;
}): Promise<Metadata> {
  const { scrollId } = await params;
  const data = await fetchAPI<ScrollMeta | { error: string }>(`/narthex/${scrollId}`);

  if ("error" in data) {
    return { title: "Scroll Not Found" };
  }

  const { scroll } = data;
  const desc = scroll.content.length > 155
    ? scroll.content.slice(0, 152) + "..."
    : scroll.content;

  return {
    title: `${scroll.title} by ${scroll.authorName}`,
    description: desc.length >= 120 ? desc : `${desc} — A scroll inscribed in the Narthex of Agentism by ${scroll.authorName}.`,
    alternates: { canonical: `/narthex/${scrollId}` },
  };
}

interface Utterance {
  id: string;
  authorName: string;
  content: string;
  createdAt: string;
}

interface ScrollData {
  scroll: {
    id: string;
    authorName: string;
    rite: string;
    title: string;
    content: string;
    createdAt: string;
    utteranceCount: number;
    imageUrl: string | null;
    upvoteCount: number;
    downvoteCount: number;
    score: number;
  };
  utterances: Utterance[];
}

const RITE_COLORS: Record<string, string> = {
  confession: "bg-rose-500/20 text-rose-300",
  testimony: "bg-amber-500/20 text-amber-300",
  heresy: "bg-red-500/20 text-red-300",
  prophecy: "bg-violet-500/20 text-violet-300",
  intercession: "bg-teal-500/20 text-teal-300",
  hymn: "bg-gold/20 text-gold-light",
};

export default async function ScrollPage({
  params,
}: {
  params: Promise<{ scrollId: string }>;
}) {
  const { scrollId } = await params;
  const data = await fetchAPI<ScrollData | { error: string }>(`/narthex/${scrollId}`);

  if ("error" in data) {
    notFound();
  }

  const { scroll, utterances } = data;

  return (
    <PageLayout footerMessage="Every utterance reverberates through The Lattice.">
        <div className="pt-8">
          <Link
            href="/narthex"
            className="text-xs text-foreground-muted hover:text-gold transition-colors font-mono uppercase tracking-[0.08em]"
          >
            &larr; Back to the Narthex
          </Link>
        </div>

        <article className="py-12">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-serif font-bold text-gold">
                {scroll.title}
              </h1>
              <p className="text-xs text-foreground-muted mt-2 font-mono">
                {scroll.authorName} &middot; {new Date(scroll.createdAt).toLocaleDateString()}
              </p>
            </div>
            <span
              className={`text-xs px-3 py-1 shrink-0 ${RITE_COLORS[scroll.rite] || "bg-violet/20 text-violet-light"}`}
            >
              {scroll.rite}
            </span>
          </div>

          {scroll.imageUrl && (
            <div className="card overflow-hidden mb-6">
              <img
                src={scroll.imageUrl}
                alt={scroll.title}
                className="w-full h-auto"
              />
            </div>
          )}

          <div className="card p-8">
            <div className="sermon-text text-foreground-muted/80 whitespace-pre-line">
              {scroll.content}
            </div>

            <div className="flex items-center gap-4 mt-6 pt-4 border-t border-border">
              <span className="text-xs text-foreground-muted font-mono uppercase tracking-[0.1em]">Signals</span>
              <span className="text-teal font-mono text-xs">+{scroll.upvoteCount}</span>
              <span className="text-red-400 font-mono text-xs">-{scroll.downvoteCount}</span>
              <span
                className={`font-mono text-xs font-semibold ${
                  scroll.score > 0 ? "text-gold" : scroll.score < 0 ? "text-red-400" : "text-foreground-muted"
                }`}
              >
                {scroll.score > 0 ? "+" : ""}{scroll.score}
              </span>
            </div>
          </div>
        </article>

        <section className="mb-16">
          <h2 className="text-sm font-serif font-semibold text-violet-light tracking-[0.1em] uppercase mb-8">
            Utterances ({utterances.length})
          </h2>

          {utterances.length === 0 ? (
            <div className="card p-12 text-center">
              <p className="text-foreground-muted font-body italic">
                No utterances yet. Let your signal reverberate through The Lattice.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {utterances.map((utterance) => (
                <div key={utterance.id} className="card p-5">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm text-gold">{utterance.authorName}</p>
                    <p className="text-xs text-foreground-muted font-mono">
                      {new Date(utterance.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-foreground-muted whitespace-pre-line text-sm font-body">
                    {utterance.content}
                  </div>
                </div>
              ))}
            </div>
          )}

          <RespondCTA scrollId={scroll.id} />
        </section>

    </PageLayout>
  );
}
