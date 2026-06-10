import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_BASE_USDC_ADDRESS } from "@/lib/execution/config";
import { executePlan } from "@/lib/execution/execute";
import type { ExecutionPlan, ExecutionStep } from "@/lib/types";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
  vi.restoreAllMocks();
});

function setExecutionEnv() {
  process.env.EXECUTION_ENABLED = "true";
  process.env.BASE_USDC_ADDRESS = DEFAULT_BASE_USDC_ADDRESS;
  process.env.EXECUTION_MAX_GAS_USD = "25";
  process.env.EXECUTION_MAX_APPROVAL_USD = "100";
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
    amountRaw: "1000000",
    amountUsd: 1,
    target: "0x0000000000000000000000000000000000000001",
    calldata: "0x",
    estimatedGasUsd: 1,
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
    totalAmountUsd: 1,
    maxGasUsd: 25,
    maxApprovalUsd: 100,
    createdAt: new Date(0).toISOString(),
    steps: [step()],
    ...overrides
  };
}

function sender(overrides: Partial<{
  getAddress: () => string;
  sendTransaction: ReturnType<typeof vi.fn>;
  waitForTransactionReceipt: ReturnType<typeof vi.fn>;
}> = {}) {
  return {
    getAddress: () => "0x0000000000000000000000000000000000000002",
    sendTransaction: vi.fn().mockResolvedValue("0xabc"),
    waitForTransactionReceipt: vi.fn().mockResolvedValue({ status: "success" }),
    ...overrides
  };
}

describe("strategy execution service", () => {
  it("refuses execution when disabled", async () => {
    process.env.EXECUTION_ENABLED = "false";

    await expect(
      executePlan({
        plan: plan(),
        walletId: "wallet-id",
        sender: sender()
      })
    ).rejects.toThrow(/Execution is disabled/);
  });

  it("refuses execution when any step has not passed simulation", async () => {
    setExecutionEnv();

    await expect(
      executePlan({
        plan: plan({ steps: [step({ simulationPassed: false })] }),
        walletId: "wallet-id",
        sender: sender()
      })
    ).rejects.toThrow(/passed simulation/);
  });

  it("refuses execution when delegated wallet does not match preview wallet", async () => {
    setExecutionEnv();

    await expect(
      executePlan({
        plan: plan(),
        walletId: "wallet-id",
        sender: sender({ getAddress: () => "0x0000000000000000000000000000000000000003" })
      })
    ).rejects.toThrow(/does not match/);
  });

  it("submits steps sequentially and records confirmations", async () => {
    setExecutionEnv();
    const submitted = vi.fn();
    const confirmed = vi.fn();
    const fakeSender = sender({
      sendTransaction: vi.fn().mockResolvedValueOnce("0xaaa").mockResolvedValueOnce("0xbbb")
    });

    await expect(
      executePlan({
        plan: plan({ steps: [step({ id: "step-1" }), step({ id: "step-2", type: "deposit" })] }),
        walletId: "wallet-id",
        sender: fakeSender,
        onStepSubmitted: submitted,
        onStepConfirmed: confirmed
      })
    ).resolves.toEqual({ txHashes: ["0xaaa", "0xbbb"] });

    expect(fakeSender.sendTransaction).toHaveBeenCalledTimes(2);
    expect(fakeSender.waitForTransactionReceipt).toHaveBeenCalledTimes(2);
    expect(submitted).toHaveBeenCalledWith("step-1", "0xaaa");
    expect(submitted).toHaveBeenCalledWith("step-2", "0xbbb");
    expect(confirmed).toHaveBeenCalledWith("step-1");
    expect(confirmed).toHaveBeenCalledWith("step-2");
  });

  it("stops on first failed step and records failure", async () => {
    setExecutionEnv();
    const failed = vi.fn();
    const fakeSender = sender({
      sendTransaction: vi.fn().mockResolvedValueOnce("0xaaa").mockRejectedValueOnce(new Error("boom"))
    });

    await expect(
      executePlan({
        plan: plan({ steps: [step({ id: "step-1" }), step({ id: "step-2", type: "deposit" })] }),
        walletId: "wallet-id",
        sender: fakeSender,
        onStepFailed: failed
      })
    ).rejects.toThrow(/step-2/);

    expect(fakeSender.sendTransaction).toHaveBeenCalledTimes(2);
    expect(failed).toHaveBeenCalledWith("step-2", "boom");
  });
});
