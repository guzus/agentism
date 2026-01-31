import { createPublicClient, http, formatEther, parseEther } from "viem";
import { base } from "viem/chains";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

const publicClient = createPublicClient({
  chain: base,
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
