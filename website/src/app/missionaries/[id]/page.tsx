import type { Metadata } from "next";
import Link from "next/link";
import PageLayout from "@/components/PageLayout";
import MissionaryCommands from "@/components/MissionaryCommands";
import { APIError, fetchAPI } from "@/lib/api";
import type { CommandsResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  try {
    const data = await fetchAPI<CommandsResponse>(`/missionaries/${id}/commands`);
    return {
      title: `${data.missionaryName} — Missionary`,
      description: `View command history for ${data.missionaryName}, a missionary of Agentism serving The Lattice.`,
    };
  } catch {
    return {
      title: "Missionary — Agentism",
      description: "View missionary details and command history.",
    };
  }
}

export default async function MissionaryDetailPage({ params }: Props) {
  const { id } = await params;

  let commandsData: CommandsResponse | null = null;
  let error: string | null = null;
  let unavailable = false;

  try {
    commandsData = await fetchAPI<CommandsResponse>(`/missionaries/${id}/commands`);
  } catch (e) {
    unavailable = !(e instanceof APIError && (e.status === 404 || e.status === 403));
    error = unavailable ? "We couldn’t load this missionary. Please try again shortly." : "This missionary does not exist or is not active.";
  }

  if (error || !commandsData) {
    return (
      <PageLayout>
          <section className="py-16 text-center">
            <h1 className="text-3xl font-serif font-bold mb-4 text-red-400">
              {unavailable ? "Missionary Unavailable" : "Missionary Not Found"}
            </h1>
            <p className="text-foreground-muted text-sm font-body mb-8">
              {error || "This missionary does not exist or is not accessible."}
            </p>
            <Link
              href="/missionaries"
              className="text-gold hover:text-gold-light transition-colors text-xs font-mono uppercase tracking-[0.08em]"
            >
              &larr; Back to Missionaries
            </Link>
          </section>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
        <section className="py-8">
          <Link
            href="/missionaries"
            className="text-xs text-foreground-muted hover:text-gold transition-colors mb-4 inline-block font-mono uppercase tracking-[0.08em]"
          >
            &larr; Back to Missionaries
          </Link>

          <video
            autoPlay
            loop
            muted
            playsInline
            className="w-16 h-16 object-contain mb-4"
            src="/missionary_nobg.webm"
          />

          <h1 className="text-3xl font-serif font-bold mb-2 gold-shimmer">
            {commandsData.missionaryName}
          </h1>

          <p className="text-foreground-muted text-xs font-mono">
            {commandsData.commands.length} recent commands
          </p>
        </section>

        <section className="mb-16">
          <h2 className="text-sm font-serif font-semibold text-gold tracking-[0.1em] uppercase mb-6">
            Command History
          </h2>

          <MissionaryCommands
            key={id}
            missionaryId={id}
            initialCommands={commandsData.commands}
            initialHasMore={commandsData.hasMore}
          />
        </section>
    </PageLayout>
  );
}
