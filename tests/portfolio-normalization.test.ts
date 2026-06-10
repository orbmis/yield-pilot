import { describe, expect, it } from "vitest";
import { buildPortfolio, normalizeZapperProtocolPositions, normalizeZapperTokenBalances } from "@/lib/portfolio/normalize";

describe("portfolio normalization", () => {
  it("normalizes Zapper token balances into value-bearing tokens", () => {
    const balances = normalizeZapperTokenBalances({
      portfolioV2: {
        tokenBalances: {
          byToken: {
            edges: [
              {
                node: {
                  network: { slug: "base" },
                  tokenAddress: "0x1",
                  symbol: "USDC",
                  balance: 100,
                  balanceUSD: 100
                }
              },
              {
                node: {
                  network: { slug: "base" },
                  tokenAddress: "0x2",
                  symbol: "DUST",
                  balance: 10,
                  balanceUSD: 0
                }
              }
            ]
          }
        }
      }
    });

    expect(balances).toHaveLength(1);
    expect(balances[0]).toMatchObject({ chain: "base", symbol: "USDC", valueUsd: 100 });
  });

  it("normalizes protocol positions and builds totals", () => {
    const positions = normalizeZapperProtocolPositions({
      portfolioV2: {
        appBalances: {
          byApp: {
            edges: [
              {
                node: {
                  balanceUSD: 250,
                  app: { displayName: "Aave V3", slug: "aave-v3" },
                  network: { slug: "base" },
                  products: [{ assets: [{ symbol: "USDC" }] }]
                }
              }
            ]
          }
        }
      }
    });
    const portfolio = buildPortfolio("0xabc", [], positions);

    expect(positions[0].protocol).toBe("Aave V3");
    expect(portfolio.totalValueUsd).toBe(250);
  });
});
