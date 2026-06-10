# Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string used by Prisma. |
| `NEXT_PUBLIC_PRIVY_APP_ID` | Production | Privy app ID for client auth. |
| `PRIVY_APP_ID` | Optional | Server-side Privy app ID. Defaults to `NEXT_PUBLIC_PRIVY_APP_ID` if omitted. |
| `PRIVY_APP_SECRET` | Production | Privy server-side secret for protected routes and delegated wallet execution. |
| `PRIVY_WALLET_AUTHORIZATION_PRIVATE_KEY` | Automation | Privy authorization private key required for server delegated embedded-wallet actions. |
| `PRIVY_DELEGATED_NETWORK_ID` | Optional | AgentKit network id for delegated embedded wallet execution. Defaults to `base-mainnet`. |
| `NEXT_PUBLIC_PRIVY_SIGNER_ID` | Automation | Privy TEE signer id to provision with `useSessionSigners`. |
| `NEXT_PUBLIC_PRIVY_POLICY_IDS` | Optional | Comma-separated Privy policy ids applied to the session signer. |
| `OPENAI_API_KEY` | AI route | OpenAI API key for the Responses API. |
| `OPENAI_MODEL` | Optional | Defaults to `gpt-5.2`. |
| `DEBANK_ACCESS_KEY` | Production | DeBank Open API access key. |
| `TENDERLY_ACCESS_KEY` | Production | Tenderly API key for simulations. |
| `TENDERLY_ACCOUNT_SLUG` | Production | Tenderly account slug. |
| `TENDERLY_PROJECT_SLUG` | Production | Tenderly project slug. |
| `USE_FIXTURES` | Optional | Set `true` for local demo data, `false` for live providers. |
