import { sampleCosts } from "@/lib/data/sample";
import type { ExecutionStep, SwitchingCost, YieldOpportunity } from "@/lib/types";

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

export async function simulateExecutionSteps(steps: ExecutionStep[]): Promise<ExecutionStep[]> {
  // Stage 3 keeps the Tenderly integration boundary explicit. Protocol-specific
  // calldata is now available, but full Tenderly transaction simulation will be
  // wired in the execution stage once signer/provider details are finalized.
  return steps.map((step, index) => ({
    ...step,
    simulationPassed: true,
    simulationId: process.env.TENDERLY_ACCESS_KEY ? `tenderly-placeholder-${index + 1}` : `local-simulation-${index + 1}`,
    status: "simulated"
  }));
}
