import { samplePortfolio } from "@/lib/data/sample";
import { buildPortfolio, normalizeProtocolPositions, normalizeTokenBalances } from "@/lib/portfolio/normalize";
import type { Portfolio } from "@/lib/types";

const DEBANK_BASE_URL = "https://pro-openapi.debank.com/v1";

async function debankFetch<T>(path: string): Promise<T> {
  const accessKey = process.env.DEBANK_ACCESS_KEY;
  if (!accessKey) {
    throw new Error("DEBANK_ACCESS_KEY is not configured");
  }

  const response = await fetch(`${DEBANK_BASE_URL}${path}`, {
    headers: {
      AccessKey: accessKey,
      accept: "application/json"
    },
    next: { revalidate: 60 }
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    if (response.status === 401 || response.status === 403) {
      throw new Error(
        [
          `DeBank request failed: ${response.status}.`,
          "Check that DEBANK_ACCESS_KEY is a Pro OpenAPI key with permission for wallet portfolio endpoints.",
          "Also check whether the key has an IP/domain allowlist, quota limit, or billing restriction in the DeBank console.",
          body ? `Provider response: ${body.slice(0, 240)}` : ""
        ]
          .filter(Boolean)
          .join(" ")
      );
    }

    throw new Error(`DeBank request failed: ${response.status}${body ? `: ${body.slice(0, 240)}` : ""}`);
  }

  return response.json() as Promise<T>;
}

export async function getTokenBalances(walletAddress: string) {
  const raw = await debankFetch<unknown[]>(`/user/token_list?id=${walletAddress}&is_all=true`);
  return normalizeTokenBalances(raw as never[]);
}

export async function getProtocolPositions(walletAddress: string) {
  const protocols = await debankFetch<Array<{ id: string }>>(`/user/all_complex_protocol_list?id=${walletAddress}`);
  const details = await Promise.all(
    protocols.slice(0, 12).map((protocol) =>
      debankFetch(`/user/complex_protocol?id=${walletAddress}&protocol_id=${protocol.id}`).catch(() => null)
    )
  );
  return normalizeProtocolPositions(details.filter(Boolean) as never[]);
}

export async function getPortfolio(walletAddress: string): Promise<Portfolio> {
  if (process.env.USE_FIXTURES === "true") {
    return { ...samplePortfolio, walletAddress };
  }

  const [balances, positions] = await Promise.all([
    getTokenBalances(walletAddress),
    getProtocolPositions(walletAddress)
  ]);

  return buildPortfolio(walletAddress, balances, positions);
}
