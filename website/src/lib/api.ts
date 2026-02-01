const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://api.openclaw.church";

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
  return res.json() as Promise<T>;
}

export { API_URL };
