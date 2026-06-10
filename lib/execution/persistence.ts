import type { Prisma } from "@prisma/client";
import type { ExecutionPlan, ScenarioKind } from "@/lib/types";

export type StrategyExecutionWithSteps = Prisma.StrategyExecutionGetPayload<{
  include: { steps: true };
}>;

export function toExecutionPlan(record: StrategyExecutionWithSteps): ExecutionPlan {
  return {
    id: record.id,
    walletAddress: record.walletAddress,
    scenarioKind: record.scenarioKind as ScenarioKind,
    status: record.status as ExecutionPlan["status"],
    totalAmountUsd: Number(record.totalAmountUsd),
    maxGasUsd: Number(record.maxGasUsd),
    maxApprovalUsd: Number(record.maxApprovalUsd),
    createdAt: record.createdAt.toISOString(),
    approvedAt: record.approvedAt?.toISOString(),
    executedAt: record.executedAt?.toISOString(),
    steps: record.steps.map((step) => ({
      id: step.id,
      type: step.stepType as ExecutionPlan["steps"][number]["type"],
      protocol: step.protocol as ExecutionPlan["steps"][number]["protocol"],
      chain: "base",
      chainId: 8453,
      tokenAddress: step.tokenAddress,
      tokenSymbol: "USDC",
      amountRaw: step.amountRaw,
      amountUsd: Number(step.amountUsd),
      target: step.target,
      calldata: step.calldata,
      estimatedGasUsd: Number(step.estimatedGasUsd),
      simulationPassed: step.simulationPassed,
      simulationId: step.simulationId ?? undefined,
      txHash: step.txHash ?? undefined,
      status: step.status as ExecutionPlan["steps"][number]["status"]
    }))
  };
}
