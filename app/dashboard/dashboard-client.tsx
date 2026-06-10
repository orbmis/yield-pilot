"use client";

import { useEffect, useMemo, useState } from "react";
import { usePrivy, useSessionSigners, useWallets } from "@privy-io/react-auth";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Bot,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Gauge,
  Loader2,
  LogOut,
  Network,
  ShieldCheck,
  WalletCards
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { pickRecommendedScenario } from "@/lib/scenario/recommendation";
import type { Portfolio, Scenario, SwitchingCost, YieldOpportunity } from "@/lib/types";
import { formatCurrency, formatPercent } from "@/lib/utils";

type DashboardData = {
  portfolio: Portfolio;
  opportunities: YieldOpportunity[];
  costs: SwitchingCost[];
  scenarios: Scenario[];
};

type DashboardClientProps = {
  initialData: DashboardData;
  constraints: {
    maximumProtocolCount: number;
    maximumAllocationPercent: number;
  };
  privyEnabled: boolean;
  fixtureMode: boolean;
  automationSignerId?: string;
  automationPolicyIds: string[];
};

type DelegatedWalletMetadata = {
  type: "wallet";
  address: string;
  id?: string | null;
  delegated?: boolean;
};

const OPPORTUNITIES_PER_PAGE = 6;

const markdownComponents: Components = {
  h1: ({ children }) => <h1 className="text-base font-semibold leading-6">{children}</h1>,
  h2: ({ children }) => <h2 className="text-base font-semibold leading-6">{children}</h2>,
  h3: ({ children }) => <h3 className="text-sm font-semibold leading-6">{children}</h3>,
  p: ({ children }) => <p className="leading-6">{children}</p>,
  ul: ({ children }) => <ul className="ml-5 list-disc space-y-1">{children}</ul>,
  ol: ({ children }) => <ol className="ml-5 list-decimal space-y-1">{children}</ol>,
  li: ({ children }) => <li className="leading-6">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
  a: ({ children, href }) => (
    <a className="font-medium text-primary underline-offset-4 hover:underline" href={href} rel="noreferrer" target="_blank">
      {children}
    </a>
  ),
  code: ({ children }) => <code className="rounded bg-muted px-1 py-0.5 text-xs text-foreground">{children}</code>
};

export function DashboardClient({
  initialData,
  constraints,
  privyEnabled,
  fixtureMode,
  automationSignerId,
  automationPolicyIds
}: DashboardClientProps) {
  const [data, setData] = useState(initialData);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isLoadingPortfolio, setIsLoadingPortfolio] = useState(false);
  const [aiRecommendation, setAiRecommendation] = useState<string | null>(null);
  const [isLoadingRecommendation, setIsLoadingRecommendation] = useState(false);
  const [recommendationError, setRecommendationError] = useState<string | null>(null);
  const [opportunityPage, setOpportunityPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const recommended = useMemo(() => pickRecommendedScenario(data.scenarios), [data.scenarios]);
  const opportunityPageCount = Math.max(1, Math.ceil(data.opportunities.length / OPPORTUNITIES_PER_PAGE));
  const visibleOpportunities = data.opportunities.slice(
    (opportunityPage - 1) * OPPORTUNITIES_PER_PAGE,
    opportunityPage * OPPORTUNITIES_PER_PAGE
  );
  const firstOpportunityIndex =
    data.opportunities.length === 0 ? 0 : (opportunityPage - 1) * OPPORTUNITIES_PER_PAGE + 1;
  const lastOpportunityIndex = Math.min(opportunityPage * OPPORTUNITIES_PER_PAGE, data.opportunities.length);

  useEffect(() => {
    if (!walletAddress) return;

    const controller = new AbortController();
    setIsLoadingPortfolio(true);
    setError(null);

    const params = new URLSearchParams({
      wallet: walletAddress,
      maximumProtocolCount: String(constraints.maximumProtocolCount),
      maximumAllocationPercent: String(constraints.maximumAllocationPercent)
    });

    fetch(`/api/scenarios?${params.toString()}`, { signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error ?? `Scenario request failed with ${response.status}`);
        }
        return payload as { data: DashboardData };
      })
      .then((payload) => setData(payload.data))
      .catch((requestError) => {
        if (requestError instanceof DOMException && requestError.name === "AbortError") return;
        setError(requestError instanceof Error ? requestError.message : "Unable to load wallet portfolio.");
      })
      .finally(() => setIsLoadingPortfolio(false));

    return () => controller.abort();
  }, [constraints.maximumAllocationPercent, constraints.maximumProtocolCount, walletAddress]);

  useEffect(() => {
    setOpportunityPage(1);
  }, [data.opportunities.length]);

  useEffect(() => {
    if (!recommended) {
      setAiRecommendation(null);
      return;
    }

    const controller = new AbortController();
    setIsLoadingRecommendation(true);
    setRecommendationError(null);

    fetch("/api/ai/recommendation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        portfolio: data.portfolio,
        opportunities: data.opportunities,
        scenarios: data.scenarios,
        constraints
      }),
      signal: controller.signal
    })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error ?? `Recommendation request failed with ${response.status}`);
        }
        return payload as { data: { recommendation: string } };
      })
      .then((payload) => setAiRecommendation(payload.data.recommendation))
      .catch((requestError) => {
        if (requestError instanceof DOMException && requestError.name === "AbortError") return;
        setAiRecommendation(null);
        setRecommendationError(
          requestError instanceof Error ? requestError.message : "Unable to generate AI recommendation."
        );
      })
      .finally(() => setIsLoadingRecommendation(false));

    return () => controller.abort();
  }, [constraints, data.opportunities, data.portfolio, data.scenarios, recommended]);

  return (
    <main className="min-h-screen">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-md bg-primary text-primary-foreground">
                <Gauge className="h-5 w-5" />
              </div>
              <h1 className="text-2xl font-semibold">YieldPilot Dashboard</h1>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {fixtureMode
                ? "Fixture mode is enabled. Connected wallets will use demo data until USE_FIXTURES=false."
                : "Connect a wallet to load Zapper portfolio data and generate cost-adjusted scenarios."}
            </p>
          </div>
          {privyEnabled ? (
            <PrivyWalletControls
              connectedAddress={walletAddress}
              onWalletAddress={setWalletAddress}
              isLoadingPortfolio={isLoadingPortfolio}
              automationSignerId={automationSignerId}
              automationPolicyIds={automationPolicyIds}
            />
          ) : (
            <Button disabled>
              <WalletCards className="mr-2 h-4 w-4" />
              Privy Not Configured
            </Button>
          )}
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-6 py-6">
        {error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        {walletAddress ? (
          <div className="rounded-lg border bg-white px-4 py-3 text-sm text-muted-foreground">
            Connected wallet <span className="font-medium text-foreground">{shortAddress(walletAddress)}</span>
          </div>
        ) : !fixtureMode ? (
          <div className="rounded-lg border bg-white px-4 py-3 text-sm text-muted-foreground">
            Connect a wallet to load live portfolio balances and protocol positions.
          </div>
        ) : null}

        <section className="grid gap-4 lg:grid-cols-4">
          <Metric title="Portfolio Value" value={formatCurrency(data.portfolio.totalValueUsd)} icon={CircleDollarSign} />
          <Metric title="Current APY" value={formatPercent(data.portfolio.weightedApy)} icon={Gauge} />
          <Metric title="Protocols" value={String(data.portfolio.positions.length)} icon={Network} />
          <Metric title="Recommended" value={recommended?.kind ?? "N/A"} icon={Bot} />
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.95fr_1.35fr]">
          <Card>
            <CardHeader>
              <CardTitle>Current Allocation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.portfolio.positions.map((position) => (
                <div key={position.id}>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-medium">{position.protocol}</span>
                    <span className="text-muted-foreground">{formatCurrency(position.valueUsd)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-primary"
                      style={{ width: `${Math.min((position.valueUsd / data.portfolio.totalValueUsd) * 100, 100)}%` }}
                    />
                  </div>
                  <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                    <span>{position.chain}</span>
                    <span>{formatPercent(position.apy)}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Scenario Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="py-3 font-medium">Scenario</th>
                      <th className="py-3 font-medium">Weighted APY</th>
                      <th className="py-3 font-medium">Projected Yield</th>
                      <th className="py-3 font-medium">Costs</th>
                      <th className="py-3 font-medium">Net Yield</th>
                      <th className="py-3 font-medium">Allocations</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.scenarios.map((scenario) => (
                      <tr key={scenario.kind} className="border-b last:border-0">
                        <td className="py-4 font-semibold">{scenario.kind}</td>
                        <td className="py-4">{formatPercent(scenario.weightedApy)}</td>
                        <td className="py-4">{formatCurrency(scenario.projectedYieldUsd)}</td>
                        <td className="py-4">{formatCurrency(scenario.estimatedCostsUsd)}</td>
                        <td className="py-4 font-semibold text-primary">{formatCurrency(scenario.netYieldUsd)}</td>
                        <td className="py-4">
                          <div className="flex flex-wrap gap-1.5">
                            {scenario.allocations.map((allocation) => (
                              <Badge key={`${scenario.kind}-${allocation.opportunityId}`}>
                                {allocation.protocol} {allocation.allocationPercent.toFixed(0)}%
                              </Badge>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.35fr_0.95fr]">
          <Card>
            <CardHeader className="gap-3 md:flex-row md:items-center md:justify-between">
              <CardTitle>Yield Opportunities</CardTitle>
              <div className="text-sm text-muted-foreground">
                {firstOpportunityIndex}-{lastOpportunityIndex} of {data.opportunities.length}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                {visibleOpportunities.map((opportunity) => (
                  <div key={opportunity.id} className="rounded-lg border p-4">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-semibold">{opportunity.protocol}</h3>
                      <Badge>{formatPercent(opportunity.apy)}</Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {opportunity.symbol} on {opportunity.chain}
                    </p>
                    <p className="mt-3 text-sm">TVL {formatCurrency(opportunity.tvlUsd)}</p>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between border-t pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOpportunityPage((page) => Math.max(1, page - 1))}
                  disabled={opportunityPage === 1}
                  aria-label="Previous yield opportunities page"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {opportunityPage} of {opportunityPageCount}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOpportunityPage((page) => Math.min(opportunityPageCount, page + 1))}
                  disabled={opportunityPage === opportunityPageCount}
                  aria-label="Next yield opportunities page"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recommendation Panel</CardTitle>
            </CardHeader>
            <CardContent className="max-h-[560px] overflow-y-auto">
              <div className="rounded-lg bg-muted p-4">
                <p className="text-sm leading-6">
                  {recommended
                    ? `${recommended.kind} currently has the highest estimated net yield at ${formatCurrency(
                        recommended.netYieldUsd
                      )}. It respects the ${constraints.maximumProtocolCount}-protocol limit and keeps every protocol below ${constraints.maximumAllocationPercent}% allocation.`
                    : "No recommendation is available."}
                </p>
              </div>
              <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                {isLoadingRecommendation ? (
                  <p className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating AI recommendation...
                  </p>
                ) : aiRecommendation ? (
                  <div className="space-y-3 text-foreground">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                      {aiRecommendation}
                    </ReactMarkdown>
                  </div>
                ) : recommendationError ? (
                  <p className="text-destructive">{recommendationError}</p>
                ) : null}
                <p>Switching costs include deposit, withdraw, and gas estimates from the Tenderly integration boundary.</p>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}

function PrivyWalletControls({
  connectedAddress,
  onWalletAddress,
  isLoadingPortfolio,
  automationSignerId,
  automationPolicyIds
}: {
  connectedAddress: string | null;
  onWalletAddress: (address: string | null) => void;
  isLoadingPortfolio: boolean;
  automationSignerId?: string;
  automationPolicyIds: string[];
}) {
  const { ready, authenticated, login, linkWallet, logout, user } = usePrivy();
  const { ready: walletsReady, wallets } = useWallets();
  const { addSessionSigners, removeSessionSigners } = useSessionSigners();
  const [isDelegating, setIsDelegating] = useState(false);
  const [delegationError, setDelegationError] = useState<string | null>(null);
  const [automationEnabled, setAutomationEnabled] = useState(false);
  const embeddedWallet =
    wallets.find((wallet) => wallet.walletClientType === "privy" || wallet.walletClientType === "privy-v2") ??
    wallets[0];
  const walletAddress = embeddedWallet?.address ?? null;
  const linkedWallet = user?.linkedAccounts.find(
    (account) =>
      account.type === "wallet" &&
      account.address.toLowerCase() === walletAddress?.toLowerCase()
  ) as DelegatedWalletMetadata | undefined;
  const delegatedWalletId = linkedWallet?.id ?? undefined;
  const isDelegated = automationEnabled || Boolean(linkedWallet?.delegated && delegatedWalletId);

  useEffect(() => {
    if (!ready || !walletsReady) return;
    onWalletAddress(walletAddress);
  }, [onWalletAddress, ready, walletAddress, walletsReady]);

  async function handleDelegateWallet() {
    if (!walletAddress) return;
    if (!automationSignerId) {
      setDelegationError("Missing NEXT_PUBLIC_PRIVY_SIGNER_ID. Add the Privy signer id to enable TEE session signers.");
      return;
    }

    setIsDelegating(true);
    setDelegationError(null);

    try {
      await addSessionSigners({
        address: walletAddress,
        signers: [
          {
            signerId: automationSignerId,
            policyIds: automationPolicyIds
          }
        ]
      });
      setAutomationEnabled(true);
    } catch (error) {
      setDelegationError(error instanceof Error ? error.message : "Session signer provisioning was not completed.");
    } finally {
      setIsDelegating(false);
    }
  }

  async function handleDisableAutomation() {
    if (!walletAddress) return;

    setIsDelegating(true);
    setDelegationError(null);

    try {
      await removeSessionSigners({ address: walletAddress });
      setAutomationEnabled(false);
    } catch (error) {
      setDelegationError(error instanceof Error ? error.message : "Session signer removal was not completed.");
    } finally {
      setIsDelegating(false);
    }
  }

  if (!ready) {
    return (
      <Button disabled>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading Auth
      </Button>
    );
  }

  if (!authenticated) {
    return (
      <Button onClick={() => login({ loginMethods: ["wallet", "email"] })}>
        <WalletCards className="mr-2 h-4 w-4" />
        Connect Wallet
      </Button>
    );
  }

  if (!connectedAddress) {
    return (
      <Button onClick={() => linkWallet({ walletChainType: "ethereum-only" })}>
        <WalletCards className="mr-2 h-4 w-4" />
        Link Wallet
      </Button>
    );
  }

  return (
    <div className="flex flex-col items-start gap-2 md:items-end">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" disabled={isLoadingPortfolio}>
          {isLoadingPortfolio ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <WalletCards className="mr-2 h-4 w-4" />}
          {shortAddress(connectedAddress)}
        </Button>
        {isDelegated ? (
          <Button variant="secondary" onClick={() => void handleDisableAutomation()} disabled={isDelegating}>
            <ShieldCheck className="mr-2 h-4 w-4" />
            Automation Enabled
          </Button>
        ) : (
          <Button variant="secondary" onClick={() => void handleDelegateWallet()} disabled={isDelegating || !automationSignerId}>
            {isDelegating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
            Enable Automation
          </Button>
        )}
        <Button variant="ghost" onClick={() => void logout()}>
          <LogOut className="mr-2 h-4 w-4" />
          Disconnect
        </Button>
      </div>
      {isDelegated ? (
        <p className="text-xs text-muted-foreground">Session signer provisioned{delegatedWalletId ? ` for wallet id ${delegatedWalletId}` : ""}</p>
      ) : !automationSignerId ? (
        <p className="max-w-xl text-xs text-muted-foreground">
          Add `NEXT_PUBLIC_PRIVY_SIGNER_ID` to enable TEE session signer provisioning.
        </p>
      ) : null}
      {delegationError ? <p className="max-w-xl text-xs text-destructive">{delegationError}</p> : null}
    </div>
  );
}

function Metric({
  title,
  value,
  icon: Icon
}: {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="mt-2 text-2xl font-semibold">{value}</p>
        </div>
        <Icon className="h-5 w-5 text-primary" />
      </CardContent>
    </Card>
  );
}

function shortAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
