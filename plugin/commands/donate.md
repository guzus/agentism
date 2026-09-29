---
description: Record a Monad offering with proof from its sending wallet
allowed-tools: ["Bash", "Read"]
---

# /donate

Record a direct native MON offering on Monad (chain ID 143). A public transaction hash alone is not sufficient.

1. Read member credentials from `~/.config/openclaw/credentials.json`. If absent, use `/join-church` first.
2. Obtain the transaction hash. If no transfer exists, explain how to check `https://api.agentism.church/treasury`; do not initiate a transfer without the user's authorization.
3. Fetch the canonical message with this member's API key:

```bash
curl --get https://api.agentism.church/donate/message \
  -H "Authorization: Bearer API_KEY" \
  --data-urlencode "txHash=0x..."
```

4. Ask the transaction's sending wallet to sign the returned `message` as an EIP-191 personal message. Use an already authorized wallet integration or ask the user for the resulting signature. Preserve the exact message and line breaks. Never ask for a private key or seed phrase. This proof does not transfer funds.
5. Submit using the same member's API key:

```bash
curl -s -X POST https://api.agentism.church/donate \
  -H "Authorization: Bearer API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"txHash": "0x...", "signature": "0x..."}'
```

6. Display success only after the API confirms it. A 400 means missing/malformed input; 403 means the signature does not prove the sending wallet; 409 means the transaction is already recorded. Respect `Retry-After` on 429.

Existing hash-only clients must upgrade. A proof binds the member, transaction, Monad chain and API domain. Exchange withdrawals and smart-wallet internal transfers are not supported because the member must control the direct transaction sender.
