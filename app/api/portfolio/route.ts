import { NextRequest, NextResponse } from "next/server";
import { samplePortfolio } from "@/lib/data/sample";
import { getPortfolio, getProtocolPositions, getTokenBalances } from "@/lib/clients/zapper";

export async function GET(request: NextRequest) {
  const walletAddress = request.nextUrl.searchParams.get("wallet") ?? samplePortfolio.walletAddress;
  const type = request.nextUrl.searchParams.get("type") ?? "portfolio";

  try {
    if (type === "balances") {
      return NextResponse.json({ data: await getTokenBalances(walletAddress) });
    }

    if (type === "positions") {
      return NextResponse.json({ data: await getProtocolPositions(walletAddress) });
    }

    return NextResponse.json({ data: await getPortfolio(walletAddress) });
  } catch (error) {
    if (process.env.USE_FIXTURES !== "true") {
      return NextResponse.json(
        {
          error: error instanceof Error ? error.message : "Portfolio provider failed."
        },
        { status: 502 }
      );
    }

    return NextResponse.json(
      {
        data: { ...samplePortfolio, walletAddress },
        warning: error instanceof Error ? error.message : "Portfolio provider failed; returned fixture data."
      },
      { status: 200 }
    );
  }
}
