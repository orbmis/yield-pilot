"use client";

import { useEffect, useMemo, useState } from "react";
import { useCreateWallet, usePrivy, useSendTransaction, useSessionSigners, useWallets } from "@privy-io/react-auth";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { encodeFunctionData, isAddress, parseEther, parseUnits } from "viem";
import {
  AlertTriangle,
  Bot,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Gauge,
  Copy,
  Download,
  Loader2,
  LogOut,
  Network,
  RefreshCw,
  Rocket,
  Send,
  ShieldCheck,
  WalletCards
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { pickRecommendedScenario } from "@/lib/scenario/recommendation";
import type { ExecutionPlan, Portfolio, Scenario, SwitchingCost, TokenBalance, YieldOpportunity } from "@/lib/types";
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

type CachedAiRecommendation = {
  recommendation: string;
  cachedAt: number;
};

type TransferNetwork = {
  id: string;
  label: string;
  chainId: number;
  nativeSymbol: string;
  usdcAddress: `0x${string}`;
  explorerUrl: string;
};

type TransferToken = "native" | "usdc";

const OPPORTUNITIES_PER_PAGE = 10;
const EXECUTION_NETWORK_LABEL = "Base";
const EXECUTION_CHAIN_ID = 8453;
const AI_RECOMMENDATION_CLIENT_CACHE_PREFIX = "yieldpilot:ai-recommendation:v1:";
const AI_RECOMMENDATION_CLIENT_CACHE_TTL_MS = 60 * 60 * 1000;
const TRANSFER_NETWORKS: TransferNetwork[] = [
  {
    id: "ethereum",
    label: "Ethereum",
    chainId: 1,
    nativeSymbol: "ETH",
    usdcAddress: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    explorerUrl: "https://etherscan.io/tx/"
  },
  {
    id: "base",
    label: "Base",
    chainId: 8453,
    nativeSymbol: "ETH",
    usdcAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    explorerUrl: "https://basescan.org/tx/"
  },
  {
    id: "base-sepolia",
    label: "Base Sepolia",
    chainId: 84532,
    nativeSymbol: "ETH",
    usdcAddress: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    explorerUrl: "https://sepolia.basescan.org/tx/"
  },
  {
    id: "arbitrum",
    label: "Arbitrum",
    chainId: 42161,
    nativeSymbol: "ETH",
    usdcAddress: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    explorerUrl: "https://arbiscan.io/tx/"
  },
  {
    id: "optimism",
    label: "Optimism",
    chainId: 10,
    nativeSymbol: "ETH",
    usdcAddress: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
    explorerUrl: "https://optimistic.etherscan.io/tx/"
  },
  {
    id: "polygon",
    label: "Polygon",
    chainId: 137,
    nativeSymbol: "MATIC",
    usdcAddress: "0x3c499c542cef5e3811e1192ce70d8cc03d5c3359",
    explorerUrl: "https://polygonscan.com/tx/"
  }
];
const ERC20_TRANSFER_ABI = [
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    outputs: [{ name: "", type: "bool" }]
  }
] as const;

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

function stableStringifyForClient(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringifyForClient(item)).join(",")}]`;
  }

  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringifyForClient(record[key])}`)
    .join(",")}}`;
}

function hashForClientCache(value: string) {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33) ^ value.charCodeAt(index);
  }
  return (hash >>> 0).toString(36);
}

function getCachedAiRecommendation(cacheKey: string) {
  try {
    const rawValue = window.localStorage.getItem(cacheKey);
    if (!rawValue) return null;

    const parsed = JSON.parse(rawValue) as CachedAiRecommendation;
    if (!parsed.recommendation || Date.now() - parsed.cachedAt > AI_RECOMMENDATION_CLIENT_CACHE_TTL_MS) {
      window.localStorage.removeItem(cacheKey);
      return null;
    }

    return parsed.recommendation;
  } catch {
    return null;
  }
}

function setCachedAiRecommendation(cacheKey: string, recommendation: string) {
  try {
    window.localStorage.setItem(cacheKey, JSON.stringify({ recommendation, cachedAt: Date.now() } satisfies CachedAiRecommendation));
  } catch {
    // Browser storage can be unavailable or full; the server cache remains the fallback.
  }
}

function removeCachedAiRecommendation(cacheKey: string) {
  try {
    window.localStorage.removeItem(cacheKey);
  } catch {
    // Browser storage can be unavailable; force refresh still bypasses the server cache.
  }
}

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
  const [executionWalletId, setExecutionWalletId] = useState<string | null>(null);
  const [executionPlan, setExecutionPlan] = useState<ExecutionPlan | null>(null);
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [isPreviewingExecution, setIsPreviewingExecution] = useState(false);
  const [isDeployingExecution, setIsDeployingExecution] = useState(false);
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
  const baseUsdcBalance = useMemo(
    () =>
      data.portfolio.tokenBalances.find(
        (balance) => balance.chain === "base" && balance.symbol.toUpperCase() === "USDC"
      ) ?? null,
    [data.portfolio.tokenBalances]
  );
  const baseEthBalance = useMemo(
    () =>
      data.portfolio.tokenBalances.find(
        (balance) => balance.chain === "base" && balance.symbol.toUpperCase() === "ETH"
      ) ?? null,
    [data.portfolio.tokenBalances]
  );
  const recommendationRequestBody = useMemo(
    () => ({
      portfolio: data.portfolio,
      opportunities: data.opportunities,
      scenarios: data.scenarios,
      constraints
    }),
    [constraints, data.opportunities, data.portfolio, data.scenarios]
  );
  const recommendationCacheKey = useMemo(
    () =>
      `${AI_RECOMMENDATION_CLIENT_CACHE_PREFIX}${hashForClientCache(
        stableStringifyForClient(recommendationRequestBody)
      )}`,
    [recommendationRequestBody]
  );

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

  async function refreshDashboardData() {
    if (!walletAddress) return;

    const params = new URLSearchParams({
      wallet: walletAddress,
      maximumProtocolCount: String(constraints.maximumProtocolCount),
      maximumAllocationPercent: String(constraints.maximumAllocationPercent)
    });
    const response = await fetch(`/api/scenarios?${params.toString()}`);
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error ?? `Scenario request failed with ${response.status}`);
    }
    setData((payload as { data: DashboardData }).data);
  }

  useEffect(() => {
    setOpportunityPage(1);
  }, [data.opportunities.length]);

  useEffect(() => {
    setExecutionPlan(null);
    setExecutionError(null);
  }, [recommended?.kind, walletAddress]);

  useEffect(() => {
    if (!recommended) {
      setAiRecommendation(null);
      return;
    }

    const controller = new AbortController();
    const cachedRecommendation = getCachedAiRecommendation(recommendationCacheKey);

    setRecommendationError(null);
    if (cachedRecommendation) {
      setAiRecommendation(cachedRecommendation);
      setIsLoadingRecommendation(false);
      return () => controller.abort();
    }

    setIsLoadingRecommendation(true);

    fetch("/api/ai/recommendation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(recommendationRequestBody),
      signal: controller.signal
    })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error ?? `Recommendation request failed with ${response.status}`);
        }
        return payload as { data: { recommendation: string } };
      })
      .then((payload) => {
        setCachedAiRecommendation(recommendationCacheKey, payload.data.recommendation);
        setAiRecommendation(payload.data.recommendation);
      })
      .catch((requestError) => {
        if (requestError instanceof DOMException && requestError.name === "AbortError") return;
        setAiRecommendation(null);
        setRecommendationError(
          requestError instanceof Error ? requestError.message : "Unable to generate AI recommendation."
        );
      })
      .finally(() => setIsLoadingRecommendation(false));

    return () => controller.abort();
  }, [recommendationCacheKey, recommendationRequestBody, recommended]);

  async function handleRefreshRecommendation() {
    if (!recommended) return;

    setIsLoadingRecommendation(true);
    setRecommendationError(null);
    removeCachedAiRecommendation(recommendationCacheKey);

    try {
      const response = await fetch("/api/ai/recommendation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...recommendationRequestBody,
          forceRefresh: true
        })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? `Recommendation request failed with ${response.status}`);
      }
      const recommendation = (payload as { data: { recommendation: string } }).data.recommendation;
      setCachedAiRecommendation(recommendationCacheKey, recommendation);
      setAiRecommendation(recommendation);
    } catch (requestError) {
      setRecommendationError(
        requestError instanceof Error ? requestError.message : "Unable to refresh AI recommendation."
      );
    } finally {
      setIsLoadingRecommendation(false);
    }
  }

  async function handlePreviewStrategy() {
    if (!walletAddress || !recommended) return;

    setIsPreviewingExecution(true);
    setExecutionError(null);

    try {
      const response = await fetch("/api/strategy/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet: walletAddress,
          scenarioKind: recommended.kind,
          constraints
        })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? `Execution preview failed with ${response.status}`);
      }
      setExecutionPlan((payload as { data: { plan: ExecutionPlan } }).data.plan);
    } catch (requestError) {
      setExecutionPlan(null);
      setExecutionError(requestError instanceof Error ? requestError.message : "Unable to preview strategy execution.");
    } finally {
      setIsPreviewingExecution(false);
    }
  }

  async function handleDeployStrategy() {
    if (!executionPlan || !executionWalletId) return;

    setIsDeployingExecution(true);
    setExecutionError(null);

    try {
      const response = await fetch("/api/strategy/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          executionId: executionPlan.id,
          walletId: executionWalletId,
          approved: true
        })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? `Execution failed with ${response.status}`);
      }
      setExecutionPlan((payload as { data: { plan: ExecutionPlan } }).data.plan);
      await refreshDashboardData();
    } catch (requestError) {
      setExecutionError(requestError instanceof Error ? requestError.message : "Unable to deploy strategy.");
      const currentPlanId = executionPlan.id;
      const response = await fetch(`/api/strategy/executions/${currentPlanId}`).catch(() => null);
      if (response?.ok) {
        const payload = await response.json();
        setExecutionPlan((payload as { data: { plan: ExecutionPlan } }).data.plan);
      }
    } finally {
      setIsDeployingExecution(false);
    }
  }

  return (
    <main className="min-h-screen">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-md bg-primary text-primary-foreground">
                <Gauge className="h-5 w-5" />
              </div>
              <h1 className="text-2xl font-semibold">Yield Pilot</h1>
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
              onExecutionWalletId={setExecutionWalletId}
              isLoadingPortfolio={isLoadingPortfolio}
              tokenBalances={data.portfolio.tokenBalances}
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

        {walletAddress && !baseUsdcBalance ? (
          <ExecutionWarning message="No Base USDC detected in the connected wallet. V1 can only deploy idle Base USDC." />
        ) : null}

        <section className="grid gap-4 lg:grid-cols-4">
          <Metric title="Portfolio Value" value={formatCurrency(data.portfolio.totalValueUsd)} icon={CircleDollarSign} />
          <Metric title="Current APY" value={formatPercent(data.portfolio.weightedApy)} icon={Gauge} />
          <Metric title="Protocols" value={String(data.portfolio.positions.length)} icon={Network} />
          <Metric title="Recommended" value={recommended?.kind ?? "N/A"} icon={Bot} />
        </section>

        <section className="grid w-full gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.35fr)]">
          <Card className="w-full min-w-0">
            <CardHeader>
              <CardTitle>Current Allocation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.portfolio.positions.length > 0 ? (
                data.portfolio.positions.map((position) => (
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
                ))
              ) : (
                <div className="rounded-lg border border-dashed bg-muted/30 px-4 py-6 text-sm">
                  <p className="font-medium text-foreground">No active DeFi positions detected.</p>
                  <p className="mt-2 text-muted-foreground">
                    {walletAddress
                      ? "Use the recommendation panel to preview a Base USDC strategy from your idle wallet balance."
                      : "Connect a wallet to load your portfolio and discover deployable yield strategies."}
                  </p>
                  <div className="mt-4">
                    {walletAddress ? (
                      <Button variant="outline" size="sm" onClick={() => void handlePreviewStrategy()} disabled={!recommended || isPreviewingExecution || isDeployingExecution}>
                        {isPreviewingExecution ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Rocket className="mr-2 h-4 w-4" />}
                        Preview Strategy
                      </Button>
                    ) : (
                      <Badge>Wallet required</Badge>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="w-full min-w-0">
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
          <Card className="min-h-[840px]">
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

          <Card className="min-h-[840px]">
            <CardHeader className="gap-3 md:flex-row md:items-center md:justify-between">
              <CardTitle>Recommendation Panel</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void handleRefreshRecommendation()}
                disabled={!recommended || isLoadingRecommendation}
              >
                {isLoadingRecommendation ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Refresh AI
              </Button>
            </CardHeader>
            <CardContent className="max-h-[840px] overflow-y-auto">
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
              <StrategyExecutionPanel
                baseEthBalanceUsd={baseEthBalance?.valueUsd ?? 0}
                baseUsdcBalanceUsd={baseUsdcBalance?.valueUsd ?? 0}
                connected={Boolean(walletAddress)}
                executionWalletId={executionWalletId}
                isDeploying={isDeployingExecution}
                isPreviewing={isPreviewingExecution}
                onDeploy={() => void handleDeployStrategy()}
                onPreview={() => void handlePreviewStrategy()}
                plan={executionPlan}
                previewDisabled={!recommended || !walletAddress || isPreviewingExecution || isDeployingExecution}
                error={executionError}
              />
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
  onExecutionWalletId,
  isLoadingPortfolio,
  tokenBalances,
  automationSignerId,
  automationPolicyIds
}: {
  connectedAddress: string | null;
  onWalletAddress: (address: string | null) => void;
  onExecutionWalletId: (walletId: string | null) => void;
  isLoadingPortfolio: boolean;
  tokenBalances: TokenBalance[];
  automationSignerId?: string;
  automationPolicyIds: string[];
}) {
  const { ready, authenticated, login, logout, user } = usePrivy();
  const { ready: walletsReady, wallets } = useWallets();
  const { createWallet } = useCreateWallet();
  const { sendTransaction } = useSendTransaction();
  const { addSessionSigners, removeSessionSigners } = useSessionSigners();
  const [isDelegating, setIsDelegating] = useState(false);
  const [isCreatingWallet, setIsCreatingWallet] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferMode, setTransferMode] = useState<"send" | "receive">("receive");
  const [selectedTransferNetworkId, setSelectedTransferNetworkId] = useState("base");
  const [selectedTransferToken, setSelectedTransferToken] = useState<TransferToken>("native");
  const [sendRecipient, setSendRecipient] = useState("");
  const [sendAmount, setSendAmount] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendHash, setSendHash] = useState<string | null>(null);
  const [isSendingFunds, setIsSendingFunds] = useState(false);
  const [receiveCopied, setReceiveCopied] = useState(false);
  const [walletCreationError, setWalletCreationError] = useState<string | null>(null);
  const [delegationError, setDelegationError] = useState<string | null>(null);
  const [automationEnabled, setAutomationEnabled] = useState(false);
  const embeddedWallet = wallets.find(
    (wallet) => wallet.walletClientType === "privy" || wallet.walletClientType === "privy-v2"
  );
  const walletAddress = embeddedWallet?.address ?? null;
  const linkedWallet = user?.linkedAccounts.find(
    (account) =>
      account.type === "wallet" &&
      account.address.toLowerCase() === walletAddress?.toLowerCase()
  ) as DelegatedWalletMetadata | undefined;
  const delegatedWalletId = linkedWallet?.id ?? undefined;
  const isDelegated = automationEnabled || Boolean(linkedWallet?.delegated && delegatedWalletId);
  const selectedTransferNetwork =
    TRANSFER_NETWORKS.find((network) => network.id === selectedTransferNetworkId) ?? TRANSFER_NETWORKS[1];
  const selectedNetworkBalances = tokenBalances.filter((balance) => balance.chain === selectedTransferNetwork.id);
  const selectedNativeBalance =
    selectedNetworkBalances.find((balance) => balance.symbol.toUpperCase() === selectedTransferNetwork.nativeSymbol) ?? null;
  const selectedUsdcBalance =
    selectedNetworkBalances.find(
      (balance) =>
        balance.symbol.toUpperCase() === "USDC" &&
        (balance.address.toLowerCase() === selectedTransferNetwork.usdcAddress.toLowerCase() ||
          balance.address === "native")
    ) ?? selectedNetworkBalances.find((balance) => balance.symbol.toUpperCase() === "USDC") ?? null;
  const selectedTokenSymbol = selectedTransferToken === "native" ? selectedTransferNetwork.nativeSymbol : "USDC";
  const selectedTokenBalance = selectedTransferToken === "native" ? selectedNativeBalance : selectedUsdcBalance;
  const selectedNetworkValueUsd = selectedNetworkBalances.reduce((total, balance) => total + balance.valueUsd, 0);

  useEffect(() => {
    if (!ready || !walletsReady) return;
    onWalletAddress(walletAddress);
    onExecutionWalletId(delegatedWalletId ?? null);
  }, [delegatedWalletId, onExecutionWalletId, onWalletAddress, ready, walletAddress, walletsReady]);

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

  async function handleCreateEmbeddedWallet() {
    setIsCreatingWallet(true);
    setWalletCreationError(null);

    try {
      const wallet = await createWallet();
      onWalletAddress(wallet.address);
    } catch (error) {
      setWalletCreationError(error instanceof Error ? error.message : "Embedded wallet creation was not completed.");
    } finally {
      setIsCreatingWallet(false);
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

  async function handleCopyReceiveAddress() {
    if (!walletAddress) return;

    try {
      await navigator.clipboard.writeText(walletAddress);
      setReceiveCopied(true);
      window.setTimeout(() => setReceiveCopied(false), 1600);
    } catch {
      setReceiveCopied(false);
    }
  }

  async function handleSendFunds() {
    if (!walletAddress) return;

    setIsSendingFunds(true);
    setSendError(null);
    setSendHash(null);

    try {
      if (!isAddress(sendRecipient)) {
        throw new Error("Enter a valid EVM recipient address.");
      }

      const value = selectedTransferToken === "native" ? parseEther(sendAmount) : parseUnits(sendAmount, 6);
      if (value <= 0n) {
        throw new Error("Enter an amount greater than 0.");
      }

      const transaction =
        selectedTransferToken === "native"
          ? {
              to: sendRecipient,
              value,
              chainId: selectedTransferNetwork.chainId
            }
          : {
              to: selectedTransferNetwork.usdcAddress,
              value: 0n,
              data: encodeFunctionData({
                abi: ERC20_TRANSFER_ABI,
                functionName: "transfer",
                args: [sendRecipient, value]
              }),
              chainId: selectedTransferNetwork.chainId
            };

      const result = await sendTransaction(transaction, { address: walletAddress });

      setSendHash(result.hash);
      setSendRecipient("");
      setSendAmount("");
    } catch (error) {
      setSendError(error instanceof Error ? error.message : "Send transaction was not completed.");
    } finally {
      setIsSendingFunds(false);
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
      <Button onClick={() => login({ loginMethods: ["email"] })}>
        <WalletCards className="mr-2 h-4 w-4" />
        Connect Wallet
      </Button>
    );
  }

  if (!walletsReady) {
    return (
      <Button disabled>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading Wallet
      </Button>
    );
  }

  if (!connectedAddress) {
    return (
      <div className="flex flex-col items-start gap-2 md:items-end">
        <Button onClick={() => void handleCreateEmbeddedWallet()} disabled={isCreatingWallet}>
          {isCreatingWallet ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <WalletCards className="mr-2 h-4 w-4" />}
          Create Embedded Wallet
        </Button>
        <p className="max-w-xl text-xs text-muted-foreground">
          Create the Privy embedded wallet used for portfolio loading and automation.
        </p>
        {walletCreationError ? <p className="max-w-xl text-xs text-destructive">{walletCreationError}</p> : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-2 md:items-end">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" disabled={isLoadingPortfolio}>
          {isLoadingPortfolio ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <WalletCards className="mr-2 h-4 w-4" />}
          {shortAddress(connectedAddress)}
        </Button>
        <Button variant="secondary" onClick={() => setTransferModalOpen(true)}>
          <Send className="mr-2 h-4 w-4" />
          Send / Receive
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
      {transferModalOpen && walletAddress ? (
        <WalletTransferModal
          amount={sendAmount}
          copied={receiveCopied}
          error={sendError}
          isSending={isSendingFunds}
          mode={transferMode}
          network={selectedTransferNetwork}
          selectedToken={selectedTransferToken}
          selectedTokenBalance={selectedTokenBalance}
          selectedTokenSymbol={selectedTokenSymbol}
          usdcBalance={selectedUsdcBalance}
          networkValueUsd={selectedNetworkValueUsd}
          networks={TRANSFER_NETWORKS}
          onAmount={setSendAmount}
          onClose={() => setTransferModalOpen(false)}
          onCopy={() => void handleCopyReceiveAddress()}
          onMode={setTransferMode}
          onNetwork={(networkId) => {
            setSelectedTransferNetworkId(networkId);
            setSendError(null);
            setSendHash(null);
          }}
          onRecipient={setSendRecipient}
          onSend={() => void handleSendFunds()}
          onToken={(token) => {
            setSelectedTransferToken(token);
            setSendError(null);
            setSendHash(null);
          }}
          recipient={sendRecipient}
          txHash={sendHash}
          walletAddress={walletAddress}
        />
      ) : null}
    </div>
  );
}

function WalletTransferModal({
  amount,
  copied,
  error,
  isSending,
  mode,
  network,
  networkValueUsd,
  networks,
  onAmount,
  onClose,
  onCopy,
  onMode,
  onNetwork,
  onRecipient,
  onSend,
  onToken,
  recipient,
  selectedToken,
  selectedTokenBalance,
  selectedTokenSymbol,
  txHash,
  usdcBalance,
  walletAddress
}: {
  amount: string;
  copied: boolean;
  error: string | null;
  isSending: boolean;
  mode: "send" | "receive";
  network: TransferNetwork;
  networkValueUsd: number;
  networks: TransferNetwork[];
  onAmount: (amount: string) => void;
  onClose: () => void;
  onCopy: () => void;
  onMode: (mode: "send" | "receive") => void;
  onNetwork: (networkId: string) => void;
  onRecipient: (recipient: string) => void;
  onSend: () => void;
  onToken: (token: TransferToken) => void;
  recipient: string;
  selectedToken: TransferToken;
  selectedTokenBalance: TokenBalance | null;
  selectedTokenSymbol: string;
  txHash: string | null;
  usdcBalance: TokenBalance | null;
  walletAddress: string;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 px-4 py-8">
      <div className="w-full max-w-lg rounded-lg border bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
          <div>
            <h3 className="text-base font-semibold text-foreground">Send / Receive</h3>
            <p className="mt-1 text-xs text-muted-foreground">Manage funds for your Privy embedded wallet.</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>

        <div className="space-y-4 px-5 py-5">
          <div className="grid grid-cols-2 rounded-md border p-1">
            <Button variant={mode === "receive" ? "secondary" : "ghost"} size="sm" onClick={() => onMode("receive")}>
              <Download className="mr-2 h-4 w-4" />
              Receive
            </Button>
            <Button variant={mode === "send" ? "secondary" : "ghost"} size="sm" onClick={() => onMode("send")}>
              <Send className="mr-2 h-4 w-4" />
              Send
            </Button>
          </div>

          <label className="grid gap-2 text-sm">
            <span className="font-medium text-foreground">Network</span>
            <select
              className="h-10 rounded-md border bg-white px-3 text-sm outline-none focus:border-primary"
              value={network.id}
              onChange={(event) => onNetwork(event.target.value)}
            >
              {networks.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm">
            <span className="font-medium text-foreground">Asset</span>
            <select
              className="h-10 rounded-md border bg-white px-3 text-sm outline-none focus:border-primary"
              value={selectedToken}
              onChange={(event) => onToken(event.target.value as TransferToken)}
            >
              <option value="native">{network.nativeSymbol}</option>
              <option value="usdc">USDC</option>
            </select>
          </label>

          <div className="grid gap-2 rounded-md border bg-muted/30 p-3 text-xs sm:grid-cols-2">
            <div>
              <p className="text-muted-foreground">{selectedTokenSymbol} balance</p>
              <p className="mt-1 font-medium text-foreground">
                {selectedTokenBalance
                  ? `${selectedTokenBalance.amount.toLocaleString(undefined, { maximumFractionDigits: 6 })} ${selectedTokenSymbol}`
                  : `0 ${selectedTokenSymbol}`}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Total on {network.label}</p>
              <p className="mt-1 font-medium text-foreground">{formatCurrency(networkValueUsd)}</p>
            </div>
          </div>

          {mode === "receive" ? (
            <div className="space-y-3">
              <div className="rounded-md border bg-muted/30 p-4">
                <p className="text-xs text-muted-foreground">Receive address on {network.label}</p>
                <p className="mt-2 break-all font-mono text-sm text-foreground">{walletAddress}</p>
              </div>
              <Button variant="outline" onClick={onCopy}>
                <Copy className="mr-2 h-4 w-4" />
                {copied ? "Copied" : "Copy Address"}
              </Button>
              <p className="text-xs leading-5 text-muted-foreground">
                This embedded wallet uses the same EVM address on each listed network. It can receive {network.nativeSymbol} and USDC on {network.label}.
                {usdcBalance ? ` Indexed USDC balance: ${usdcBalance.amount.toLocaleString(undefined, { maximumFractionDigits: 6 })} USDC.` : ""}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <label className="grid gap-2 text-sm">
                <span className="font-medium text-foreground">Recipient</span>
                <input
                  className="h-10 rounded-md border px-3 text-sm outline-none focus:border-primary"
                  placeholder="0x..."
                  value={recipient}
                  onChange={(event) => onRecipient(event.target.value)}
                />
              </label>
              <label className="grid gap-2 text-sm">
                <span className="font-medium text-foreground">Amount ({selectedTokenSymbol})</span>
                <input
                  className="h-10 rounded-md border px-3 text-sm outline-none focus:border-primary"
                  inputMode="decimal"
                  min="0"
                  placeholder="0.0"
                  type="number"
                  value={amount}
                  onChange={(event) => onAmount(event.target.value)}
                />
              </label>
              <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                Sends {selectedTokenSymbol} from the embedded wallet on {network.label}.
                {selectedToken === "usdc" ? ` USDC contract: ${network.usdcAddress}.` : ""}
                {selectedTokenBalance
                  ? ` Available: ${selectedTokenBalance.amount.toLocaleString(undefined, { maximumFractionDigits: 6 })} ${selectedTokenSymbol}.`
                  : ""}
              </div>
              {error ? <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p> : null}
              {txHash ? (
                <a
                  className="block break-all rounded-md bg-primary/10 px-3 py-2 text-xs font-medium text-primary underline-offset-4 hover:underline"
                  href={`${network.explorerUrl}${txHash}`}
                  rel="noreferrer"
                  target="_blank"
                >
                  Transaction submitted: {txHash}
                </a>
              ) : null}
              <Button onClick={onSend} disabled={isSending || !recipient || !amount}>
                {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Send {selectedTokenSymbol}
              </Button>
            </div>
          )}
        </div>
      </div>
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

function StrategyExecutionPanel({
  baseEthBalanceUsd,
  baseUsdcBalanceUsd,
  connected,
  error,
  executionWalletId,
  isDeploying,
  isPreviewing,
  onDeploy,
  onPreview,
  plan,
  previewDisabled
}: {
  baseEthBalanceUsd: number;
  baseUsdcBalanceUsd: number;
  connected: boolean;
  error: string | null;
  executionWalletId: string | null;
  isDeploying: boolean;
  isPreviewing: boolean;
  onDeploy: () => void;
  onPreview: () => void;
  plan: ExecutionPlan | null;
  previewDisabled: boolean;
}) {
  const totalEstimatedGasUsd = plan?.steps.reduce((total, step) => total + step.estimatedGasUsd, 0) ?? 0;
  const planIsBaseOnly = Boolean(
    plan?.steps.length && plan.steps.every((step) => step.chain === "base" && step.chainId === EXECUTION_CHAIN_ID)
  );
  const simulationsPassed = Boolean(plan?.steps.length && plan.steps.every((step) => step.simulationPassed));
  const hasBaseUsdc = baseUsdcBalanceUsd > 0;
  const hasEnoughBaseEthForGas = !plan || totalEstimatedGasUsd <= 0 || baseEthBalanceUsd >= totalEstimatedGasUsd;
  const canDeploy = Boolean(
    plan &&
      executionWalletId &&
      hasBaseUsdc &&
      planIsBaseOnly &&
      simulationsPassed &&
      hasEnoughBaseEthForGas &&
      !isDeploying &&
      !isPreviewing
  );

  return (
    <div className="mt-5 border-t pt-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h4 className="text-sm font-semibold text-foreground">Strategy Execution</h4>
          <p className="mt-1 text-xs text-muted-foreground">
            Preview the exact Base USDC transactions before approving deployment.
          </p>
        </div>
        <Badge className="bg-muted text-foreground">Execution network: {EXECUTION_NETWORK_LABEL}</Badge>
      </div>

      <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
        <div className="rounded-md border px-3 py-2">
          <p className="text-muted-foreground">Base USDC</p>
          <p className="mt-1 font-medium text-foreground">{formatCurrency(baseUsdcBalanceUsd)}</p>
        </div>
        <div className="rounded-md border px-3 py-2">
          <p className="text-muted-foreground">Base ETH gas balance</p>
          <p className="mt-1 font-medium text-foreground">{formatCurrency(baseEthBalanceUsd)}</p>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {connected && plan && !hasEnoughBaseEthForGas ? (
          <ExecutionWarning
            message={`Insufficient Base ETH for estimated gas. Plan estimates ${formatCurrency(
              totalEstimatedGasUsd
            )}; wallet shows ${formatCurrency(baseEthBalanceUsd)}.`}
          />
        ) : null}
        {plan && !planIsBaseOnly ? (
          <ExecutionWarning message="This execution plan is not Base-only. Deployment is disabled." />
        ) : null}
        {plan && !simulationsPassed ? (
          <ExecutionWarning message="One or more simulations have not passed. Deployment is disabled." />
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={onPreview} disabled={previewDisabled}>
          {isPreviewing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Rocket className="mr-2 h-4 w-4" />}
          Preview Strategy
        </Button>
        <Button size="sm" onClick={onDeploy} disabled={!canDeploy}>
          {isDeploying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
          Approve & Deploy
        </Button>
      </div>

      {!connected ? (
        <p className="mt-3 text-xs text-muted-foreground">Connect a wallet before previewing execution.</p>
      ) : !executionWalletId ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Enable automation first so the server can execute through the delegated embedded wallet.
        </p>
      ) : null}

      {error ? <p className="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p> : null}

      {plan ? (
        <div className="mt-4 space-y-4">
          <div className="grid gap-2 rounded-lg border p-3 text-xs sm:grid-cols-3">
            <div>
              <p className="text-muted-foreground">Scenario</p>
              <p className="mt-1 font-medium text-foreground">{plan.scenarioKind}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Deploy Amount</p>
              <p className="mt-1 font-medium text-foreground">{formatCurrency(plan.totalAmountUsd)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Status</p>
              <p className="mt-1 font-medium capitalize text-foreground">{plan.status}</p>
            </div>
          </div>

          <div className="space-y-2">
            {plan.steps.map((step, index) => (
              <div key={step.id} className="rounded-lg border p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {index + 1}. {step.protocol} {step.type}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatCurrency(step.amountUsd)} {step.tokenSymbol} on {step.chain}
                    </p>
                  </div>
                  <Badge>{step.status}</Badge>
                </div>
                <dl className="mt-3 grid gap-2 text-xs text-muted-foreground">
                  <div>
                    <dt>Target</dt>
                    <dd className="break-all font-mono text-foreground">{step.target}</dd>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div>
                      <dt>Estimated gas</dt>
                      <dd className="text-foreground">{formatCurrency(step.estimatedGasUsd)}</dd>
                    </div>
                    <div>
                      <dt>Simulation</dt>
                      <dd className="text-foreground">{step.simulationPassed ? "Passed" : "Not passed"}</dd>
                    </div>
                  </div>
                  {step.txHash ? (
                    <div>
                      <dt>Transaction</dt>
                      <dd className="break-all font-mono text-foreground">{step.txHash}</dd>
                    </div>
                  ) : null}
                </dl>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ExecutionWarning({ message }: { message: string }) {
  return (
    <div className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <p>{message}</p>
    </div>
  );
}

function shortAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
