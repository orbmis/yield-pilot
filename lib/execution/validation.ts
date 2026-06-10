import { BASE_CHAIN_ID, BASE_NETWORK, type ExecutionConfig } from "@/lib/execution/config";
import type { Allocation, ExecutionPlan, ExecutionStep } from "@/lib/types";

export function isBaseUsdcAllocation(allocation: Allocation, baseUsdcSymbol = "USDC") {
  return allocation.chain === BASE_NETWORK && allocation.symbol.toUpperCase().includes(baseUsdcSymbol);
}

export function assertExecutableAllocation(allocation: Allocation) {
  if (allocation.chain !== BASE_NETWORK) {
    throw new Error(`Unsupported execution chain: ${allocation.chain}. V1 only supports Base.`);
  }

  if (!allocation.symbol.toUpperCase().includes("USDC")) {
    throw new Error(`Unsupported execution asset: ${allocation.symbol}. V1 only supports USDC.`);
  }

  const protocol = allocation.protocol.toLowerCase();
  if (!protocol.includes("aave") && !protocol.includes("morpho")) {
    throw new Error(`Unsupported execution protocol: ${allocation.protocol}.`);
  }
}

export function assertExecutionStepSafety(step: ExecutionStep, config: ExecutionConfig) {
  if (step.chainId !== BASE_CHAIN_ID || step.chain !== BASE_NETWORK) {
    throw new Error("Execution step must target Base mainnet.");
  }

  if (step.tokenSymbol !== "USDC" || step.tokenAddress.toLowerCase() !== config.baseUsdcAddress.toLowerCase()) {
    throw new Error("Execution step must use configured Base USDC.");
  }

  if (step.type === "approve" && step.amountUsd > config.maxApprovalUsd) {
    throw new Error(`Approval amount ${step.amountUsd} exceeds cap ${config.maxApprovalUsd}.`);
  }

  if (step.estimatedGasUsd > config.maxGasUsd) {
    throw new Error(`Estimated gas ${step.estimatedGasUsd} exceeds cap ${config.maxGasUsd}.`);
  }
}

export function assertExecutionPlanSafety(plan: ExecutionPlan, config: ExecutionConfig) {
  if (!config.enabled) {
    throw new Error("Execution is disabled. Set EXECUTION_ENABLED=true to allow live strategy execution.");
  }

  if (plan.steps.length === 0) {
    throw new Error("Execution plan has no executable steps.");
  }

  for (const step of plan.steps) {
    assertExecutionStepSafety(step, config);
    if (!step.simulationPassed) {
      throw new Error(`Execution step ${step.id} has not passed simulation.`);
    }
  }
}
