# API

## `GET /api/portfolio`

Query:

- `wallet` optional wallet address
- `type` optional: `portfolio`, `balances`, or `positions`

Returns normalized portfolio data from Zapper or fixture fallback.

## `GET /api/opportunities`

Returns yield opportunities from DefiLlama with:

- APY
- TVL
- protocol
- chain
- symbol
- stablecoin flag

## `GET /api/scenarios`

Query:

- `wallet` optional wallet address
- `maximumProtocolCount` default `3`
- `maximumAllocationPercent` default `45`

Returns:

- portfolio
- opportunities
- switching costs
- conservative, balanced, and yield-maximized scenarios

## `POST /api/ai/recommendation`

Body:

```json
{
  "portfolio": {},
  "opportunities": [],
  "scenarios": [],
  "constraints": {
    "maximumProtocolCount": 3,
    "maximumAllocationPercent": 45
  }
}
```

Returns an OpenAI-generated recommendation, tradeoffs, and rationale. If `OPENAI_API_KEY` is absent, the route returns a deterministic fallback explanation.

## `POST /api/strategy/preview`

Body:

```json
{
  "wallet": "0x...",
  "scenarioKind": "Balanced",
  "constraints": {
    "maximumProtocolCount": 3,
    "maximumAllocationPercent": 45
  }
}
```

Recomputes scenarios server-side from the wallet's idle Base USDC balance, filters to executable Aave V3 Base USDC and configured Morpho Base USDC allocations, builds approval/deposit steps, runs the Tenderly simulation boundary, persists a `previewed` execution record, and returns the final execution plan.

## `GET /api/agent-wallet`

Returns Coinbase AgentKit credential readiness and target network.
