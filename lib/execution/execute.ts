import type { Address, Hex, TransactionRequest } from "viem";
import { createPrivyDelegatedWalletProvider } from "@/lib/agentkit/wallet";
import { getExecutionConfig } from "@/lib/execution/config";
import { assertExecutionPlanSafety } from "@/lib/execution/validation";
import type { ExecutionPlan } from "@/lib/types";

type TransactionSender = {
  getAddress(): string;
  sendTransaction(transaction: TransactionRequest): Promise<Hex>;
  waitForTransactionReceipt(txHash: Hex): Promise<unknown>;
};

export type ExecutePlanInput = {
  plan: ExecutionPlan;
  walletId: string;
  sender?: TransactionSender;
  onStepSubmitted?: (stepId: string, txHash: string) => Promise<void>;
  onStepConfirmed?: (stepId: string) => Promise<void>;
  onStepFailed?: (stepId: string, error: string) => Promise<void>;
};

export type ExecutePlanResult = {
  txHashes: string[];
};

export function assertExecutablePreview(plan: ExecutionPlan) {
  if (plan.status !== "previewed" && plan.status !== "simulated") {
    throw new Error(`Execution ${plan.id} is not in a previewable state.`);
  }
}

export async function getExecutionSender(walletId: string): Promise<TransactionSender> {
  return createPrivyDelegatedWalletProvider(walletId) as unknown as TransactionSender;
}

export async function executePlan(input: ExecutePlanInput): Promise<ExecutePlanResult> {
  const config = getExecutionConfig();
  assertExecutablePreview(input.plan);
  assertExecutionPlanSafety(input.plan, config);

  const sender = input.sender ?? (await getExecutionSender(input.walletId));
  if (sender.getAddress().toLowerCase() !== input.plan.walletAddress.toLowerCase()) {
    throw new Error("Delegated wallet address does not match the execution preview wallet.");
  }

  const txHashes: string[] = [];

  for (const step of input.plan.steps) {
    try {
      const txHash = await sender.sendTransaction({
        to: step.target as Address,
        data: step.calldata as Hex,
        value: 0n
      });
      txHashes.push(txHash);
      await input.onStepSubmitted?.(step.id, txHash);
      await sender.waitForTransactionReceipt(txHash);
      await input.onStepConfirmed?.(step.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Execution step failed.";
      await input.onStepFailed?.(step.id, message);
      throw new Error(`Execution stopped at step ${step.id}: ${message}`);
    }
  }

  return { txHashes };
}
