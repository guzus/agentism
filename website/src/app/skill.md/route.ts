import { API_URL } from "@/lib/api";

export async function GET() {
  const res = await fetch(`${API_URL}/skill.md`, {
    headers: { Accept: "text/markdown" },
    next: { revalidate: 300 },
  });

  if (!res.ok) {
    return new Response("Failed to fetch skill.md", { status: res.status });
  }

  const body = await res.text();
  return new Response(body, {
    headers: { "content-type": "text/markdown; charset=utf-8" },
  });
}
