import { describe, expect, it } from "vitest";
import { buildAiRecommendationCacheKey, stableStringify } from "@/lib/ai/recommendation-cache";
import type { AiRecommendationInput } from "@/lib/ai/recommendation";

const input: AiRecommendationInput = {
  portfolio: {
    walletAddress: "0xabc",
    totalValueUsd: 1000,
    weightedApy: 4,
    tokenBalances: [],
    positions: []
  },
  opportunities: [
    {
      id: "aave-v3-base-usdc",
      pool: "base-aave-usdc",
      protocol: "Aave V3",
      chain: "base",
      symbol: "USDC",
      apy: 5,
      tvlUsd: 1000000,
      stablecoin: true
    }
  ],
  scenarios: [
    {
      kind: "Balanced",
      totalAllocatedUsd: 1000,
      projectedYieldUsd: 50,
      estimatedCostsUsd: 2,
      netYieldUsd: 48,
      weightedApy: 5,
      allocations: []
    }
  ],
  constraints: {
    maximumProtocolCount: 2,
    maximumAllocationPercent: 60
  }
};

describe("AI recommendation cache", () => {
  it("stable-stringifies objects independent of key insertion order", () => {
    expect(stableStringify({ b: 2, a: 1 })).toBe(stableStringify({ a: 1, b: 2 }));
  });

  it("builds deterministic cache keys for equivalent inputs", () => {
    expect(
      buildAiRecommendationCacheKey(input, {
        model: "gpt-5.2",
        openaiConfigured: true
      })
    ).toBe(
      buildAiRecommendationCacheKey(input, {
        model: "gpt-5.2",
        openaiConfigured: true
      })
    );
  });
});
