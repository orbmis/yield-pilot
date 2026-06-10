import { encodeFunctionData, getAddress } from "viem";
import { erc4626VaultAbi } from "@/lib/execution/abi";
import { BASE_CHAIN_ID, BASE_NETWORK } from "@/lib/execution/config";
import {
  amountUsdToUsdcRaw,
  buildApproveStep,
  finalizeSteps,
  type ProtocolAdapter,
  validateAdapterInput
} from "@/lib/execution/adapters/shared";
import type { ExecutionStep } from "@/lib/types";

export const morphoBaseUsdcAdapter: ProtocolAdapter = {
  protocol: "morpho",
  supports(allocation) {
    return (
      allocation.chain === BASE_NETWORK &&
      allocation.symbol.toUpperCase().includes("USDC") &&
      allocation.protocol.toLowerCase().includes("morpho")
    );
  },
  buildDepositSteps(input) {
    validateAdapterInput(input);
    if (!this.supports(input.allocation)) {
      throw new Error(`Morpho adapter does not support ${input.allocation.protocol} ${input.allocation.symbol}.`);
    }

    if (!input.config.morphoBaseUsdcVaultAddress) {
      throw new Error("MORPHO_BASE_USDC_VAULT_ADDRESS is required for Morpho execution.");
    }

    const amountRaw = amountUsdToUsdcRaw(input.allocation.amountUsd);
    const usdcAddress = getAddress(input.config.baseUsdcAddress);
    const vaultAddress = getAddress(input.config.morphoBaseUsdcVaultAddress);
    const walletAddress = getAddress(input.walletAddress);

    const approve = buildApproveStep({
      id: `${input.allocation.opportunityId}:morpho-approve`,
      protocol: "morpho",
      tokenAddress: usdcAddress,
      spender: vaultAddress,
      amountRaw,
      amountUsd: input.allocation.amountUsd
    });

    const deposit: ExecutionStep = {
      id: `${input.allocation.opportunityId}:morpho-deposit`,
      type: "deposit",
      protocol: "morpho",
      chain: BASE_NETWORK,
      chainId: BASE_CHAIN_ID,
      tokenAddress: usdcAddress,
      tokenSymbol: "USDC",
      amountRaw: amountRaw.toString(),
      amountUsd: input.allocation.amountUsd,
      target: vaultAddress,
      calldata: encodeFunctionData({
        abi: erc4626VaultAbi,
        functionName: "deposit",
        args: [amountRaw, walletAddress]
      }),
      estimatedGasUsd: 3,
      simulationPassed: false,
      status: "draft"
    };

    return finalizeSteps([approve, deposit], input.config);
  }
};
