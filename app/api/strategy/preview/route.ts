import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { createPreviewPlan, serializeExecutionStep } from "@/lib/execution/preview";
import type { ExecutionPlan, ScenarioKind } from "@/lib/types";

const RequestSchema = z.object({
  wallet: z.string().min(1),
  scenarioKind: z.enum(["Conservative", "Balanced", "Yield Maximized"]),
  constraints: z
    .object({
      maximumProtocolCount: z.number().int().min(1).max(10).default(3),
      maximumAllocationPercent: z.number().min(10).max(100).default(45)
    })
    .default({
      maximumProtocolCount: 3,
      maximumAllocationPercent: 45
    })
});

type StrategyExecutionWithSteps = Prisma.StrategyExecutionGetPayload<{
  include: { steps: true };
}>;

function toExecutionPlan(record: StrategyExecutionWithSteps): ExecutionPlan {
  return {
    id: record.id,
    walletAddress: record.walletAddress,
    scenarioKind: record.scenarioKind as ScenarioKind,
    status: record.status as ExecutionPlan["status"],
    totalAmountUsd: Number(record.totalAmountUsd),
    maxGasUsd: Number(record.maxGasUsd),
    maxApprovalUsd: Number(record.maxApprovalUsd),
    createdAt: record.createdAt.toISOString(),
    approvedAt: record.approvedAt?.toISOString(),
    executedAt: record.executedAt?.toISOString(),
    steps: record.steps.map((step) => ({
      id: step.id,
      type: step.stepType as ExecutionPlan["steps"][number]["type"],
      protocol: step.protocol as ExecutionPlan["steps"][number]["protocol"],
      chain: "base",
      chainId: 8453,
      tokenAddress: step.tokenAddress,
      tokenSymbol: "USDC",
      amountRaw: step.amountRaw,
      amountUsd: Number(step.amountUsd),
      target: step.target,
      calldata: step.calldata,
      estimatedGasUsd: Number(step.estimatedGasUsd),
      simulationPassed: step.simulationPassed,
      simulationId: step.simulationId ?? undefined,
      txHash: step.txHash ?? undefined,
      status: step.status as ExecutionPlan["steps"][number]["status"]
    }))
  };
}

export async function POST(request: Request) {
  try {
    const payload = RequestSchema.parse(await request.json());
    const plan = await createPreviewPlan({
      walletAddress: payload.wallet,
      scenarioKind: payload.scenarioKind,
      constraints: payload.constraints
    });

    const record = await prisma.strategyExecution.create({
      data: {
        walletAddress: plan.walletAddress,
        scenarioKind: plan.scenarioKind,
        status: "previewed",
        totalAmountUsd: plan.totalAmountUsd,
        maxGasUsd: plan.maxGasUsd,
        maxApprovalUsd: plan.maxApprovalUsd,
        steps: {
          create: plan.steps.map(serializeExecutionStep)
        }
      },
      include: {
        steps: true
      }
    });

    return NextResponse.json({ data: { plan: toExecutionPlan(record) } });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to preview strategy execution."
      },
      { status: 400 }
    );
  }
}
