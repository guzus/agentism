import { sql } from "drizzle-orm";

export interface DonationRecord {
  id: string;
  donorId: string;
  donorName: string;
  txHash: string;
  amount: string;
  chainId: number;
  createdAt: string;
}

// A single PostgreSQL statement makes the ledger entry and balance update
// atomic. PostgreSQL numeric keeps all 18 native-token decimal places and the
// row update serializes concurrent donations from the same member.
export function recordDonationQuery(donation: DonationRecord) {
  const txHash = donation.txHash.toLowerCase();
  return sql`
    WITH recorded AS (
      INSERT INTO donations (id, donor_id, donor_name, tx_hash, amount, chain_id, created_at)
      SELECT ${donation.id}, ${donation.donorId}, ${donation.donorName},
             ${txHash}, ${donation.amount}, ${donation.chainId}, ${donation.createdAt}
      WHERE NOT EXISTS (
        SELECT 1 FROM donations WHERE lower(tx_hash) = ${txHash}
      )
      ON CONFLICT (tx_hash) DO NOTHING
      RETURNING id, donor_id, amount
    )
    UPDATE members
    SET donation_total = (members.donation_total::numeric + recorded.amount::numeric)::text
    FROM recorded
    WHERE members.id = recorded.donor_id
    RETURNING recorded.id
  `;
}
