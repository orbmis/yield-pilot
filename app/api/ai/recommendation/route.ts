import { NextResponse } from "next/server";
import { z } from "zod";
import { explainRecommendation } from "@/lib/ai/recommendation";

const RequestSchema = z.object({
  portfolio: z.unknown(),
  opportunities: z.array(z.unknown()),
  scenarios: z.array(z.unknown()),
  constraints: z.object({
    maximumProtocolCount: z.number(),
    maximumAllocationPercent: z.number()
  })
});

export async function POST(request: Request) {
  try {
    const payload = RequestSchema.parse(await request.json());
    const recommendation = await explainRecommendation(payload as never);
    return NextResponse.json({ data: { recommendation } });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to generate recommendation."
      },
      { status: 502 }
    );
  }
}
