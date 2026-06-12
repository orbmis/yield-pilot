"use client";

import { PrivyProvider } from "@privy-io/react-auth";

export function PrivyProviderClient({ children }: { children: React.ReactNode }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

  if (!appId) {
    return <>{children}</>;
  }

  return (
    <PrivyProvider
      appId={appId}
      config={{
        loginMethods: ["email"],
        appearance: {
          theme: "light",
          accentColor: "#14755f",
          logo: "/logo.svg"
        },
        embeddedWallets: {
          createOnLogin: "all-users"
        }
      }}
    >
      {children}
    </PrivyProvider>
  );
}
