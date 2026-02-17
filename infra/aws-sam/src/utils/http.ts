import type { APIGatewayProxyResult } from "aws-lambda";

export function json(
  statusCode: number,
  body: unknown,
  headers: Record<string, string> = {}
): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...headers,
    },
    body: JSON.stringify(body),
  };
}

export function readJsonBody<T>(rawBody: string | undefined | null): T {
  if (!rawBody) throw new Error("missing_body");
  return JSON.parse(rawBody) as T;
}
