import { samplePortfolio } from "@/lib/data/sample";
import { buildPortfolio, normalizeZapperProtocolPositions, normalizeZapperTokenBalances } from "@/lib/portfolio/normalize";
import type { Portfolio } from "@/lib/types";

const ZAPPER_GRAPHQL_URL = "https://public.zapper.xyz/graphql";

type ZapperGraphQlResponse<T> = {
  data?: T;
  errors?: Array<{ message?: string }>;
};

const TOKEN_BALANCES_QUERY = `
  query YieldPilotTokenBalances($addresses: [Address!]!, $networks: [Network!]) {
    portfolioV2(addresses: $addresses, networks: $networks) {
      tokenBalances {
        byToken {
          edges {
            node {
              balance
              balanceRaw
              balanceUSD
              symbol
              name
              tokenAddress
              network {
                name
                slug
              }
            }
          }
        }
      }
    }
  }
`;

const PROTOCOL_POSITIONS_QUERY = `
  query YieldPilotProtocolPositions($addresses: [Address!]!, $networks: [Network!]) {
    portfolioV2(addresses: $addresses, networks: $networks) {
      appBalances {
        byApp {
          edges {
            node {
              balanceUSD
              app {
                displayName
                slug
              }
              network {
                name
                slug
              }
              products {
                label
                assets {
                  balanceUSD
                  symbol
                  tokens {
                    symbol
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`;

async function zapperFetch<T>(query: string, walletAddress: string): Promise<T> {
  const apiKey = process.env.ZAPPER_API_KEY;
  if (!apiKey) {
    throw new Error("ZAPPER_API_KEY is not configured");
  }

  const networks = (process.env.ZAPPER_NETWORKS ?? "")
    .split(",")
    .map((network) => network.trim())
    .filter(Boolean);

  const response = await fetch(ZAPPER_GRAPHQL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-zapper-api-key": apiKey
    },
    body: JSON.stringify({
      query,
      variables: {
        addresses: [walletAddress],
        networks: networks.length > 0 ? networks : null
      }
    }),
    cache: "no-store"
  });

  const payload = (await response.json().catch(() => null)) as ZapperGraphQlResponse<T> | null;

  if (!response.ok) {
    const providerMessage = payload?.errors?.map((error) => error.message).filter(Boolean).join(" ") ?? "";
    throw new Error(
      `Zapper request failed: ${response.status}${providerMessage ? `: ${providerMessage.slice(0, 240)}` : ""}`
    );
  }

  if (payload?.errors?.length) {
    throw new Error(`Zapper GraphQL error: ${payload.errors.map((error) => error.message).filter(Boolean).join(" ")}`);
  }

  if (!payload?.data) {
    throw new Error("Zapper request returned no data");
  }

  return payload.data;
}

export async function getTokenBalances(walletAddress: string) {
  const data = await zapperFetch<unknown>(TOKEN_BALANCES_QUERY, walletAddress);
  return normalizeZapperTokenBalances(data);
}

export async function getProtocolPositions(walletAddress: string) {
  const data = await zapperFetch<unknown>(PROTOCOL_POSITIONS_QUERY, walletAddress);
  return normalizeZapperProtocolPositions(data);
}

export async function getPortfolio(walletAddress: string): Promise<Portfolio> {
  if (process.env.USE_FIXTURES === "true") {
    return { ...samplePortfolio, walletAddress };
  }

  const balances = await getTokenBalances(walletAddress);
  const positions = await getProtocolPositions(walletAddress).catch(() => []);

  return buildPortfolio(walletAddress, balances, positions);
}
