import { AaveV3Base } from "@bgd-labs/aave-address-book";
import { decodeFunctionData, getAddress } from "viem";
import { describe, expect, it } from "vitest";
import { aavePoolAbi, erc20Abi, erc4626VaultAbi } from "@/lib/execution/abi";
import { DEFAULT_BASE_USDC_ADDRESS, type ExecutionConfig } from "@/lib/execution/config";
import { aaveV3BaseUsdcAdapter } from "@/lib/execution/adapters/aave";
import { buildExecutionStepsForAllocation } from "@/lib/execution/adapters";
import { morphoBaseUsdcAdapter } from "@/lib/execution/adapters/morpho";
import type { Allocation } from "@/lib/types";

const walletAddress = "0x0000000000000000000000000000000000000002";
const morphoVaultAddress = "0xeE8F4eC5672F09119b96Ab6fB59C27E1b7e44b61";

const config: ExecutionConfig = {
  enabled: true,
  baseRpcUrl: "https://mainnet.base.org",
  baseUsdcAddress: DEFAULT_BASE_USDC_ADDRESS,
  morphoBaseUsdcVaultAddress: morphoVaultAddress,
  maxGasUsd: 25,
  maxApprovalUsd: 100
};

function allocation(overrides: Partial<Allocation> = {}): Allocation {
  return {
    opportunityId: "aave-v3-base-usdc",
    protocol: "Aave V3",
    chain: "base",
    symbol: "USDC",
    amountUsd: 12.345678,
    allocationPercent: 50,
    apy: 4,
    projectedYieldUsd: 2,
    estimatedCostUsd: 1,
    netYieldUsd: 1,
    ...overrides
  };
}

describe("execution protocol adapters", () => {
  it("builds Aave approval and supply calldata for Base USDC", () => {
    const steps = aaveV3BaseUsdcAdapter.buildDepositSteps({
      allocation: allocation(),
      walletAddress,
      config
    });

    expect(steps).toHaveLength(2);
    expect(steps.map((step) => step.type)).toEqual(["approve", "deposit"]);
    expect(steps[0]).toMatchObject({
      protocol: "aave-v3",
      chain: "base",
      chainId: 8453,
      tokenAddress: getAddress(DEFAULT_BASE_USDC_ADDRESS),
      target: getAddress(DEFAULT_BASE_USDC_ADDRESS),
      amountRaw: "12345678",
      amountUsd: 12.345678
    });
    expect(steps[1]).toMatchObject({
      protocol: "aave-v3",
      target: getAddress(AaveV3Base.POOL),
      amountRaw: "12345678"
    });

    const approve = decodeFunctionData({ abi: erc20Abi, data: steps[0].calldata as `0x${string}` });
    expect(approve.functionName).toBe("approve");
    expect(approve.args).toEqual([getAddress(AaveV3Base.POOL), 12345678n]);

    const supply = decodeFunctionData({ abi: aavePoolAbi, data: steps[1].calldata as `0x${string}` });
    expect(supply.functionName).toBe("supply");
    expect(supply.args).toEqual([
      getAddress(DEFAULT_BASE_USDC_ADDRESS),
      12345678n,
      getAddress(walletAddress),
      0
    ]);
  });

  it("builds Morpho approval and ERC-4626 deposit calldata for the configured vault", () => {
    const steps = morphoBaseUsdcAdapter.buildDepositSteps({
      allocation: allocation({ opportunityId: "morpho-base-usdc", protocol: "Morpho" }),
      walletAddress,
      config
    });

    expect(steps).toHaveLength(2);
    expect(steps.map((step) => step.type)).toEqual(["approve", "deposit"]);
    expect(steps[0]).toMatchObject({
      protocol: "morpho",
      target: getAddress(DEFAULT_BASE_USDC_ADDRESS),
      amountRaw: "12345678"
    });
    expect(steps[1]).toMatchObject({
      protocol: "morpho",
      target: getAddress(morphoVaultAddress),
      amountRaw: "12345678"
    });

    const approve = decodeFunctionData({ abi: erc20Abi, data: steps[0].calldata as `0x${string}` });
    expect(approve.functionName).toBe("approve");
    expect(approve.args).toEqual([getAddress(morphoVaultAddress), 12345678n]);

    const deposit = decodeFunctionData({ abi: erc4626VaultAbi, data: steps[1].calldata as `0x${string}` });
    expect(deposit.functionName).toBe("deposit");
    expect(deposit.args).toEqual([12345678n, getAddress(walletAddress)]);
  });

  it("rejects unsupported chains, assets, protocols, and missing Morpho vault config", () => {
    expect(() =>
      buildExecutionStepsForAllocation({ allocation: allocation({ chain: "ethereum" }), walletAddress, config })
    ).toThrow(/No executable adapter/);

    expect(() =>
      buildExecutionStepsForAllocation({ allocation: allocation({ symbol: "DAI" }), walletAddress, config })
    ).toThrow(/No executable adapter/);

    expect(() =>
      buildExecutionStepsForAllocation({ allocation: allocation({ protocol: "Curve" }), walletAddress, config })
    ).toThrow(/No executable adapter/);

    expect(() =>
      morphoBaseUsdcAdapter.buildDepositSteps({
        allocation: allocation({ protocol: "Morpho" }),
        walletAddress,
        config: { ...config, morphoBaseUsdcVaultAddress: undefined }
      })
    ).toThrow(/MORPHO_BASE_USDC_VAULT_ADDRESS/);
  });

  it("enforces approval value caps", () => {
    expect(() =>
      aaveV3BaseUsdcAdapter.buildDepositSteps({
        allocation: allocation({ amountUsd: 101 }),
        walletAddress,
        config
      })
    ).toThrow(/exceeds cap/);
  });
});
