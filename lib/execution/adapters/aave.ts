import { AaveV3Base } from "@bgd-labs/aave-address-book";
import { encodeFunctionData, getAddress } from "viem";
import { aavePoolAbi } from "@/lib/execution/abi";
import { BASE_CHAIN_ID, BASE_NETWORK } from "@/lib/execution/config";
import {
  amountUsdToUsdcRaw,
  buildApproveStep,
  finalizeSteps,
  type ProtocolAdapter,
  validateAdapterInput
} from "@/lib/execution/adapters/shared";
import type { ExecutionStep } from "@/lib/types";

export const aaveV3BaseUsdcAdapter: ProtocolAdapter = {
  protocol: "aave-v3",
  supports(allocation) {
    return (
      allocation.chain === BASE_NETWORK &&
      allocation.symbol.toUpperCase().includes("USDC") &&
      allocation.protocol.toLowerCase().includes("aave")
    );
  },
  buildDepositSteps(input) {
    validateAdapterInput(input);
    if (!this.supports(input.allocation)) {
      throw new Error(`Aave adapter does not support ${input.allocation.protocol} ${input.allocation.symbol}.`);
    }

    const amountRaw = amountUsdToUsdcRaw(input.allocation.amountUsd);
    const usdcAddress = getAddress(input.config.baseUsdcAddress);
    const poolAddress = getAddress(AaveV3Base.POOL);
    const walletAddress = getAddress(input.walletAddress);

    const approve = buildApproveStep({
      id: `${input.allocation.opportunityId}:aave-approve`,
      protocol: "aave-v3",
      tokenAddress: usdcAddress,
      spender: poolAddress,
      amountRaw,
      amountUsd: input.allocation.amountUsd
    });

    const deposit: ExecutionStep = {
      id: `${input.allocation.opportunityId}:aave-supply`,
      type: "deposit",
      protocol: "aave-v3",
      chain: BASE_NETWORK,
      chainId: BASE_CHAIN_ID,
      tokenAddress: usdcAddress,
      tokenSymbol: "USDC",
      amountRaw: amountRaw.toString(),
      amountUsd: input.allocation.amountUsd,
      target: poolAddress,
      calldata: encodeFunctionData({
        abi: aavePoolAbi,
        functionName: "supply",
        args: [usdcAddress, amountRaw, walletAddress, 0]
      }),
      estimatedGasUsd: 3,
      simulationPassed: false,
      status: "draft"
    };

    return finalizeSteps([approve, deposit], input.config);
  }
};
