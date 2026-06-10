import { PrismaClient } from "@prisma/client";
import { sampleOpportunities, samplePortfolio } from "../lib/data/sample";

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.upsert({
    where: { privyUserId: "fixture-user" },
    update: {},
    create: {
      privyUserId: "fixture-user",
      email: "demo@yieldpilot.app",
      walletAddress: samplePortfolio.walletAddress
    }
  });

  const portfolio = await prisma.portfolio.create({
    data: {
      userId: user.id,
      walletAddress: samplePortfolio.walletAddress,
      totalValueUsd: samplePortfolio.totalValueUsd,
      weightedApy: samplePortfolio.weightedApy,
      balances: {
        create: samplePortfolio.tokenBalances.map((token) => ({
          chain: token.chain,
          tokenAddress: token.address,
          symbol: token.symbol,
          amount: token.amount,
          priceUsd: token.priceUsd,
          valueUsd: token.valueUsd
        }))
      },
      positions: {
        create: samplePortfolio.positions.map((position) => ({
          externalId: position.id,
          protocol: position.protocol,
          chain: position.chain,
          asset: position.asset,
          valueUsd: position.valueUsd,
          apy: position.apy
        }))
      }
    }
  });

  await Promise.all(
    sampleOpportunities.map((opportunity) =>
      prisma.yieldOpportunity.upsert({
        where: { id: opportunity.id },
        update: {
          apy: opportunity.apy,
          tvlUsd: opportunity.tvlUsd,
          updatedAt: new Date()
        },
        create: {
          ...opportunity,
          updatedAt: new Date()
        }
      })
    )
  );

  console.log(`Seeded portfolio ${portfolio.id}`);
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
