import type { Metadata } from "next";
import "./globals.css";
import { PrivyProviderClient } from "./providers/privy-provider";

export const metadata: Metadata = {
  title: "YieldPilot",
  description: "Optimize DeFi yield allocations with wallet-aware costs and AI recommendations."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <PrivyProviderClient>{children}</PrivyProviderClient>
      </body>
    </html>
  );
}
