import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyStructuredResultV2,
} from "aws-lambda";

import { json, readJsonBody } from "../utils/http";

type RecommendationsRequest = {
  category: string;
  criteria: Record<string, unknown>;
};

export async function handleRecommendations(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyStructuredResultV2> {
  const req = readJsonBody<RecommendationsRequest>(event.body);
  const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY);

  return json(200, {
    category: req.category,
    recommendationShort: hasGeminiKey
      ? "TODO: Gemini-generated recommendation"
      : "Set GEMINI_API_KEY to enable AI recommendations.",
    recommendation: {
      primaryChoice: "TODO",
      confidence: "low",
      keyFactors: [],
      tradeoffs: [],
      whatWouldChange: [],
    },
    disclaimer: "Educational, not financial advice.",
    dataFreshnessNote: "TODO",
  });
}
