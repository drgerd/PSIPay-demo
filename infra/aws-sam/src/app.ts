import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

import { json, readJsonBody } from "./utils/http";
import { getProducts } from "../../../backend/src/controllers/productsController";
import { compareOptions } from "../../../backend/src/controllers/compareController";
import { recommend } from "../../../backend/src/controllers/recommendationsController";
import type { Category } from "../../../backend/src/types/contracts";
import { validateCriteriaByCategory } from "../../../backend/src/validation/criteria";

const CORS_HEADERS: Record<string, string> = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "content-type,authorization,x-gemini-api-key",
  "access-control-allow-methods": "GET,POST,OPTIONS",
};

function withCors(res: APIGatewayProxyResult): APIGatewayProxyResult {
  return { ...res, headers: { ...(res.headers || {}), ...CORS_HEADERS } };
}

function errorJson(
  statusCode: number,
  errorCode: string,
  message: string,
  details?: Record<string, unknown>
): APIGatewayProxyResult {
  return withCors(
    json(statusCode, {
      errorCode,
      message,
      ...(details ? { details } : {}),
    })
  );
}

function isCategory(value: unknown): value is Category {
  return value === "mortgages" || value === "savings" || value === "credit-cards";
}

function readPositiveIntQueryParam(
  event: APIGatewayProxyEvent,
  name: string,
  min: number,
  max: number
): number | undefined {
  const raw = event.queryStringParameters?.[name];
  if (!raw) return undefined;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return undefined;
  return Math.max(min, Math.min(max, n));
}

function readCriteriaFromQuery(event: APIGatewayProxyEvent): Record<string, unknown> {
  const raw = event.queryStringParameters?.criteria;
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object") return parsed as Record<string, unknown>;
    return {};
  } catch {
    throw new Error("invalid_criteria_query_json");
  }
}

function readGeminiApiKeyOverride(event: APIGatewayProxyEvent): string | undefined {
  const headers = event.headers || {};
  const raw = headers["x-gemini-api-key"] || headers["X-Gemini-Api-Key"];
  if (!raw) return undefined;
  const value = String(raw).trim();
  return value ? value : undefined;
}

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const method = event.httpMethod || "GET";
  const path = event.path || "/";
  const startedAt = Date.now();

  function done(response: APIGatewayProxyResult): APIGatewayProxyResult {
    const durationMs = Date.now() - startedAt;
    const status = response.statusCode;
    console.info(
      JSON.stringify({
        event: "request_complete",
        method,
        path,
        status,
        durationMs,
      })
    );
    return response;
  }

  if (method === "OPTIONS") return done(withCors({ statusCode: 204, headers: CORS_HEADERS, body: "" }));

  try {
    if (method === "GET" && path === "/health") {
      return done(withCors(json(200, { ok: true, service: "psipay-api" })));
    }

    if (method === "GET" && path.startsWith("/products/")) {
      const category = decodeURIComponent(path.replace("/products/", ""));
      if (!isCategory(category)) return done(errorJson(400, "invalid_category", "Category is invalid."));

      const horizonMonths = readPositiveIntQueryParam(event, "horizonMonths", 1, 360);

      const data = await getProducts(
        category,
        {
          from: event.queryStringParameters?.from,
          to: event.queryStringParameters?.to,
        },
        {
          months: horizonMonths,
        }
      );
      return done(withCors(json(200, data)));
    }

    if (method === "POST" && path === "/compare") {
      const body = readJsonBody<{ category?: string; criteria?: Record<string, unknown> }>(event.body);
      if (!isCategory(body.category)) return done(errorJson(400, "invalid_category", "Category is invalid."));

      const validation = validateCriteriaByCategory(body.category, body.criteria || {});
      if (!validation.ok) return done(errorJson(400, validation.errorCode, validation.message));

      const data = await compareOptions(body.category, body.criteria || {});
      return done(withCors(json(200, data)));
    }

    if (method === "GET" && path === "/recommendations") {
      const category = event.queryStringParameters?.category;
      if (!isCategory(category)) return done(errorJson(400, "invalid_category", "Category is required."));

      const criteria = readCriteriaFromQuery(event);
      const validation = validateCriteriaByCategory(category, criteria);
      if (!validation.ok) return done(errorJson(400, validation.errorCode, validation.message));

      const data = await recommend(category, criteria, {
        geminiApiKeyOverride: readGeminiApiKeyOverride(event),
      });
      return done(withCors(json(200, data)));
    }

    return done(errorJson(404, "not_found", "Route not found."));
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    console.error(
      JSON.stringify({
        event: "request_failed",
        method,
        path,
        message,
      })
    );
    if (message === "invalid_criteria_query_json") {
      return done(errorJson(400, "invalid_criteria", "Query parameter 'criteria' must be valid JSON."));
    }
    if (message === "missing_body") {
      return done(errorJson(400, "missing_body", "Request body is required."));
    }
    return done(errorJson(500, "internal_error", "Request failed."));
  }
}
