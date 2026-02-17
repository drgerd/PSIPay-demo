function authHeader(authToken?: string): Record<string, string> {
  if (!authToken) return {};
  return { authorization: `Bearer ${authToken}` };
}

export async function apiGet(baseUrl: string, path: string, authToken?: string) {
  const res = await fetch(`${baseUrl}${path}`, {
    method: "GET",
    headers: { accept: "application/json", ...authHeader(authToken) },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}

export async function apiPost(baseUrl: string, path: string, body: unknown, authToken?: string) {
  const res = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
      ...authHeader(authToken),
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}
