import type { Portfolio, SwitchingCost, YieldOpportunity } from "@/lib/types";

export const samplePortfolio: Portfolio = {
  walletAddress: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
  totalValueUsd: 48500,
  weightedApy: 5.86,
  tokenBalances: [
    {
      chain: "base",
      address: "0x833589fcd6edb6e08f4c7c32d4f71b54bdA02913",
      symbol: "USDC",
      amount: 18500,
      priceUsd: 1,
      valueUsd: 18500
    },
    {
      chain: "ethereum",
      address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      symbol: "WETH",
      amount: 5.8,
      priceUsd: 3000,
      valueUsd: 17400
    },
    {
      chain: "arbitrum",
      address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
      symbol: "USDC",
      amount: 12600,
      priceUsd: 1,
      valueUsd: 12600
    }
  ],
  positions: [
    {
      id: "aave-v3-base-usdc",
      protocol: "Aave V3",
      chain: "base",
      asset: "USDC",
      valueUsd: 16000,
      apy: 4.2
    },
    {
      id: "compound-v3-arbitrum-usdc",
      protocol: "Compound V3",
      chain: "arbitrum",
      asset: "USDC",
      valueUsd: 9500,
      apy: 5.1
    },
    {
      id: "lido-ethereum-weth",
      protocol: "Lido",
      chain: "ethereum",
      asset: "WETH",
      valueUsd: 15000,
      apy: 3.4
    }
  ]
};

export const sampleOpportunities: YieldOpportunity[] = [
  {
    id: "aave-v3-base-usdc",
    pool: "base-aave-usdc",
    protocol: "Aave V3",
    chain: "base",
    symbol: "USDC",
    apy: 4.2,
    tvlUsd: 215000000,
    stablecoin: true
  },
  {
    id: "morpho-base-usdc",
    pool: "base-morpho-usdc",
    protocol: "Morpho",
    chain: "base",
    symbol: "USDC",
    apy: 8.4,
    tvlUsd: 98000000,
    stablecoin: true
  },
  {
    id: "fluid-ethereum-usdc",
    pool: "ethereum-fluid-usdc",
    protocol: "Fluid",
    chain: "ethereum",
    symbol: "USDC",
    apy: 7.1,
    tvlUsd: 143000000,
    stablecoin: true
  },
  {
    id: "pendle-arbitrum-usde",
    pool: "arbitrum-pendle-usde",
    protocol: "Pendle",
    chain: "arbitrum",
    symbol: "USDe",
    apy: 13.6,
    tvlUsd: 72000000,
    stablecoin: true
  },
  {
    id: "aerodrome-base-usdc-weth",
    pool: "base-aerodrome-usdc-weth",
    protocol: "Aerodrome",
    chain: "base",
    symbol: "USDC-WETH",
    apy: 18.9,
    tvlUsd: 31000000,
    stablecoin: false
  }
];

export const sampleCosts: SwitchingCost[] = sampleOpportunities.map((opportunity, index) => ({
  opportunityId: opportunity.id,
  depositCostUsd: [4.8, 6.2, 18.5, 7.4, 9.2][index] ?? 8,
  withdrawCostUsd: [3.2, 4.1, 15.2, 6.2, 8.7][index] ?? 5,
  gasCostUsd: [2.4, 2.9, 21.8, 3.1, 3.7][index] ?? 4,
  totalCostUsd: [10.4, 13.2, 55.5, 16.7, 21.6][index] ?? 17
}));
