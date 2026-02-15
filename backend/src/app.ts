import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyStructuredResultV2,
} from "aws-lambda";

import { json } from "./utils/http";
import { handleProducts } from "./handlers/products";
import { handleCompare } from "./handlers/compare";
import { handleRecommendations } from "./handlers/recommendations";

export async function handler(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyStructuredResultV2> {
  const method = event.requestContext?.http?.method || "GET";
  const path = event.rawPath || "/";

  // MVP allow-all CORS
  const corsHeaders = {
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "content-type",
    "access-control-allow-methods": "GET,POST,OPTIONS",
  };
  if (method === "OPTIONS") return { statusCode: 204, headers: corsHeaders };

  try {
    if (method === "GET" && path.startsWith("/products/")) {
      const category = decodeURIComponent(path.replace("/products/", ""));
      const res = await handleProducts(event, category);
      res.headers = { ...(res.headers || {}), ...corsHeaders };
      return res;
    }

    if (method === "POST" && path === "/compare") {
      const res = await handleCompare(event);
      res.headers = { ...(res.headers || {}), ...corsHeaders };
      return res;
    }

    if (method === "POST" && path === "/recommendations") {
      const res = await handleRecommendations(event);
      res.headers = { ...(res.headers || {}), ...corsHeaders };
      return res;
    }

    return json(404, { error: "not_found", path, method });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    return json(500, { error: "internal_error", message });
  }
}
