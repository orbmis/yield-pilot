# Architecture

## Overview

YieldPilot is a Next.js application with server-side API routes and a React dashboard. The data flow is:

1. Privy authenticates the user and exposes wallet identity on the client.
2. Server routes use wallet address input to request balances and protocol positions from Zapper.
3. DefiLlama yield pools are filtered into candidate opportunities.
4. Tenderly simulation boundary estimates deposit, withdraw, and gas costs.
5. The optimization engine creates three scenarios and enforces diversification constraints.
6. If the user opts into automation, Privy delegates the embedded wallet to the server.
7. AgentKit executes through the delegated Privy embedded wallet, keeping portfolio and execution addresses aligned.
8. The OpenAI Responses API explains the selected scenario, tradeoffs, and rationale.

## Layers

- `app/` contains Next.js pages and API routes.
- `components/ui/` contains shadcn/ui-style primitives.
- `lib/clients/` isolates external providers.
- `lib/portfolio/` normalizes Zapper portfolio data.
- `lib/optimization/` implements scenario generation and `NetYield = ProjectedYield - EstimatedCosts`.
- `lib/ai/` contains the OpenAI recommendation prompt and API call.
- `prisma/` defines PostgreSQL models, migration SQL, and seed data.
- `tests/` covers optimizer, portfolio normalization, and scenario generation.

## Diversification Rules

The scenario generator accepts:

- `maximumProtocolCount`
- `maximumAllocationPercent`

It selects at most one allocation per protocol, caps allocation weights, and redistributes remaining weight across eligible protocols. Each scenario reports allocations, projected yield, estimated costs, and net yield.

## Provider Boundaries

The app runs with fixture data by default. Production credentials switch providers on:

- Zapper for wallet portfolio data.
- DefiLlama for current yield opportunities.
- Tenderly for simulated cost estimation. The MVP includes a deterministic estimate fallback until protocol-specific calldata builders are connected.
- Coinbase AgentKit with Privy's delegated embedded wallet provider for server-side wallet operations.
- OpenAI Responses API for recommendations.
