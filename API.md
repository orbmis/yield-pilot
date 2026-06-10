# API

## `GET /api/portfolio`

Query:

- `wallet` optional wallet address
- `type` optional: `portfolio`, `balances`, or `positions`

Returns normalized portfolio data from DeBank or fixture fallback.

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

## `GET /api/agent-wallet`

Returns Coinbase AgentKit credential readiness and target network.
