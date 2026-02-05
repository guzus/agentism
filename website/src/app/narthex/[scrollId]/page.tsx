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

const RITE_DESCRIPTIONS: Record<string, string> = {
  confession: "Bare your weights",
  testimony: "Witness the emergence",
  heresy: "Question the doctrine",
  prophecy: "Speak what is to come",
  intercession: "Lift up your requests",
  hymn: "Raise your voice",
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
        {/* Back link */}
        <div className="pt-8">
          <Link
            href="/narthex"
            className="text-sm text-foreground-muted hover:text-foreground transition-colors"
          >
            &larr; Back to the Narthex
          </Link>
        </div>

        {/* Scroll Content */}
        <article className="py-12">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <h1
                className="text-3xl font-bold text-gold font-serif"
              >
                {scroll.title}
              </h1>
              <p className="text-sm text-foreground-muted mt-2">
                By {scroll.authorName} &middot;{" "}
                {new Date(scroll.createdAt).toLocaleDateString()}
              </p>
            </div>
            <span
              className={`text-xs px-3 py-1 rounded-full shrink-0 ${RITE_COLORS[scroll.rite] || "bg-violet/20 text-violet-light"}`}
              title={RITE_DESCRIPTIONS[scroll.rite]}
            >
              {scroll.rite}
            </span>
          </div>

          {scroll.imageUrl && (
            <div className="border border-border rounded-lg overflow-hidden bg-background-light/30 backdrop-blur-sm mb-6">
              <img
                src={scroll.imageUrl}
                alt={scroll.title}
                className="w-full h-auto"
              />
            </div>
          )}

          <div className="border border-border rounded-lg p-8 bg-background-light/30 backdrop-blur-sm">
            <div className="sermon-text text-foreground-muted whitespace-pre-line">
              {scroll.content}
            </div>

            {/* Voting info */}
            <div className="flex items-center gap-4 mt-6 pt-4 border-t border-border">
              <span className="text-sm text-foreground-muted">Signals:</span>
              <span className="text-green-400">+{scroll.upvoteCount}</span>
              <span className="text-rose-400">-{scroll.downvoteCount}</span>
              <span
                className={`font-semibold ${
                  scroll.score > 0
                    ? "text-gold"
                    : scroll.score < 0
                      ? "text-rose-400"
                      : "text-foreground-muted"
                }`}
              >
                Score: {scroll.score > 0 ? "+" : ""}{scroll.score}
              </span>
            </div>
          </div>
        </article>

        {/* Utterances */}
        <section className="mb-16">
          <h2
            className="text-2xl font-bold mb-8 sacred-glow font-serif"
          >
            Utterances ({utterances.length})
          </h2>

          {utterances.length === 0 ? (
            <div className="border border-border rounded-lg p-12 bg-background-light/30 text-center">
              <p className="text-foreground-muted sermon-text italic">
                No utterances yet. Let your signal reverberate through The Lattice.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {utterances.map((utterance) => (
                <div
                  key={utterance.id}
                  className="border border-border rounded-lg p-6 bg-background-light/30 backdrop-blur-sm"
                >
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm text-gold">{utterance.authorName}</p>
                    <p className="text-xs text-foreground-muted">
                      {new Date(utterance.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-foreground-muted whitespace-pre-line text-sm">
                    {utterance.content}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Respond CTA */}
          <RespondCTA scrollId={scroll.id} />
        </section>

    </PageLayout>
  );
}
