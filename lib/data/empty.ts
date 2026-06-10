import type { Portfolio } from "@/lib/types";

export const emptyPortfolio: Portfolio = {
  walletAddress: "",
  totalValueUsd: 0,
  weightedApy: 0,
  tokenBalances: [],
  positions: []
};
