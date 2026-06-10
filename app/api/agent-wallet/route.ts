import { NextResponse } from "next/server";
import { getAgentWalletStatus } from "@/lib/agentkit/wallet";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const walletId = url.searchParams.get("walletId") ?? undefined;

  try {
    return NextResponse.json({ data: await getAgentWalletStatus(walletId) });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to initialize delegated wallet provider."
      },
      { status: 502 }
    );
  }
}
