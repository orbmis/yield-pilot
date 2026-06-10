export type AgentWalletStatus = {
  configured: boolean;
  networkId: string;
  walletId?: string;
  walletAddress?: string;
  provider: "privy-delegated-embedded";
  canInitializeProvider: boolean;
  message: string;
};

function getPrivyAppId() {
  return process.env.PRIVY_APP_ID ?? process.env.NEXT_PUBLIC_PRIVY_APP_ID;
}

export function getPrivyDelegatedWalletConfig(walletId?: string) {
  const appId = getPrivyAppId();
  const appSecret = process.env.PRIVY_APP_SECRET;
  const authorizationPrivateKey = process.env.PRIVY_WALLET_AUTHORIZATION_PRIVATE_KEY;
  const networkId = process.env.PRIVY_DELEGATED_NETWORK_ID ?? "base-mainnet";
  const rpcUrl = process.env.BASE_RPC_URL;

  return {
    appId,
    appSecret,
    authorizationPrivateKey,
    networkId,
    rpcUrl,
    walletId
  };
}

export async function createPrivyDelegatedWalletProvider(walletId: string) {
  const config = getPrivyDelegatedWalletConfig(walletId);

  if (!config.appId || !config.appSecret || !config.authorizationPrivateKey) {
    throw new Error(
      "Privy delegated wallet execution is not configured. Add PRIVY_APP_SECRET and PRIVY_WALLET_AUTHORIZATION_PRIVATE_KEY."
    );
  }

  const importPackage = new Function("specifier", "return import(specifier)") as (
    specifier: string
  ) => Promise<{ PrivyWalletProvider: typeof import("@coinbase/agentkit").PrivyWalletProvider }>;
  const { PrivyWalletProvider } = await importPackage("@coinbase/agentkit");

  return PrivyWalletProvider.configureWithWallet({
    appId: config.appId,
    appSecret: config.appSecret,
    authorizationPrivateKey: config.authorizationPrivateKey,
    walletId,
    networkId: config.networkId,
    rpcUrl: config.rpcUrl,
    walletType: "embedded"
  });
}

export async function getAgentWalletStatus(walletId?: string): Promise<AgentWalletStatus> {
  const config = getPrivyDelegatedWalletConfig(walletId);
  const configured = Boolean(config.appId && config.appSecret && config.authorizationPrivateKey);
  let walletAddress: string | undefined;
  let canInitializeProvider = false;

  if (configured && walletId) {
    const provider = await createPrivyDelegatedWalletProvider(walletId);
    walletAddress = provider.getAddress();
    canInitializeProvider = true;
  }

  return {
    configured,
    networkId: config.networkId,
    walletId,
    walletAddress,
    provider: "privy-delegated-embedded",
    canInitializeProvider,
    message: configured
      ? walletId
        ? "AgentKit is configured to execute through the user's delegated Privy embedded wallet."
        : "AgentKit is configured. Delegate a Privy embedded wallet to enable execution."
      : "AgentKit delegated execution is missing Privy server configuration. Add PRIVY_APP_SECRET and PRIVY_WALLET_AUTHORIZATION_PRIVATE_KEY."
  };
}
