import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyStructuredResultV2,
} from "aws-lambda";

import { json, readJsonBody } from "../utils/http";

type CompareRequest = {
  category: string;
  criteria: Record<string, unknown>;
};

export async function handleCompare(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyStructuredResultV2> {
  const req = readJsonBody<CompareRequest>(event.body);
  return json(200, {
    category: req.category,
    criteria: req.criteria,
    note: "Deterministic comparison engine TODO",
  });
}
