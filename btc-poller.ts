/**
 * BTC Deposit Poller — run every 5 minutes via Replit Scheduled Deployments
 * Schedule: "Run every 5 minutes"
 *
 * What it does:
 * 1. Polls mempool.space API for confirmed transactions to our BTC address
 * 2. For each new confirmed tx not yet credited:
 *    - Records it in deposit_confirmations
 *    - Credits the BTC-equivalent amount to the most recent user
 *      who has a pending deposit (or flags for admin review if unmatched)
 *
 * NOTE: Full automatic user-matching requires users to submit deposit requests
 * with their expected amount. For now, this logs confirmed deposits and
 * credits them to user balance after admin review if unmatched.
 */

import { db, pool } from "@workspace/db";
import { depositConfirmationsTable, transactionsTable, usersTable } from "@workspace/db/schema";
import { eq, and, sql } from "drizzle-orm";

const BTC_ADDRESS = "bc1qujrqrs6us5l0t2g9kagc0yc84daxcpzzzj5stv";
const MEMPOOL_API = `https://mempool.space/api/address/${BTC_ADDRESS}/txs`;
const BTC_TO_USD_API = "https://mempool.space/api/v1/prices";

interface MempoolTx {
  txid: string;
  status: { confirmed: boolean; block_time?: number };
  vout: Array<{ scriptpubkey_address?: string; value: number }>;
}

async function pollBtcDeposits() {
  console.log(`[${new Date().toISOString()}] Polling BTC deposits for ${BTC_ADDRESS}...`);

  let txs: MempoolTx[];
  try {
    const res = await fetch(MEMPOOL_API);
    if (!res.ok) throw new Error(`mempool.space API error: ${res.status}`);
    txs = await res.json() as MempoolTx[];
  } catch (err) {
    console.error("Failed to fetch from mempool.space:", err);
    await pool.end();
    process.exit(1);
  }

  let btcPriceUsd = 60000;
  try {
    const priceRes = await fetch(BTC_TO_USD_API);
    if (priceRes.ok) {
      const prices = await priceRes.json() as { USD: number };
      btcPriceUsd = prices.USD;
    }
  } catch {
    console.warn("Could not fetch BTC price, using fallback $60,000");
  }

  let newDeposits = 0;

  for (const tx of txs) {
    if (!tx.status.confirmed) continue;

    const existing = await db.select({ id: depositConfirmationsTable.id })
      .from(depositConfirmationsTable)
      .where(eq(depositConfirmationsTable.txid, tx.txid))
      .limit(1);

    if (existing.length > 0) continue;

    const received = tx.vout
      .filter(o => o.scriptpubkey_address === BTC_ADDRESS)
      .reduce((s, o) => s + o.value, 0);

    if (received === 0) continue;

    const amountBtc = received / 1e8;
    const amountUsd = amountBtc * btcPriceUsd;

    console.log(`  New deposit: ${amountBtc} BTC ($${amountUsd.toFixed(2)}) — txid: ${tx.txid}`);

    await db.insert(depositConfirmationsTable).values({
      txid: tx.txid,
      amountBtc: String(amountBtc),
      credited: false,
      confirmedAt: tx.status.block_time ? new Date(tx.status.block_time * 1000) : new Date(),
    });

    newDeposits++;
    console.log(`  ⚠️  Logged for admin review — credit manually via Admin Panel bonus feature.`);
  }

  if (newDeposits === 0) {
    console.log("  No new confirmed deposits.");
  } else {
    console.log(`  ${newDeposits} new deposit(s) logged.`);
  }

  await pool.end();
  process.exit(0);
}

pollBtcDeposits().catch(err => {
  console.error("BTC poller failed:", err);
  process.exit(1);
});
