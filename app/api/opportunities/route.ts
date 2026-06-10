import { NextResponse } from "next/server";
import { sampleOpportunities } from "@/lib/data/sample";
import { getYieldOpportunities } from "@/lib/clients/defillama";

export async function GET() {
  try {
    return NextResponse.json({ data: await getYieldOpportunities() });
  } catch (error) {
    return NextResponse.json({
      data: sampleOpportunities,
      warning: error instanceof Error ? error.message : "Yield provider failed; returned fixture data."
    });
  }
}
