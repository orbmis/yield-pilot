import { DashboardClient } from "./dashboard-client";
import { estimateSwitchingCosts } from "@/lib/clients/tenderly";
import { emptyPortfolio } from "@/lib/data/empty";
import { sampleOpportunities, samplePortfolio } from "@/lib/data/sample";
import { generateScenarios } from "@/lib/optimization/engine";

export default async function DashboardPage() {
  const fixtureMode = process.env.USE_FIXTURES === "true";
  const opportunities = fixtureMode ? sampleOpportunities : [];
  const costs = await estimateSwitchingCosts(opportunities);
  const constraints = { maximumProtocolCount: 3, maximumAllocationPercent: 45 };
  const portfolio = fixtureMode ? samplePortfolio : emptyPortfolio;
  const scenarios = fixtureMode
    ? generateScenarios(samplePortfolio.totalValueUsd, opportunities, costs, constraints)
    : [];

  return (
    <DashboardClient
      initialData={{
        portfolio,
        opportunities,
        costs,
        scenarios
      }}
      constraints={constraints}
      privyEnabled={Boolean(process.env.NEXT_PUBLIC_PRIVY_APP_ID)}
      fixtureMode={fixtureMode}
      automationSignerId={process.env.NEXT_PUBLIC_PRIVY_SIGNER_ID}
      automationPolicyIds={(process.env.NEXT_PUBLIC_PRIVY_POLICY_IDS ?? "")
        .split(",")
        .map((policyId) => policyId.trim())
        .filter(Boolean)}
    />
  );
}
