# cashtokens-distro-web

A browser UI for the FoldingCash CashTokens distribution, replacing the
`index.js` CLI in the parent folder. It talks to the same distribution API
and the same BCH network directly from your browser — there's no backend
server, nothing is proxied, and your private key never leaves the page.

## Setup

```bash
npm install
npm run dev
```

Then open the printed `http://localhost:5173` URL.

By default it points at mainnet and `https://api.folding.cash/`, matching
the root project's `config.json`. To change that, copy `.env.example` to
`.env.local` and edit it.

## Wallet

Paste a WIF private key into the "Import wallet" box. It is kept in memory
only, for as long as the tab stays open:

- It is never written to `localStorage`, `sessionStorage`, a cookie, or disk.
- It is never sent over the network — it's only used locally to derive your
  address and to sign the distribution transaction before broadcasting.
- Click "Forget wallet", refresh the page, or close the tab to discard it.

Because there's no encrypted-storage step, you'll need to paste the WIF
again each time you reopen the app.

## Report (no chain interaction)

Pick a start and end date and run the report. It always uses a fixed
reference amount (100 tokens) to compute each recipient's proportional
share — this view never touches your wallet's UTXOs or broadcasts
anything, so it's safe to run any time.

## Distribute (sends a real transaction)

1. The app reads the CashToken UTXO sitting at your wallet's address and
   uses its on-chain token amount as the distribution amount — there's no
   amount field to fill in.
2. Pick a date range and fetch the distribution.
3. Review the recipients, fee, and change, then explicitly confirm before
   anything is broadcast. Cancelling at that point sends nothing.

Like the CLI, this only supports a wallet holding at most one CashToken UTXO
plus at most one plain-BCH funding UTXO. If you have more than that spread
across several UTXOs, consolidate them first.

## Errors

Network problems, API failures (bad HTTP status, `success: false`, or an
empty result set), insufficient funds, and transaction broadcast failures
(already spent, mempool conflicts, etc.) are all shown inline with a
plain-language explanation and, where it makes sense, a retry button.
