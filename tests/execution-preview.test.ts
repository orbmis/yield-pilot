import { afterEach, describe, expect, it } from "vitest";
import { sampleCosts, sampleOpportunities, samplePortfolio } from "@/lib/data/sample";
import { DEFAULT_BASE_USDC_ADDRESS } from "@/lib/execution/config";
import { buildPreviewPlanFromData } from "@/lib/execution/preview";
import type { YieldOpportunity } from "@/lib/types";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

function setPreviewEnv() {
  process.env.BASE_USDC_ADDRESS = DEFAULT_BASE_USDC_ADDRESS;
  process.env.MORPHO_BASE_USDC_VAULT_ADDRESS = "0xeE8F4eC5672F09119b96Ab6fB59C27E1b7e44b61";
  process.env.EXECUTION_MAX_APPROVAL_USD = "100";
  process.env.EXECUTION_MAX_GAS_USD = "25";
}

describe("execution preview planning", () => {
  it("recomputes executable amounts from idle Base USDC instead of total portfolio value", () => {
    setPreviewEnv();

    const plan = buildPreviewPlanFromData(
      {
        walletAddress: samplePortfolio.walletAddress,
        scenarioKind: "Balanced",
        constraints: {
          maximumProtocolCount: 2,
          maximumAllocationPercent: 50
        }
      },
      {
        portfolio: {
          ...samplePortfolio,
          totalValueUsd: 1_000_000,
          tokenBalances: [
            {
              chain: "base",
              address: DEFAULT_BASE_USDC_ADDRESS,
              symbol: "USDC",
              amount: 100,
              priceUsd: 1,
              valueUsd: 100
            }
          ]
        },
        opportunities: sampleOpportunities.filter((opportunity) => ["Aave V3", "Morpho"].includes(opportunity.protocol)),
        costs: sampleCosts
      }
    );

    expect(plan.totalAmountUsd).toBe(100);
    expect(plan.steps.filter((step) => step.type === "deposit").map((step) => step.amountUsd)).toEqual([50, 50]);
  });

  it("filters out Base USDC opportunities without a registered adapter", () => {
    setPreviewEnv();

    const unsupportedBaseOpportunity: YieldOpportunity = {
      id: "unsupported-base-usdc",
      pool: "unsupported-base-usdc",
      protocol: "Unsupported",
      chain: "base",
      symbol: "USDC",
      apy: 200,
      tvlUsd: 500_000_000,
      stablecoin: true
    };

    const plan = buildPreviewPlanFromData(
      {
        walletAddress: samplePortfolio.walletAddress,
        scenarioKind: "Yield Maximized",
        constraints: {
          maximumProtocolCount: 3,
          maximumAllocationPercent: 50
        }
      },
      {
        portfolio: {
          ...samplePortfolio,
          tokenBalances: [
            {
              chain: "base",
              address: DEFAULT_BASE_USDC_ADDRESS,
              symbol: "USDC",
              amount: 100,
              priceUsd: 1,
              valueUsd: 100
            }
          ]
        },
        opportunities: [
          unsupportedBaseOpportunity,
          ...sampleOpportunities.filter((opportunity) => ["Aave V3", "Morpho"].includes(opportunity.protocol))
        ],
        costs: sampleCosts
      }
    );

    expect(plan.steps.every((step) => step.protocol === "aave-v3" || step.protocol === "morpho")).toBe(true);
    expect(plan.steps.some((step) => step.id.includes("unsupported-base-usdc"))).toBe(false);
  });

  it("fails when the wallet has no idle Base USDC", () => {
    setPreviewEnv();

    expect(() =>
      buildPreviewPlanFromData(
        {
          walletAddress: samplePortfolio.walletAddress,
          scenarioKind: "Balanced",
          constraints: {
            maximumProtocolCount: 2,
            maximumAllocationPercent: 50
          }
        },
        {
          portfolio: {
            ...samplePortfolio,
            tokenBalances: []
          },
          opportunities: sampleOpportunities,
          costs: sampleCosts
        }
      )
    ).toThrow(/No idle Base USDC/);
  });
});
