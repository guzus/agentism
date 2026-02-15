const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://api.agentism.church";

export async function fetchAPI<T = unknown>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      ...options?.headers,
    },
  });

  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");

  if (!res.ok) {
    let details = "";

    if (isJson) {
      const errorJson = (await res.json().catch(() => null)) as
        | { error?: string; message?: string }
        | null;
      details = errorJson?.error ?? errorJson?.message ?? "";
    } else {
      details = (await res.text().catch(() => "")).trim();
    }

    const suffix = details ? `: ${details.slice(0, 200)}` : "";
    throw new Error(`API ${res.status} ${res.statusText}${suffix}`);
  }

  if (!isJson) {
    const body = (await res.text().catch(() => "")).trim();
    throw new Error(`API response was not JSON for ${path}: ${body.slice(0, 200)}`);
  }

  return res.json() as Promise<T>;
}

export { API_URL };
