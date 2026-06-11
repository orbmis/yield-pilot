import { NextResponse } from "next/server";
import { z } from "zod";
import { explainRecommendation } from "@/lib/ai/recommendation";
import {
  AI_RECOMMENDATION_PROMPT_VERSION,
  buildAiRecommendationCacheKey
} from "@/lib/ai/recommendation-cache";
import { prisma } from "@/lib/db/prisma";

const RequestSchema = z.object({
  portfolio: z.unknown(),
  opportunities: z.array(z.unknown()),
  scenarios: z.array(z.unknown()),
  constraints: z.object({
    maximumProtocolCount: z.number(),
    maximumAllocationPercent: z.number()
  }),
  forceRefresh: z.boolean().optional()
});

const SERVER_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export async function POST(request: Request) {
  try {
    const payload = RequestSchema.parse(await request.json());
    const { forceRefresh, ...recommendationInput } = payload;
    const model = process.env.OPENAI_MODEL ?? "gpt-5.2";
    const cacheKey = buildAiRecommendationCacheKey(recommendationInput as never, {
      model,
      openaiConfigured: Boolean(process.env.OPENAI_API_KEY)
    });

    if (!forceRefresh) {
      try {
        const cachedRecommendation = await prisma.aiRecommendationCache.findUnique({
          where: { cacheKey }
        });

        if (cachedRecommendation && Date.now() - cachedRecommendation.updatedAt.getTime() < SERVER_CACHE_TTL_MS) {
          return NextResponse.json({
            data: {
              recommendation: cachedRecommendation.recommendation,
              cached: true
            }
          });
        }
      } catch (cacheError) {
        console.warn("AI recommendation cache read failed", cacheError);
      }
    }

    const recommendation = await explainRecommendation(recommendationInput as never);

    try {
      await prisma.aiRecommendationCache.upsert({
        where: { cacheKey },
        update: {
          recommendation,
          model,
          promptVersion: AI_RECOMMENDATION_PROMPT_VERSION
        },
        create: {
          cacheKey,
          recommendation,
          model,
          promptVersion: AI_RECOMMENDATION_PROMPT_VERSION
        }
      });
    } catch (cacheError) {
      console.warn("AI recommendation cache write failed", cacheError);
    }

    return NextResponse.json({ data: { recommendation, cached: false } });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to generate recommendation."
      },
      { status: 502 }
    );
  }
}
