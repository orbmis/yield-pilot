# YieldPilot

YieldPilot is a production-oriented MVP for optimizing DeFi yield allocations. It connects Privy authentication, Coinbase AgentKit through Privy embedded wallets, DeBank portfolio discovery, DefiLlama yield markets, Tenderly cost estimates, a Prisma/PostgreSQL persistence layer, and an OpenAI Responses API recommendation route.

## Stack

- Next.js 15, React, TypeScript
- Tailwind CSS and shadcn/ui-style local primitives
- Next.js API routes
- PostgreSQL and Prisma ORM
- Privy authentication
- Coinbase AgentKit with Privy embedded wallet execution
- DeBank Open API, DefiLlama Yield API, Tenderly Simulation API
- OpenAI Responses API
- Vitest unit tests

## Quick Start

```bash
cp .env.local.example .env.local
npm install
docker compose up -d postgres
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

Open `http://localhost:3000/dashboard`.

By default `USE_FIXTURES=true` lets the MVP run without third-party API keys. Set it to `false` after configuring DeBank, Tenderly, Privy, and OpenAI credentials.

## Test

```bash
npm run test
```

## Key Routes

- `/dashboard` - portfolio overview, allocation chart, scenarios, recommendation panel
- `GET /api/portfolio` - portfolio overview
- `GET /api/portfolio?type=balances` - token balances
- `GET /api/portfolio?type=positions` - protocol positions
- `GET /api/opportunities` - DefiLlama yield opportunities
- `GET /api/scenarios` - cost-adjusted conservative, balanced, and yield-maximized scenarios
- `POST /api/ai/recommendation` - OpenAI explanation for recommendations
- `GET /api/agent-wallet` - Coinbase AgentKit credential/status boundary

## Privy Embedded Wallet Automation

YieldPilot uses the user's Privy embedded wallet for both portfolio discovery and execution.
For Privy apps using TEE execution, automation is enabled with Privy session signers rather than the older delegated-actions hooks.
The dashboard provisions server-side access with `useSessionSigners` when the user clicks `Enable Automation`.

Required server values for automation:

```env
PRIVY_APP_SECRET=""
PRIVY_WALLET_AUTHORIZATION_PRIVATE_KEY=""
PRIVY_DELEGATED_NETWORK_ID="base-mainnet"
NEXT_PUBLIC_PRIVY_SIGNER_ID=""
NEXT_PUBLIC_PRIVY_POLICY_IDS=""
```

### Where to get the Privy signer values

`NEXT_PUBLIC_PRIVY_SIGNER_ID` is the signer/key quorum ID from Privy:

1. Open the Privy Dashboard.
2. Select the YieldPilot app.
3. Go to `Wallet infrastructure` -> `Authorization keys`.
4. Click `Create new key`.
5. Copy the key quorum ID / signer ID into `NEXT_PUBLIC_PRIVY_SIGNER_ID`.

The private key shown during this flow must be stored server-side only. Do not put it in a `NEXT_PUBLIC_` variable.

`NEXT_PUBLIC_PRIVY_POLICY_IDS` is optional. Use it only after creating one or more policies in `Wallet infrastructure` -> `Policies`. For local testing it can stay empty:

```env
NEXT_PUBLIC_PRIVY_POLICY_IDS=""
```

For production automation, create a restrictive policy and set its policy ID:

```env
NEXT_PUBLIC_PRIVY_POLICY_IDS="policy_id_1"
```

## Deployment

See `SETUP.md`, `ENVIRONMENT_VARIABLES.md`, and `ARCHITECTURE.md`.
