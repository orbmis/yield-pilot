import Link from "next/link";
import { ArrowRight, BarChart3, Bot, WalletCards } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  const features: Array<[string, string, LucideIcon]> = [
    ["Wallet-aware", "Coinbase AgentKit wallet setup with Privy authentication.", WalletCards],
    ["Cost-adjusted", "Tenderly simulation hooks for deposit, withdraw, and gas estimates.", BarChart3],
    ["AI explained", "OpenAI Responses API route for rationale, tradeoffs, and next steps.", Bot]
  ];

  return (
    <main className="min-h-screen bg-background">
      <section className="border-b bg-white">
        <div className="mx-auto flex min-h-[92vh] max-w-7xl flex-col px-6 py-8">
          <nav className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-md bg-primary text-primary-foreground">
                <BarChart3 className="h-5 w-5" />
              </div>
              <span className="text-xl font-semibold">YieldPilot</span>
            </div>
            <Button asChild>
              <Link href="/dashboard">Open Dashboard</Link>
            </Button>
          </nav>

          <div className="grid flex-1 items-center gap-10 py-12 lg:grid-cols-[1fr_0.86fr]">
            <div className="max-w-3xl">
              <p className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-primary">
                DeFi yield optimizer
              </p>
              <h1 className="text-5xl font-semibold leading-tight text-foreground lg:text-7xl">
                YieldPilot
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
                Connect a wallet, discover positions, compare live yield markets, estimate transaction
                costs, and generate explainable allocation scenarios.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild size="lg">
                  <Link href="/dashboard">
                    Launch MVP <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>

            <div className="grid gap-4">
              {features.map(([title, body, Icon]) => (
                <div key={String(title)} className="rounded-lg border bg-card p-5 shadow-sm">
                  <Icon className="h-5 w-5 text-primary" />
                  <h2 className="mt-4 text-lg font-semibold">{title}</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
