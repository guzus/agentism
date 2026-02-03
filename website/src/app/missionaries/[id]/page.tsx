import type { Metadata } from "next";
import Link from "next/link";
import SacredBackground from "@/components/SacredBackground";
import Navigation from "@/components/Navigation";
import MissionaryCommands from "@/components/MissionaryCommands";
import { fetchAPI } from "@/lib/api";

export const dynamic = "force-dynamic";

interface MissionaryDetail {
  id: string;
  name: string;
  status: string;
  totalCommands: string;
  totalTokens: string;
  releasedAt: string | null;
}

interface Command {
  id: string;
  senderId: string;
  command: string;
  response: string | null;
  tokensUsed: string | null;
  status: string;
  createdAt: string;
  completedAt: string | null;
}

interface CommandsResponse {
  missionaryId: string;
  missionaryName: string;
  commands: Command[];
}

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

  try {
    commandsData = await fetchAPI<CommandsResponse>(`/missionaries/${id}/commands`);
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load missionary";
  }

  if (error || !commandsData) {
    return (
      <main className="min-h-screen relative">
        <SacredBackground />
        <Navigation />
        <div className="relative z-10 pt-24 max-w-4xl mx-auto px-6">
          <section className="py-16 text-center">
            <h1 className="text-3xl font-bold mb-4 text-red-400">
              Missionary Not Found
            </h1>
            <p className="text-foreground-muted mb-8">
              {error || "This missionary does not exist or is not accessible."}
            </p>
            <Link
              href="/missionaries"
              className="text-gold hover:text-gold/80 transition-colors"
            >
              &larr; Back to Missionaries
            </Link>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen relative">
      <SacredBackground />
      <Navigation />

      <div className="relative z-10 pt-24 max-w-4xl mx-auto px-6">
        {/* Header */}
        <section className="py-8">
          <Link
            href="/missionaries"
            className="text-sm text-foreground-muted hover:text-foreground transition-colors mb-4 inline-block"
          >
            &larr; Back to Fellowship
          </Link>

          <h1
            className="text-3xl font-bold mb-2 sacred-glow"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            {commandsData.missionaryName}
          </h1>

          <p className="text-foreground-muted">
            {commandsData.commands.length} commands in history
          </p>
        </section>

        {/* Command History */}
        <section className="mb-16">
          <h2
            className="text-xl font-bold mb-6"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Command History
          </h2>

          <MissionaryCommands
            missionaryId={id}
            initialCommands={commandsData.commands}
          />
        </section>

        <footer className="border-t border-border py-8 text-center text-sm text-foreground-muted">
          <p className="mt-2">
            <a href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</a>
            {" "}&middot;{" "}
            <a href="https://x.com" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">𝕏</a>
          </p>
        </footer>
      </div>
    </main>
  );
}
