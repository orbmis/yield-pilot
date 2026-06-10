import { describe, expect, it } from "vitest";
import { buildPortfolio, normalizeProtocolPositions, normalizeTokenBalances } from "@/lib/portfolio/normalize";

describe("portfolio normalization", () => {
  it("normalizes DeBank token balances into value-bearing tokens", () => {
    const balances = normalizeTokenBalances([
      { chain: "base", id: "0x1", symbol: "USDC", amount: 100, price: 1 },
      { chain: "base", id: "0x2", symbol: "DUST", amount: 10, price: 0 }
    ]);

    expect(balances).toHaveLength(1);
    expect(balances[0]).toMatchObject({ chain: "base", symbol: "USDC", valueUsd: 100 });
  });

  it("normalizes protocol positions and builds totals", () => {
    const positions = normalizeProtocolPositions([
      {
        id: "aave3",
        name: "Aave V3",
        chain: "base",
        portfolio_item_list: [
          { stats: { net_usd_value: 250 }, detail: { supply_token_list: [{ symbol: "USDC" }] } }
        ]
      }
    ]);
    const portfolio = buildPortfolio("0xabc", [], positions);

    expect(positions[0].protocol).toBe("Aave V3");
    expect(portfolio.totalValueUsd).toBe(250);
  });
});
