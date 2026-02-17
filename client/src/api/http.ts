export class ApiHttpError extends Error {
  status: number;

  constructor(status: number, body: string) {
    super(`HTTP ${status}: ${body}`);
    this.name = "ApiHttpError";
    this.status = status;
  }
}

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
  if (!res.ok) throw new ApiHttpError(res.status, text);
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
  if (!res.ok) throw new ApiHttpError(res.status, text);
  return text ? JSON.parse(text) : null;
}
