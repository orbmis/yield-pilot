import { sampleOpportunities } from "@/lib/data/sample";
import type { YieldOpportunity } from "@/lib/types";

type DefiLlamaPool = {
  pool: string;
  chain: string;
  project: string;
  symbol: string;
  tvlUsd: number;
  apy: number;
  stablecoin?: boolean;
};

export async function getYieldOpportunities(): Promise<YieldOpportunity[]> {
  if (process.env.USE_FIXTURES === "true") {
    return sampleOpportunities;
  }

  const response = await fetch("https://yields.llama.fi/pools", {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`DefiLlama request failed: ${response.status}`);
  }

  const payload = (await response.json()) as { data: DefiLlamaPool[] };

  return payload.data
    .filter((pool) => pool.tvlUsd > 25_000_000 && pool.apy > 0)
    .sort((a, b) => b.apy - a.apy)
    .slice(0, 60)
    .map((pool) => ({
      id: pool.pool,
      pool: pool.pool,
      protocol: pool.project,
      chain: pool.chain.toLowerCase(),
      symbol: pool.symbol,
      apy: pool.apy,
      tvlUsd: pool.tvlUsd,
      stablecoin: Boolean(pool.stablecoin),
      url: `https://defillama.com/yields/pool/${pool.pool}`
    }));
}
