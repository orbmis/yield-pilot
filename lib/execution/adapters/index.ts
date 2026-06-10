import { aaveV3BaseUsdcAdapter } from "@/lib/execution/adapters/aave";
import { morphoBaseUsdcAdapter } from "@/lib/execution/adapters/morpho";
import type { BuildExecutionStepsInput, ProtocolAdapter } from "@/lib/execution/adapters/shared";

export const protocolAdapters: ProtocolAdapter[] = [aaveV3BaseUsdcAdapter, morphoBaseUsdcAdapter];

export function getAdapterForAllocation(input: BuildExecutionStepsInput) {
  return protocolAdapters.find((adapter) => adapter.supports(input.allocation));
}

export function buildExecutionStepsForAllocation(input: BuildExecutionStepsInput) {
  const adapter = getAdapterForAllocation(input);
  if (!adapter) {
    throw new Error(`No executable adapter for ${input.allocation.protocol} ${input.allocation.symbol}.`);
  }

  return adapter.buildDepositSteps(input);
}
