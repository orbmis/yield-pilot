import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { toExecutionPlan } from "@/lib/execution/persistence";
import { createPreviewPlan, serializeExecutionStep } from "@/lib/execution/preview";

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
