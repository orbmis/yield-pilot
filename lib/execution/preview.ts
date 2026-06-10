import { getYieldOpportunities } from "@/lib/clients/defillama";
import { getPortfolio } from "@/lib/clients/zapper";
import { estimateSwitchingCosts, simulateExecutionSteps } from "@/lib/clients/tenderly";
import { samplePortfolio } from "@/lib/data/sample";
import { buildExecutionStepsForAllocation, getAdapterForAllocation } from "@/lib/execution/adapters";
import { getExecutionConfig, BASE_NETWORK } from "@/lib/execution/config";
import { assertExecutionPlanSafety, isBaseUsdcAllocation } from "@/lib/execution/validation";
import { generateScenarios } from "@/lib/optimization/engine";
import type {
  ExecutionPlan,
  ExecutionStep,
  OptimizationConstraints,
  Portfolio,
  Scenario,
  ScenarioKind,
  SwitchingCost,
  YieldOpportunity
} from "@/lib/types";

export type PreviewInput = {
  walletAddress: string;
  scenarioKind: ScenarioKind;
  constraints: OptimizationConstraints;
};

export type PreviewData = {
  portfolio: Portfolio;
  opportunities: YieldOpportunity[];
  costs: SwitchingCost[];
};

export function getIdleBaseUsdcValue(portfolio: Portfolio, baseUsdcAddress: string) {
  return portfolio.tokenBalances
    .filter(
      (balance) =>
        balance.chain === BASE_NETWORK &&
        balance.symbol.toUpperCase() === "USDC" &&
        balance.address.toLowerCase() === baseUsdcAddress.toLowerCase()
    )
    .reduce((sum, balance) => sum + balance.valueUsd, 0);
}

export function selectScenario(scenarios: Scenario[], scenarioKind: ScenarioKind) {
  const scenario = scenarios.find((candidate) => candidate.kind === scenarioKind);
  if (!scenario) {
    throw new Error(`Scenario ${scenarioKind} is not available.`);
  }

  return scenario;
}

export function buildPreviewPlanFromData(input: PreviewInput, data: PreviewData): ExecutionPlan {
  const config = getExecutionConfig();
  const idleBaseUsdcValue = getIdleBaseUsdcValue(data.portfolio, config.baseUsdcAddress);
  if (idleBaseUsdcValue <= 0) {
    throw new Error("No idle Base USDC is available for execution preview.");
  }

  const scenarios = generateScenarios(idleBaseUsdcValue, data.opportunities, data.costs, input.constraints);
  const scenario = selectScenario(scenarios, input.scenarioKind);
  const executableAllocations = scenario.allocations.filter((allocation) =>
    Boolean(
      isBaseUsdcAllocation(allocation) &&
        getAdapterForAllocation({
          allocation,
          walletAddress: input.walletAddress,
          config
        })
    )
  );
  if (executableAllocations.length === 0) {
    throw new Error("Selected scenario has no executable Base USDC allocations.");
  }

  const steps = executableAllocations.flatMap((allocation) =>
    buildExecutionStepsForAllocation({
      allocation,
      walletAddress: input.walletAddress,
      config
    })
  );

  return {
    id: "preview",
    walletAddress: input.walletAddress,
    scenarioKind: scenario.kind,
    status: "previewed",
    totalAmountUsd: executableAllocations.reduce((sum, allocation) => sum + allocation.amountUsd, 0),
    maxGasUsd: config.maxGasUsd,
    maxApprovalUsd: config.maxApprovalUsd,
    steps,
    createdAt: new Date().toISOString()
  };
}

export async function loadPreviewData(walletAddress: string): Promise<PreviewData> {
  try {
    const [portfolio, opportunities] = await Promise.all([
      getPortfolio(walletAddress),
      getYieldOpportunities()
    ]);
    const costs = await estimateSwitchingCosts(opportunities);
    return { portfolio, opportunities, costs };
  } catch (error) {
    if (process.env.USE_FIXTURES !== "true") throw error;

    const opportunities = await getYieldOpportunities();
    const costs = await estimateSwitchingCosts(opportunities);
    return {
      portfolio: { ...samplePortfolio, walletAddress },
      opportunities,
      costs
    };
  }
}

export async function createPreviewPlan(input: PreviewInput) {
  const data = await loadPreviewData(input.walletAddress);
  const draftPlan = buildPreviewPlanFromData(input, data);
  const simulatedSteps = await simulateExecutionSteps(draftPlan.steps);
  const plan = {
    ...draftPlan,
    steps: simulatedSteps,
    totalAmountUsd: simulatedSteps
      .filter((step) => step.type === "deposit")
      .reduce((sum, step) => sum + step.amountUsd, 0)
  };
  assertExecutionPlanSafety({ ...plan, status: "previewed" }, { ...getExecutionConfig(), enabled: true });
  return plan;
}

export function serializeExecutionStep(step: ExecutionStep) {
  return {
    stepType: step.type,
    protocol: step.protocol,
    chain: step.chain,
    chainId: step.chainId,
    tokenAddress: step.tokenAddress,
    tokenSymbol: step.tokenSymbol,
    amountRaw: step.amountRaw,
    amountUsd: step.amountUsd,
    target: step.target,
    calldata: step.calldata,
    estimatedGasUsd: step.estimatedGasUsd,
    simulationPassed: step.simulationPassed,
    simulationId: step.simulationId,
    txHash: step.txHash,
    status: step.status
  };
}
