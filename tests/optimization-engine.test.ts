import { describe, expect, it } from "vitest";
import { sampleCosts, sampleOpportunities, samplePortfolio } from "@/lib/data/sample";
import { generateScenarios } from "@/lib/optimization/engine";

describe("optimization engine", () => {
  it("generates all required scenario types", () => {
    const scenarios = generateScenarios(samplePortfolio.totalValueUsd, sampleOpportunities, sampleCosts, {
      maximumProtocolCount: 3,
      maximumAllocationPercent: 45
    });

    expect(scenarios.map((scenario) => scenario.kind)).toEqual([
      "Conservative",
      "Balanced",
      "Yield Maximized"
    ]);
  });

  it("enforces max protocol count and max allocation percentage", () => {
    const scenarios = generateScenarios(samplePortfolio.totalValueUsd, sampleOpportunities, sampleCosts, {
      maximumProtocolCount: 2,
      maximumAllocationPercent: 60
    });

    for (const scenario of scenarios) {
      expect(scenario.allocations).toHaveLength(2);
      expect(Math.max(...scenario.allocations.map((allocation) => allocation.allocationPercent))).toBeLessThanOrEqual(60);
    }
  });
});
