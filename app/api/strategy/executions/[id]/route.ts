import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { toExecutionPlan } from "@/lib/execution/persistence";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const record = await prisma.strategyExecution.findUnique({
    where: { id },
    include: { steps: { orderBy: { createdAt: "asc" } } }
  });

  if (!record) {
    return NextResponse.json({ error: "Execution was not found." }, { status: 404 });
  }

  return NextResponse.json({ data: { plan: toExecutionPlan(record) } });
}
