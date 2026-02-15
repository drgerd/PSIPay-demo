import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyStructuredResultV2,
} from "aws-lambda";

import { json } from "../utils/http";

export async function handleProducts(
  _event: APIGatewayProxyEventV2,
  category: string
): Promise<APIGatewayProxyStructuredResultV2> {
  // TODO: implement real fetching (BoE + ONS CPIH) with DynamoDB cache.
  // For now, return the series codes we plan to support.
  if (category === "mortgages") {
    return json(200, {
      category,
      seriesCodes: ["IUMBV34", "IUMBV37", "IUMBV42", "IUMTLMV", "IUMBEDR"],
      historyMonths: Number(process.env.DEFAULT_HISTORY_MONTHS || "12"),
    });
  }
  if (category === "savings") {
    return json(200, {
      category,
      seriesCodes: ["CFMHSCV"],
      inflation: {
        dataset: "cpih01",
        edition: "time-series",
        version: process.env.ONS_CPIH_VERSION || "66",
        geography: "K02000001",
        aggregate: "CP00",
      },
      historyMonths: Number(process.env.DEFAULT_HISTORY_MONTHS || "12"),
    });
  }
  if (category === "credit-cards") {
    return json(200, {
      category,
      note: "Type-only guidance (no provider offers).",
      types: ["cashback", "rewards", "low-apr", "balance-transfer"],
    });
  }
  return json(404, { error: "unknown_category", category });
}
