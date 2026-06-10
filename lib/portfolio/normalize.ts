import type { Portfolio, ProtocolPosition, TokenBalance } from "@/lib/types";

type DebankToken = {
  chain?: string;
  id?: string;
  optimized_symbol?: string;
  symbol?: string;
  amount?: number;
  price?: number;
};

type DebankProtocol = {
  id?: string;
  name?: string;
  chain?: string;
  portfolio_item_list?: Array<{
    stats?: { net_usd_value?: number };
    detail?: { supply_token_list?: Array<{ symbol?: string }> };
    proxy_detail?: { supply_token_list?: Array<{ symbol?: string }> };
  }>;
};

export function normalizeTokenBalances(rawTokens: DebankToken[]): TokenBalance[] {
  return rawTokens
    .map((token) => {
      const amount = Number(token.amount ?? 0);
      const priceUsd = Number(token.price ?? 0);
      return {
        chain: token.chain ?? "unknown",
        address: token.id ?? "native",
        symbol: token.optimized_symbol ?? token.symbol ?? "UNKNOWN",
        amount,
        priceUsd,
        valueUsd: amount * priceUsd
      };
    })
    .filter((token) => token.valueUsd > 0);
}

export function normalizeProtocolPositions(rawProtocols: DebankProtocol[]): ProtocolPosition[] {
  return rawProtocols.flatMap((protocol) =>
    (protocol.portfolio_item_list ?? [])
      .map((item, index) => {
        const tokens =
          item.detail?.supply_token_list ?? item.proxy_detail?.supply_token_list ?? [];
        const valueUsd = Number(item.stats?.net_usd_value ?? 0);
        return {
          id: `${protocol.id ?? protocol.name ?? "protocol"}-${index}`,
          protocol: protocol.name ?? protocol.id ?? "Unknown Protocol",
          chain: protocol.chain ?? "unknown",
          asset: tokens.map((token) => token.symbol).filter(Boolean).join("-") || "UNKNOWN",
          valueUsd,
          apy: 0
        };
      })
      .filter((position) => position.valueUsd > 0)
  );
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
