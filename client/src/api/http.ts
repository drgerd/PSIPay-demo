export class ApiHttpError extends Error {
  status: number;

  constructor(status: number, body: string) {
    super(`HTTP ${status}: ${body}`);
    this.name = "ApiHttpError";
    this.status = status;
  }
}

type HeadersMap = Record<string, string>;

function authHeader(authToken?: string): Record<string, string> {
  if (!authToken) return {};
  return { authorization: `Bearer ${authToken}` };
}

function mergeHeaders(...headersList: Array<HeadersMap | undefined>): HeadersMap {
  const out: HeadersMap = {};
  for (const headers of headersList) {
    if (!headers) continue;
    Object.assign(out, headers);
  }
  return out;
}

export async function apiGet(
  baseUrl: string,
  path: string,
  authToken?: string,
  extraHeaders?: HeadersMap
) {
  const res = await fetch(`${baseUrl}${path}`, {
    method: "GET",
    headers: mergeHeaders({ accept: "application/json" }, authHeader(authToken), extraHeaders),
  });
  const text = await res.text();
  if (!res.ok) throw new ApiHttpError(res.status, text);
  return text ? JSON.parse(text) : null;
}

export async function apiPost(
  baseUrl: string,
  path: string,
  body: unknown,
  authToken?: string,
  extraHeaders?: Record<string, string>
) {
  const res = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: mergeHeaders(
      {
        "content-type": "application/json",
        accept: "application/json",
      },
      authHeader(authToken),
      extraHeaders
    ),
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new ApiHttpError(res.status, text);
  return text ? JSON.parse(text) : null;
}
