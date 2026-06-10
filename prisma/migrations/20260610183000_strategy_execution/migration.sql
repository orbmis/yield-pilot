CREATE TABLE "StrategyExecution" (
  "id" TEXT NOT NULL,
  "walletAddress" TEXT NOT NULL,
  "scenarioKind" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "totalAmountUsd" DECIMAL(18,2) NOT NULL,
  "maxGasUsd" DECIMAL(18,2) NOT NULL,
  "maxApprovalUsd" DECIMAL(18,2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "approvedAt" TIMESTAMP(3),
  "executedAt" TIMESTAMP(3),

  CONSTRAINT "StrategyExecution_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StrategyExecutionStep" (
  "id" TEXT NOT NULL,
  "executionId" TEXT NOT NULL,
  "stepType" TEXT NOT NULL,
  "protocol" TEXT NOT NULL,
  "chain" TEXT NOT NULL,
  "chainId" INTEGER NOT NULL,
  "tokenAddress" TEXT NOT NULL,
  "tokenSymbol" TEXT NOT NULL,
  "amountRaw" TEXT NOT NULL,
  "amountUsd" DECIMAL(18,2) NOT NULL,
  "target" TEXT NOT NULL,
  "calldata" TEXT NOT NULL,
  "estimatedGasUsd" DECIMAL(18,2) NOT NULL,
  "simulationPassed" BOOLEAN NOT NULL DEFAULT false,
  "simulationId" TEXT,
  "txHash" TEXT,
  "status" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "StrategyExecutionStep_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StrategyExecution_walletAddress_createdAt_idx" ON "StrategyExecution"("walletAddress", "createdAt");
CREATE INDEX "StrategyExecutionStep_executionId_status_idx" ON "StrategyExecutionStep"("executionId", "status");

ALTER TABLE "StrategyExecutionStep" ADD CONSTRAINT "StrategyExecutionStep_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "StrategyExecution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
