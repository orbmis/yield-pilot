import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getYieldOpportunities } from "@/lib/clients/defillama";
import { getPortfolio } from "@/lib/clients/debank";
import { estimateSwitchingCosts } from "@/lib/clients/tenderly";
import { samplePortfolio } from "@/lib/data/sample";
import { generateScenarios } from "@/lib/optimization/engine";

const QuerySchema = z.object({
  wallet: z.string().optional(),
  maximumProtocolCount: z.coerce.number().int().min(1).max(10).default(3),
  maximumAllocationPercent: z.coerce.number().min(10).max(100).default(45)
});

export async function GET(request: NextRequest) {
  const query = QuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams));
  const walletAddress = query.wallet ?? samplePortfolio.walletAddress;

  try {
    const [portfolio, opportunities] = await Promise.all([
      getPortfolio(walletAddress),
      getYieldOpportunities()
    ]);
    const costs = await estimateSwitchingCosts(opportunities);
    const scenarios = generateScenarios(portfolio.totalValueUsd, opportunities, costs, {
      maximumProtocolCount: query.maximumProtocolCount,
      maximumAllocationPercent: query.maximumAllocationPercent
    });

    return NextResponse.json({ data: { portfolio, opportunities, costs, scenarios } });
  } catch (error) {
    if (process.env.USE_FIXTURES === "true") {
      const opportunities = await getYieldOpportunities();
      const costs = await estimateSwitchingCosts(opportunities);
      const portfolio = { ...samplePortfolio, walletAddress };
      const scenarios = generateScenarios(portfolio.totalValueUsd, opportunities, costs, {
        maximumProtocolCount: query.maximumProtocolCount,
        maximumAllocationPercent: query.maximumAllocationPercent
      });

      return NextResponse.json({
        data: { portfolio, opportunities, costs, scenarios },
        warning: error instanceof Error ? error.message : "Scenario provider failed; returned fixture data."
      });
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Scenario provider failed."
      },
      { status: 502 }
    );
  }
}
