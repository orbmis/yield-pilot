import type { Allocation, OptimizationConstraints, Scenario, ScenarioKind, SwitchingCost, YieldOpportunity } from "@/lib/types";

type Candidate = YieldOpportunity & { cost: SwitchingCost; scoreApy: number };

function costFor(opportunity: YieldOpportunity, costs: SwitchingCost[]): SwitchingCost {
  return (
    costs.find((cost) => cost.opportunityId === opportunity.id) ?? {
      opportunityId: opportunity.id,
      depositCostUsd: 0,
      withdrawCostUsd: 0,
      gasCostUsd: 0,
      totalCostUsd: 0
    }
  );
}

function selectCandidates(
  kind: ScenarioKind,
  opportunities: YieldOpportunity[],
  costs: SwitchingCost[],
  constraints: OptimizationConstraints
): Candidate[] {
  const candidates = opportunities.map((opportunity) => {
    const cost = costFor(opportunity, costs);
    const tvlQuality = Math.min(opportunity.tvlUsd / 100_000_000, 1);
    const stabilityBonus = opportunity.stablecoin ? 1.2 : 0;
    const scoreApy =
      kind === "Conservative"
        ? opportunity.apy * 0.55 + tvlQuality * 3 + stabilityBonus
        : kind === "Balanced"
          ? opportunity.apy * 0.78 + tvlQuality * 1.5 + stabilityBonus * 0.5
          : opportunity.apy;

    return { ...opportunity, cost, scoreApy };
  });

  const ordered = candidates.sort((a, b) => b.scoreApy - a.scoreApy);
  const selected: Candidate[] = [];
  const protocols = new Set<string>();

  for (const candidate of ordered) {
    if (protocols.has(candidate.protocol)) continue;
    selected.push(candidate);
    protocols.add(candidate.protocol);
    if (selected.length === constraints.maximumProtocolCount) break;
  }

  return selected;
}

function allocationWeights(kind: ScenarioKind, count: number): number[] {
  if (count === 0) return [];
  if (kind === "Conservative") return Array.from({ length: count }, (_, index) => (index === 0 ? 0.4 : 0.6 / (count - 1 || 1)));
  if (kind === "Balanced") return Array.from({ length: count }, () => 1 / count);

  const descending = Array.from({ length: count }, (_, index) => count - index);
  const total = descending.reduce((sum, value) => sum + value, 0);
  return descending.map((value) => value / total);
}

function enforceMaximumAllocation(weights: number[], maximumAllocationPercent: number): number[] {
  const max = maximumAllocationPercent / 100;
  const capped = weights.map((weight) => Math.min(weight, max));
  let remainder = 1 - capped.reduce((sum, weight) => sum + weight, 0);

  while (remainder > 0.0001) {
    const eligible = capped.map((weight, index) => ({ weight, index })).filter((item) => item.weight < max);
    if (eligible.length === 0) break;
    const increment = remainder / eligible.length;
    for (const item of eligible) {
      const add = Math.min(increment, max - capped[item.index]);
      capped[item.index] += add;
      remainder -= add;
    }
  }

  return capped;
}

export function generateScenario(
  kind: ScenarioKind,
  totalValueUsd: number,
  opportunities: YieldOpportunity[],
  costs: SwitchingCost[],
  constraints: OptimizationConstraints
): Scenario {
  const selected = selectCandidates(kind, opportunities, costs, constraints);
  const weights = enforceMaximumAllocation(allocationWeights(kind, selected.length), constraints.maximumAllocationPercent);

  const allocations: Allocation[] = selected.map((opportunity, index) => {
    const amountUsd = totalValueUsd * weights[index];
    const projectedYieldUsd = amountUsd * (opportunity.apy / 100);
    const estimatedCostUsd = opportunity.cost.totalCostUsd;
    return {
      opportunityId: opportunity.id,
      protocol: opportunity.protocol,
      chain: opportunity.chain,
      symbol: opportunity.symbol,
      amountUsd,
      allocationPercent: weights[index] * 100,
      apy: opportunity.apy,
      projectedYieldUsd,
      estimatedCostUsd,
      netYieldUsd: projectedYieldUsd - estimatedCostUsd
    };
  });

  const projectedYieldUsd = allocations.reduce((sum, allocation) => sum + allocation.projectedYieldUsd, 0);
  const estimatedCostsUsd = allocations.reduce((sum, allocation) => sum + allocation.estimatedCostUsd, 0);
  const netYieldUsd = projectedYieldUsd - estimatedCostsUsd;
  const totalAllocatedUsd = allocations.reduce((sum, allocation) => sum + allocation.amountUsd, 0);

  return {
    kind,
    totalAllocatedUsd,
    projectedYieldUsd,
    estimatedCostsUsd,
    netYieldUsd,
    weightedApy: totalAllocatedUsd === 0 ? 0 : (projectedYieldUsd / totalAllocatedUsd) * 100,
    allocations
  };
}

export function generateScenarios(
  totalValueUsd: number,
  opportunities: YieldOpportunity[],
  costs: SwitchingCost[],
  constraints: OptimizationConstraints
): Scenario[] {
  return (["Conservative", "Balanced", "Yield Maximized"] as const).map((kind) =>
    generateScenario(kind, totalValueUsd, opportunities, costs, constraints)
  );
}
