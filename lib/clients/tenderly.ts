import { sampleCosts } from "@/lib/data/sample";
import type { SwitchingCost, YieldOpportunity } from "@/lib/types";

export async function estimateSwitchingCosts(opportunities: YieldOpportunity[]): Promise<SwitchingCost[]> {
  if (process.env.USE_FIXTURES === "true" || !process.env.TENDERLY_ACCESS_KEY) {
    return opportunities.map((opportunity) => {
      const fixture = sampleCosts.find((cost) => cost.opportunityId === opportunity.id);
      if (fixture) return fixture;

      const chainMultiplier = opportunity.chain === "ethereum" ? 4 : 1;
      const gasCostUsd = chainMultiplier * 3.5;
      const depositCostUsd = chainMultiplier * 4;
      const withdrawCostUsd = chainMultiplier * 3;
      return {
        opportunityId: opportunity.id,
        depositCostUsd,
        withdrawCostUsd,
        gasCostUsd,
        totalCostUsd: depositCostUsd + withdrawCostUsd + gasCostUsd
      };
    });
  }

  // Tenderly requires protocol-specific calldata. The MVP keeps the integration boundary
  // explicit and returns deterministic estimates until transaction builders are enabled.
  return opportunities.map((opportunity) => ({
    opportunityId: opportunity.id,
    depositCostUsd: 5,
    withdrawCostUsd: 5,
    gasCostUsd: opportunity.chain === "ethereum" ? 22 : 3,
    totalCostUsd: opportunity.chain === "ethereum" ? 32 : 13
  }));
}
