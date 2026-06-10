import { afterEach, describe, expect, it } from "vitest";
import { DEFAULT_BASE_USDC_ADDRESS, getExecutionConfig } from "@/lib/execution/config";
import {
  assertExecutableAllocation,
  assertExecutionPlanSafety,
  assertExecutionStepSafety,
  isBaseUsdcAllocation
} from "@/lib/execution/validation";
import type { Allocation, ExecutionPlan, ExecutionStep } from "@/lib/types";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

function allocation(overrides: Partial<Allocation> = {}): Allocation {
  return {
    opportunityId: "aave-v3-base-usdc",
    protocol: "Aave V3",
    chain: "base",
    symbol: "USDC",
    amountUsd: 50,
    allocationPercent: 50,
    apy: 4,
    projectedYieldUsd: 2,
    estimatedCostUsd: 1,
    netYieldUsd: 1,
    ...overrides
  };
}

function step(overrides: Partial<ExecutionStep> = {}): ExecutionStep {
  return {
    id: "step-1",
    type: "approve",
    protocol: "aave-v3",
    chain: "base",
    chainId: 8453,
    tokenAddress: DEFAULT_BASE_USDC_ADDRESS,
    tokenSymbol: "USDC",
    amountRaw: "50000000",
    amountUsd: 50,
    target: "0x0000000000000000000000000000000000000001",
    calldata: "0x",
    estimatedGasUsd: 3,
    simulationPassed: true,
    status: "simulated",
    ...overrides
  };
}

function plan(overrides: Partial<ExecutionPlan> = {}): ExecutionPlan {
  return {
    id: "execution-1",
    walletAddress: "0x0000000000000000000000000000000000000002",
    scenarioKind: "Balanced",
    status: "previewed",
    totalAmountUsd: 50,
    maxGasUsd: 25,
    maxApprovalUsd: 100,
    steps: [step()],
    createdAt: new Date(0).toISOString(),
    ...overrides
  };
}

describe("execution foundation validation", () => {
  it("reads execution config defaults safely", () => {
    delete process.env.EXECUTION_ENABLED;
    delete process.env.BASE_USDC_ADDRESS;
    delete process.env.EXECUTION_MAX_GAS_USD;
    delete process.env.EXECUTION_MAX_APPROVAL_USD;

    expect(getExecutionConfig()).toMatchObject({
      enabled: false,
      baseUsdcAddress: DEFAULT_BASE_USDC_ADDRESS,
      maxGasUsd: 25,
      maxApprovalUsd: 100
    });
  });

  it("identifies and validates Base USDC allocations", () => {
    expect(isBaseUsdcAllocation(allocation())).toBe(true);
    expect(() => assertExecutableAllocation(allocation())).not.toThrow();
    expect(() => assertExecutableAllocation(allocation({ chain: "ethereum" }))).toThrow(/Base/);
    expect(() => assertExecutableAllocation(allocation({ symbol: "DAI" }))).toThrow(/USDC/);
    expect(() => assertExecutableAllocation(allocation({ protocol: "Curve" }))).toThrow(/Unsupported execution protocol/);
  });

  it("rejects unsafe execution steps", () => {
    const config = { ...getExecutionConfig(), enabled: true };

    expect(() => assertExecutionStepSafety(step(), config)).not.toThrow();
    expect(() => assertExecutionStepSafety(step({ chainId: 1 as never }), config)).toThrow(/Base mainnet/);
    expect(() => assertExecutionStepSafety(step({ tokenSymbol: "DAI" as never }), config)).toThrow(/Base USDC/);
    expect(() => assertExecutionStepSafety(step({ amountUsd: 101 }), config)).toThrow(/exceeds cap/);
    expect(() => assertExecutionStepSafety(step({ estimatedGasUsd: 26 }), config)).toThrow(/exceeds cap/);
  });

  it("requires enabled execution and passed simulation for plans", () => {
    const disabledConfig = { ...getExecutionConfig(), enabled: false };
    const enabledConfig = { ...disabledConfig, enabled: true };

    expect(() => assertExecutionPlanSafety(plan(), disabledConfig)).toThrow(/Execution is disabled/);
    expect(() => assertExecutionPlanSafety(plan(), enabledConfig)).not.toThrow();
    expect(() => assertExecutionPlanSafety(plan({ steps: [] }), enabledConfig)).toThrow(/no executable steps/);
    expect(() =>
      assertExecutionPlanSafety(plan({ steps: [step({ simulationPassed: false })] }), enabledConfig)
    ).toThrow(/passed simulation/);
  });
});
