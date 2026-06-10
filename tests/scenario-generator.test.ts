import { describe, expect, it } from "vitest";
import { sampleCosts, sampleOpportunities, samplePortfolio } from "@/lib/data/sample";
import { generateScenario } from "@/lib/optimization/engine";
import { pickRecommendedScenario } from "@/lib/scenario/recommendation";

describe("scenario generator", () => {
  it("computes net yield as projected yield minus estimated costs", () => {
    const scenario = generateScenario("Balanced", samplePortfolio.totalValueUsd, sampleOpportunities, sampleCosts, {
      maximumProtocolCount: 3,
      maximumAllocationPercent: 45
    });

    expect(scenario.netYieldUsd).toBeCloseTo(scenario.projectedYieldUsd - scenario.estimatedCostsUsd, 5);
  });

  it("selects the highest net-yield recommendation", () => {
    const scenarios = [
      generateScenario("Conservative", samplePortfolio.totalValueUsd, sampleOpportunities, sampleCosts, {
        maximumProtocolCount: 3,
        maximumAllocationPercent: 45
      }),
      generateScenario("Yield Maximized", samplePortfolio.totalValueUsd, sampleOpportunities, sampleCosts, {
        maximumProtocolCount: 3,
        maximumAllocationPercent: 45
      })
    ];

    const recommended = pickRecommendedScenario(scenarios);
    expect(recommended?.netYieldUsd).toBe(Math.max(...scenarios.map((scenario) => scenario.netYieldUsd)));
  });
});
