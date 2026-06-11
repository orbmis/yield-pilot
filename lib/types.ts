export type Chain = "ethereum" | "base" | "arbitrum" | "optimism" | "polygon" | string;

export interface TokenBalance {
  chain: Chain;
  address: string;
  symbol: string;
  amount: number;
  priceUsd: number;
  valueUsd: number;
}

export interface ProtocolPosition {
  id: string;
  protocol: string;
  chain: Chain;
  asset: string;
  valueUsd: number;
  apy: number;
}

export interface Portfolio {
  walletAddress: string;
  totalValueUsd: number;
  weightedApy: number;
  tokenBalances: TokenBalance[];
  positions: ProtocolPosition[];
}

export interface YieldOpportunity {
  id: string;
  pool: string;
  protocol: string;
  chain: Chain;
  symbol: string;
  apy: number;
  tvlUsd: number;
  stablecoin: boolean;
  url?: string;
}

export interface SwitchingCost {
  opportunityId: string;
  depositCostUsd: number;
  withdrawCostUsd: number;
  gasCostUsd: number;
  totalCostUsd: number;
}

export interface Allocation {
  opportunityId: string;
  protocol: string;
  chain: Chain;
  symbol: string;
  amountUsd: number;
  allocationPercent: number;
  apy: number;
  projectedYieldUsd: number;
  estimatedCostUsd: number;
  netYieldUsd: number;
}

export type ScenarioKind = "Conservative" | "Balanced" | "Yield Maximized";

export interface Scenario {
  kind: ScenarioKind;
  totalAllocatedUsd: number;
  projectedYieldUsd: number;
  estimatedCostsUsd: number;
  netYieldUsd: number;
  weightedApy: number;
  allocations: Allocation[];
}

export interface OptimizationConstraints {
  maximumProtocolCount: number;
  maximumAllocationPercent: number;
}

export type ExecutableProtocol = "aave-v3" | "morpho";

export type ExecutionStepType = "approve" | "deposit";

export type ExecutionStatus =
  | "draft"
  | "previewed"
  | "approved"
  | "simulated"
  | "submitted"
  | "confirmed"
  | "failed";

export interface ExecutionStep {
  id: string;
  type: ExecutionStepType;
  protocol: ExecutableProtocol;
  chain: "base";
  chainId: 8453;
  tokenAddress: string;
  tokenSymbol: "USDC";
  amountRaw: string;
  amountUsd: number;
  target: string;
  calldata: string;
  estimatedGasUsd: number;
  simulationPassed: boolean;
  simulationId?: string;
  txHash?: string;
  status: ExecutionStatus;
}

export interface ExecutionPlan {
  id: string;
  walletAddress: string;
  scenarioKind: ScenarioKind;
  status: ExecutionStatus;
  totalAmountUsd: number;
  maxGasUsd: number;
  maxApprovalUsd: number;
  steps: ExecutionStep[];
  createdAt: string;
  approvedAt?: string;
  executedAt?: string;
}
