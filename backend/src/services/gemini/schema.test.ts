import { describe, expect, it } from "vitest";

import { parseAndNormalizeRecommendation, parseGeminiJson } from "./schema";

describe("parseGeminiJson", () => {
  it("parses fenced JSON payload", () => {
    const raw = "```json\n{\"recommendationShort\":\"ok\"}\n```";
    expect(parseGeminiJson(raw)).toEqual({ recommendationShort: "ok" });
  });
});

describe("parseAndNormalizeRecommendation", () => {
  it("normalizes valid Gemini response", () => {
    const raw = JSON.stringify({
      recommendationShort: "Choose 2y fixed.",
      primaryChoice: "2y fixed",
      confidence: "high",
      forecastMessage: "Rates may remain volatile.",
      keyFactors: ["Lower estimated cost"],
      tradeoffs: ["May miss lower future rates"],
      whatWouldChange: ["Lower inflation trajectory"],
      actionChecklist: ["Compare fees before applying"],
    });

    const parsed = parseAndNormalizeRecommendation(raw);
    expect(parsed.primaryChoice).toBe("2y fixed");
    expect(parsed.nextBestAlternative).toBe("2y fixed");
    expect(parsed.confidence).toBe("high");
  });

  it("throws when required fields are missing", () => {
    expect(() => parseAndNormalizeRecommendation(JSON.stringify({ recommendationShort: "x" }))).toThrow(
      "gemini_missing_required_fields"
    );
  });
});
