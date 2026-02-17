import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

import { json, readJsonBody } from "./utils/http";
import { getProducts } from "../../../backend/src/controllers/productsController";
import { compareOptions } from "../../../backend/src/controllers/compareController";
import { recommend } from "../../../backend/src/controllers/recommendationsController";
import type { Category } from "../../../backend/src/types/contracts";

const CORS_HEADERS: Record<string, string> = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "content-type",
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

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const method = event.httpMethod || "GET";
  const path = event.path || "/";

  if (method === "OPTIONS") return withCors({ statusCode: 204, headers: CORS_HEADERS, body: "" });

  try {
    if (method === "GET" && path === "/health") {
      return withCors(json(200, { ok: true, service: "psipay-api" }));
    }

    if (method === "GET" && path.startsWith("/products/")) {
      const category = decodeURIComponent(path.replace("/products/", ""));
      if (!isCategory(category)) return errorJson(400, "invalid_category", "Category is invalid.");

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
      return withCors(json(200, data));
    }

    if (method === "POST" && path === "/compare") {
      const body = readJsonBody<{ category?: string; criteria?: Record<string, unknown> }>(event.body);
      if (!isCategory(body.category)) return errorJson(400, "invalid_category", "Category is invalid.");

      const data = await compareOptions(body.category, body.criteria || {});
      return withCors(json(200, data));
    }

    if (method === "POST" && path === "/recommendations") {
      const body = readJsonBody<{ category?: string; criteria?: Record<string, unknown> }>(event.body);
      if (!isCategory(body.category)) return errorJson(400, "invalid_category", "Category is invalid.");

      const data = await recommend(body.category, body.criteria || {});
      return withCors(json(200, data));
    }

    if (method === "GET" && path === "/recommendations") {
      const category = event.queryStringParameters?.category;
      if (!isCategory(category)) return errorJson(400, "invalid_category", "Category is required.");

      const criteria = readCriteriaFromQuery(event);
      const data = await recommend(category, criteria);
      return withCors(json(200, data));
    }

    return errorJson(404, "not_found", "Route not found.");
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    if (message === "invalid_criteria_query_json") {
      return errorJson(400, "invalid_criteria", "Query parameter 'criteria' must be valid JSON.");
    }
    return errorJson(500, "internal_error", "Request failed.");
  }
}
