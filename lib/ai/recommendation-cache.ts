import { createHash } from "crypto";
import type { AiRecommendationInput } from "@/lib/ai/recommendation";

export const AI_RECOMMENDATION_PROMPT_VERSION = "recommendation-v1";

type CacheKeyOptions = {
  model: string;
  openaiConfigured: boolean;
  promptVersion?: string;
};

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(",")}}`;
}

export function buildAiRecommendationCacheKey(input: AiRecommendationInput, options: CacheKeyOptions) {
  const payload = stableStringify({
    input,
    model: options.model,
    openaiConfigured: options.openaiConfigured,
    promptVersion: options.promptVersion ?? AI_RECOMMENDATION_PROMPT_VERSION
  });

  return createHash("sha256").update(payload).digest("hex");
}
