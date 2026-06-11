CREATE TABLE "AiRecommendationCache" (
    "id" TEXT NOT NULL,
    "cacheKey" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "recommendation" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiRecommendationCache_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AiRecommendationCache_cacheKey_key" ON "AiRecommendationCache"("cacheKey");
