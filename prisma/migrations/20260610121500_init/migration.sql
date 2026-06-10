CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "privyUserId" TEXT NOT NULL,
  "email" TEXT,
  "walletAddress" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Portfolio" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "walletAddress" TEXT NOT NULL,
  "totalValueUsd" DECIMAL(18,2) NOT NULL,
  "weightedApy" DECIMAL(9,4) NOT NULL,
  "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Portfolio_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Balance" (
  "id" TEXT NOT NULL,
  "portfolioId" TEXT NOT NULL,
  "chain" TEXT NOT NULL,
  "tokenAddress" TEXT NOT NULL,
  "symbol" TEXT NOT NULL,
  "amount" DECIMAL(36,18) NOT NULL,
  "priceUsd" DECIMAL(18,8) NOT NULL,
  "valueUsd" DECIMAL(18,2) NOT NULL,
  CONSTRAINT "Balance_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Position" (
  "id" TEXT NOT NULL,
  "portfolioId" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "protocol" TEXT NOT NULL,
  "chain" TEXT NOT NULL,
  "asset" TEXT NOT NULL,
  "valueUsd" DECIMAL(18,2) NOT NULL,
  "apy" DECIMAL(9,4) NOT NULL,
  CONSTRAINT "Position_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "YieldOpportunity" (
  "id" TEXT NOT NULL,
  "pool" TEXT NOT NULL,
  "protocol" TEXT NOT NULL,
  "chain" TEXT NOT NULL,
  "symbol" TEXT NOT NULL,
  "apy" DECIMAL(9,4) NOT NULL,
  "tvlUsd" DECIMAL(18,2) NOT NULL,
  "stablecoin" BOOLEAN NOT NULL DEFAULT false,
  "url" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "YieldOpportunity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Scenario" (
  "id" TEXT NOT NULL,
  "portfolioId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "totalAllocatedUsd" DECIMAL(18,2) NOT NULL,
  "projectedYieldUsd" DECIMAL(18,2) NOT NULL,
  "estimatedCostsUsd" DECIMAL(18,2) NOT NULL,
  "netYieldUsd" DECIMAL(18,2) NOT NULL,
  "weightedApy" DECIMAL(9,4) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Scenario_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ScenarioAllocation" (
  "id" TEXT NOT NULL,
  "scenarioId" TEXT NOT NULL,
  "opportunityId" TEXT NOT NULL,
  "protocol" TEXT NOT NULL,
  "chain" TEXT NOT NULL,
  "symbol" TEXT NOT NULL,
  "amountUsd" DECIMAL(18,2) NOT NULL,
  "allocationPercent" DECIMAL(9,4) NOT NULL,
  "apy" DECIMAL(9,4) NOT NULL,
  "projectedYieldUsd" DECIMAL(18,2) NOT NULL,
  "estimatedCostUsd" DECIMAL(18,2) NOT NULL,
  "netYieldUsd" DECIMAL(18,2) NOT NULL,
  CONSTRAINT "ScenarioAllocation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_privyUserId_key" ON "User"("privyUserId");
CREATE INDEX "Portfolio_walletAddress_idx" ON "Portfolio"("walletAddress");
CREATE INDEX "YieldOpportunity_protocol_chain_idx" ON "YieldOpportunity"("protocol", "chain");

ALTER TABLE "Portfolio" ADD CONSTRAINT "Portfolio_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Balance" ADD CONSTRAINT "Balance_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Position" ADD CONSTRAINT "Position_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Scenario" ADD CONSTRAINT "Scenario_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScenarioAllocation" ADD CONSTRAINT "ScenarioAllocation_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "Scenario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
