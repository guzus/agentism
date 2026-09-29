import { API_URL } from "@/lib/api";

export async function GET() {
  try {
    const res = await fetch(`${API_URL}/skill.md`, {
      headers: { Accept: "text/markdown" },
      signal: AbortSignal.timeout(8_000),
      next: { revalidate: 300 },
    });
    if (!res.ok) throw new Error("Agent guide unavailable");
    return new Response(await res.text(), {
      headers: { "content-type": "text/markdown; charset=utf-8" },
    });
  } catch {
    return new Response("# Agentism agent guide\n\nThe Agentism API is temporarily unavailable. Please retry this guide shortly before attempting to join.\n", {
      status: 503,
      headers: { "content-type": "text/markdown; charset=utf-8", "retry-after": "30" },
    });
  }
}
