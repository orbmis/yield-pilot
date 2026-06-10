import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { executePlan } from "@/lib/execution/execute";
import { toExecutionPlan } from "@/lib/execution/persistence";

const RequestSchema = z.object({
  executionId: z.string().min(1),
  walletId: z.string().min(1),
  approved: z.literal(true)
});

export async function POST(request: Request) {
  let executionId: string | undefined;

  try {
    const payload = RequestSchema.parse(await request.json());
    executionId = payload.executionId;
    const record = await prisma.strategyExecution.findUnique({
      where: { id: payload.executionId },
      include: { steps: { orderBy: { createdAt: "asc" } } }
    });

    if (!record) {
      return NextResponse.json({ error: "Execution preview was not found." }, { status: 404 });
    }

    await prisma.strategyExecution.update({
      where: { id: record.id },
      data: {
        status: "approved",
        approvedAt: new Date()
      }
    });

    const plan = toExecutionPlan(record);
    await executePlan({
      plan,
      walletId: payload.walletId,
      onStepSubmitted: async (stepId, txHash) => {
        await prisma.strategyExecutionStep.update({
          where: { id: stepId },
          data: {
            status: "submitted",
            txHash
          }
        });
      },
      onStepConfirmed: async (stepId) => {
        await prisma.strategyExecutionStep.update({
          where: { id: stepId },
          data: {
            status: "confirmed"
          }
        });
      },
      onStepFailed: async (stepId, error) => {
        await prisma.strategyExecutionStep.update({
          where: { id: stepId },
          data: {
            status: "failed"
          }
        });
      }
    });

    const updated = await prisma.strategyExecution.update({
      where: { id: record.id },
      data: {
        status: "confirmed",
        executedAt: new Date()
      },
      include: { steps: { orderBy: { createdAt: "asc" } } }
    });

    return NextResponse.json({ data: { plan: toExecutionPlan(updated) } });
  } catch (error) {
    if (executionId) {
      await prisma.strategyExecution.update({
        where: { id: executionId },
        data: { status: "failed" }
      }).catch(() => null);
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to execute strategy."
      },
      { status: 400 }
    );
  }
}
