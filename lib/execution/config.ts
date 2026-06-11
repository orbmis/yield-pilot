export const BASE_CHAIN_ID = 8453 as const;
export const BASE_NETWORK = "base" as const;
export const DEFAULT_BASE_USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

export type ExecutionConfig = {
  enabled: boolean;
  baseRpcUrl?: string;
  baseUsdcAddress: string;
  morphoBaseUsdcVaultAddress?: string;
  maxGasUsd: number;
  maxApprovalUsd: number;
};

function readPositiveNumber(name: string, fallback: number) {
  const value = process.env[name];
  if (!value) return fallback;

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive number`);
  }

  return parsed;
}

export function getExecutionConfig(): ExecutionConfig {
  return {
    enabled: process.env.EXECUTION_ENABLED === "true",
    baseRpcUrl: process.env.BASE_RPC_URL,
    baseUsdcAddress: process.env.BASE_USDC_ADDRESS ?? DEFAULT_BASE_USDC_ADDRESS,
    morphoBaseUsdcVaultAddress: process.env.MORPHO_BASE_USDC_VAULT_ADDRESS,
    maxGasUsd: readPositiveNumber("EXECUTION_MAX_GAS_USD", 25),
    maxApprovalUsd: readPositiveNumber("EXECUTION_MAX_APPROVAL_USD", 100)
  };
}
