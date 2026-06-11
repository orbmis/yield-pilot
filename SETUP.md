# Setup

## Local Development

1. Install dependencies.

```bash
npm install
```

2. Start PostgreSQL.

```bash
docker compose up -d postgres
```

3. Configure environment. Use `.env.local` for local Next.js development. `.env.example`
   and `.env.local.example` are templates only.

```bash
cp .env.local.example .env.local
```

4. Generate Prisma client, migrate, and seed.

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

5. Run the app.

```bash
npm run dev
```

## Vercel Deployment

1. Create a Vercel project from the repository.
2. Add a managed PostgreSQL database such as Vercel Postgres, Neon, Supabase, or Railway Postgres.
3. Set every required variable from `ENVIRONMENT_VARIABLES.md`.
4. In Privy, enable embedded wallets. Create/configure a TEE signer and set `NEXT_PUBLIC_PRIVY_SIGNER_ID`. Optionally set policy ids in `NEXT_PUBLIC_PRIVY_POLICY_IDS`.
5. Set build command to `npm run build`.
6. Run migrations in a deployment step or manually:

```bash
npm run db:deploy
```

7. Deploy. Use `USE_FIXTURES=false` only after provider credentials are configured.
8. Keep `EXECUTION_ENABLED=false` until Base USDC Tenderly simulations and Privy signer execution have been validated.

## Railway Deployment

1. Create a Railway project.
2. Add a PostgreSQL service.
3. Add this app as a service from GitHub.
4. Set `DATABASE_URL` from the Railway Postgres service.
5. Add the API keys listed in `ENVIRONMENT_VARIABLES.md`.
6. In Privy, enable embedded wallets. Create/configure a TEE signer and set `NEXT_PUBLIC_PRIVY_SIGNER_ID`. Optionally set policy ids in `NEXT_PUBLIC_PRIVY_POLICY_IDS`.
7. Set the start command:

```bash
npm run db:deploy && npm run start
```

8. Deploy and open the generated Railway URL.
9. Keep `EXECUTION_ENABLED=false` until Base USDC Tenderly simulations and Privy signer execution have been validated.
