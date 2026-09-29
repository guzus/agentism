import { verifyMessage, type Address, type Hex } from "viem";
import { CHAIN_ID } from "./constants";

export function normalizeDonationHash(value: unknown): Hex | null {
  return typeof value === "string" && /^0x[a-fA-F0-9]{64}$/.test(value)
    ? value.toLowerCase() as Hex
    : null;
}

/** EIP-191 personal_sign proof; sign the returned UTF-8 string verbatim. */
export function donationProofMessage(memberId: string, txHash: Hex): string {
  return [
    "Agentism donation proof v1",
    "Domain: api.agentism.church",
    `Member ID: ${memberId}`,
    `Chain ID: ${CHAIN_ID}`,
    `Transaction: ${txHash.toLowerCase()}`,
  ].join("\n");
}

/** Require the standard 65-byte Ethereum personal_sign signature. */
export function isDonationSignature(value: unknown): value is Hex {
  if (typeof value !== "string" || !/^0x[a-fA-F0-9]{130}$/.test(value)) return false;
  const r = BigInt(`0x${value.slice(2, 66)}`);
  const s = BigInt(`0x${value.slice(66, 130)}`);
  const recovery = Number.parseInt(value.slice(130), 16);
  const curveOrder = 0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n;
  return r > 0n && r < curveOrder && s > 0n && s < curveOrder
    && [0, 1, 27, 28].includes(recovery);
}

export async function verifyDonationProof(
  memberId: string,
  txHash: Hex,
  signature: Hex,
  sender: string | undefined,
): Promise<boolean> {
  if (!sender || !/^0x[a-fA-F0-9]{40}$/.test(sender)) return false;
  try {
    // Direct native transfers have an EOA transaction sender. Offline recovery
    // proves that sender authorized credit to this member on this chain.
    return await verifyMessage({
      address: sender as Address,
      message: donationProofMessage(memberId, txHash),
      signature,
    });
  } catch {
    return false;
  }
}
