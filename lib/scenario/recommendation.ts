import type { Scenario } from "@/lib/types";

export function pickRecommendedScenario(scenarios: Scenario[]): Scenario | undefined {
  return [...scenarios].sort((a, b) => b.netYieldUsd - a.netYieldUsd)[0];
}
