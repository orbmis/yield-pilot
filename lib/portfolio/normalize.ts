import type { Portfolio, ProtocolPosition, TokenBalance } from "@/lib/types";

type ZapperTokenNode = {
  balance?: number | string | null;
  balanceUSD?: number | string | null;
  symbol?: string | null;
  name?: string | null;
  tokenAddress?: string | null;
  network?: {
    name?: string | null;
    slug?: string | null;
  } | null;
};

type ZapperProtocolNode = {
  balanceUSD?: number | string | null;
  app?: {
    displayName?: string | null;
    slug?: string | null;
  } | null;
  network?: {
    name?: string | null;
    slug?: string | null;
  } | null;
  products?: Array<{
    label?: string | null;
    assets?: Array<{
      balanceUSD?: number | string | null;
      symbol?: string | null;
      tokens?: Array<{ symbol?: string | null }> | null;
    }> | null;
  }> | null;
};

type ZapperPortfolioResponse = {
  portfolioV2?: {
    tokenBalances?: {
      byToken?: {
        edges?: Array<{ node?: ZapperTokenNode | null }> | null;
      } | null;
    } | null;
    appBalances?: {
      byApp?: {
        edges?: Array<{ node?: ZapperProtocolNode | null }> | null;
      } | null;
    } | null;
  } | null;
};

function asZapperPortfolioResponse(data: unknown): ZapperPortfolioResponse {
  return typeof data === "object" && data !== null ? (data as ZapperPortfolioResponse) : {};
}

function toNumber(value: number | string | null | undefined) {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function normalizeChainName(network?: { name?: string | null; slug?: string | null } | null) {
  return network?.slug ?? network?.name?.toLowerCase().replace(/\s+/g, "-") ?? "unknown";
}

export function normalizeZapperTokenBalances(data: unknown): TokenBalance[] {
  const edges = asZapperPortfolioResponse(data).portfolioV2?.tokenBalances?.byToken?.edges ?? [];

  return edges
    .map((edge) => {
      const token = edge.node;
      if (!token) return null;

      const amount = toNumber(token.balance);
      const valueUsd = toNumber(token.balanceUSD);
      const priceUsd = amount > 0 ? valueUsd / amount : 0;

      return {
        chain: normalizeChainName(token.network),
        address: token.tokenAddress ?? "native",
        symbol: token.symbol ?? token.name ?? "UNKNOWN",
        amount,
        priceUsd,
        valueUsd
      };
    })
    .filter((token): token is TokenBalance => Boolean(token && token.valueUsd > 0));
}

export function normalizeZapperProtocolPositions(data: unknown): ProtocolPosition[] {
  const edges = asZapperPortfolioResponse(data).portfolioV2?.appBalances?.byApp?.edges ?? [];

  return edges
    .map((edge, index) => {
      const position = edge.node;
      if (!position) return null;

      const valueUsd = toNumber(position.balanceUSD);
      const protocol = position.app?.displayName ?? position.app?.slug ?? "Unknown Protocol";
      const asset =
        position.products
          ?.flatMap((product) =>
            product.assets?.flatMap((asset) => [
              asset.symbol,
              ...(asset.tokens?.map((token) => token.symbol) ?? [])
            ]) ?? []
          )
          .filter(Boolean)
          .join("-") || "UNKNOWN";

      return {
        id: `${position.app?.slug ?? protocol}-${index}`,
        protocol,
        chain: normalizeChainName(position.network),
        asset,
        valueUsd,
        apy: 0
      };
    })
    .filter((position): position is ProtocolPosition => Boolean(position && position.valueUsd > 0));
}

export function buildPortfolio(walletAddress: string, balances: TokenBalance[], positions: ProtocolPosition[]): Portfolio {
  const liquidValue = balances.reduce((sum, token) => sum + token.valueUsd, 0);
  const positionValue = positions.reduce((sum, position) => sum + position.valueUsd, 0);
  const weightedApy =
    positionValue === 0
      ? 0
      : positions.reduce((sum, position) => sum + position.valueUsd * position.apy, 0) / positionValue;

  return {
    walletAddress,
    totalValueUsd: liquidValue + positionValue,
    weightedApy,
    tokenBalances: balances,
    positions
  };
}
