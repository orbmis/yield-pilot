import { encodeFunctionData, getAddress, parseUnits, type Address } from "viem";
import { erc20Abi } from "@/lib/execution/abi";
import { BASE_CHAIN_ID, BASE_NETWORK, type ExecutionConfig } from "@/lib/execution/config";
import { assertExecutableAllocation, assertExecutionStepSafety } from "@/lib/execution/validation";
import type { Allocation, ExecutableProtocol, ExecutionStep } from "@/lib/types";

export type BuildExecutionStepsInput = {
  allocation: Allocation;
  walletAddress: string;
  config: ExecutionConfig;
};

export type ProtocolAdapter = {
  protocol: ExecutableProtocol;
  supports(allocation: Allocation): boolean;
  buildDepositSteps(input: BuildExecutionStepsInput): ExecutionStep[];
};

export function amountUsdToUsdcRaw(amountUsd: number) {
  if (!Number.isFinite(amountUsd) || amountUsd <= 0) {
    throw new Error("Allocation amount must be a positive USD value.");
  }

  return parseUnits(amountUsd.toFixed(6), 6);
}

export function buildApproveStep(params: {
  id: string;
  protocol: ExecutableProtocol;
  tokenAddress: string;
  spender: string;
  amountRaw: bigint;
  amountUsd: number;
  estimatedGasUsd?: number;
}): ExecutionStep {
  const target = getAddress(params.tokenAddress);
  const spender = getAddress(params.spender);
  const step: ExecutionStep = {
    id: params.id,
    type: "approve",
    protocol: params.protocol,
    chain: BASE_NETWORK,
    chainId: BASE_CHAIN_ID,
    tokenAddress: target,
    tokenSymbol: "USDC",
    amountRaw: params.amountRaw.toString(),
    amountUsd: params.amountUsd,
    target,
    calldata: encodeFunctionData({
      abi: erc20Abi,
      functionName: "approve",
      args: [spender, params.amountRaw]
    }),
    estimatedGasUsd: params.estimatedGasUsd ?? 1,
    simulationPassed: false,
    status: "draft"
  };

  return step;
}

export function validateAdapterInput(input: BuildExecutionStepsInput) {
  assertExecutableAllocation(input.allocation);
  getAddress(input.walletAddress as Address);
}

export function finalizeSteps(steps: ExecutionStep[], config: ExecutionConfig) {
  for (const step of steps) {
    assertExecutionStepSafety(step, config);
  }

  return steps;
}
