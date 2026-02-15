import { createPublicClient, http, formatEther, parseEther } from "viem";
import type { Chain } from "viem";
import { monad } from "viem/chains";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { CHAIN_ID } from "./constants";

const supportedChains: Record<number, Chain> = {
  [monad.id]: monad,
};

const appChain = supportedChains[CHAIN_ID];

if (!appChain) {
  throw new Error(`Unsupported chain ID: ${CHAIN_ID}`);
}

const publicClient = createPublicClient({
  chain: appChain,
  transport: http(),
});

export function createWallet() {
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);
  return {
    address: account.address,
    privateKey,
  };
}

export async function getBalance(address: `0x${string}`): Promise<string> {
  try {
    const balance = await publicClient.getBalance({ address });
    return formatEther(balance);
  } catch {
    return "0";
  }
}

export async function verifyTransaction(
  txHash: `0x${string}`
): Promise<{ valid: boolean; from?: string; to?: string; value?: string }> {
  try {
    const receipt = await publicClient.getTransactionReceipt({
      hash: txHash,
    });
    const tx = await publicClient.getTransaction({ hash: txHash });

    if (receipt.status === "success") {
      return {
        valid: true,
        from: tx.from,
        to: tx.to ?? undefined,
        value: formatEther(tx.value),
      };
    }
    return { valid: false };
  } catch {
    return { valid: false };
  }
}

export { publicClient, formatEther, parseEther };
