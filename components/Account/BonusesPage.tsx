"use client";

import { useEffect, useState } from "react";
import { accountApi } from "@/src/api/accountApi";
import { normalizeApiError } from "@/src/api/apiError";
import { formatUgx } from "@/src/account/formatCurrency";
import type { AccountBonusesViewModel } from "@/src/types/viewModels";

export default function BonusesPage() {
  const [data, setData] = useState<AccountBonusesViewModel | null>(null);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setError("");
    accountApi.getAccountBonuses({ signal: controller.signal })
      .then((value) => { if (!controller.signal.aborted) setData(value); })
      .catch((err) => { if (!controller.signal.aborted) setError(normalizeApiError(err).message); });
    return () => controller.abort();
  }, [refresh]);
  return (
    <>
      <div className="smartbet-panel__heading"><h2>Your bonus wallets</h2><button type="button" onClick={() => setRefresh((value) => value + 1)}>Refresh</button></div>
      {error ? <p className="smartbet-feedback" role="alert">{error}</p> : !data ? <p role="status">Loading bonuses...</p> : (
        <>
          {data.wallets.length === 0 ? <div className="smartbet-panel smartbet-empty"><h2>No bonus wallets</h2><p>Your available bonuses will appear here.</p></div> : data.wallets.map((wallet, index) => (
            <article className="smartbet-panel" key={wallet.walletId ?? index}>
              <div className="smartbet-panel__heading"><h2>{wallet.campaignName || "Bonus wallet"}</h2><span className="smartbet-badge">{wallet.status}</span></div>
              {wallet.campaignDescription && <p>{wallet.campaignDescription}</p>}
              <dl className="smartbet-detail-grid">
                <div><dt>Bonus balance</dt><dd>{formatUgx(wallet.bonusBalance)}</dd></div>
                <div><dt>Promo code</dt><dd>{wallet.promoCode || "None"}</dd></div>
                <div><dt>Wagered</dt><dd>{formatUgx(wallet.wageredAmount)} / {formatUgx(wallet.requiredWagerAmount)}</dd></div>
                <div><dt>Expires</dt><dd>{wallet.expiryDate ? new Date(wallet.expiryDate).toLocaleDateString("en-UG") : "No expiry provided"}</dd></div>
              </dl>
            </article>
          ))}
          <article className="smartbet-panel"><h2>Bonus transactions</h2>
            {data.transactions.length === 0 ? <p>No bonus transactions yet.</p> : <div className="smartbet-table-scroll"><table><thead><tr><th>Date</th><th>Type</th><th>Amount</th><th>Balance after</th><th>Reference</th></tr></thead><tbody>{data.transactions.map((tx, index) => <tr key={tx.bonusTransactionId ?? index}><td>{new Date(tx.createdAt).toLocaleDateString("en-UG")}</td><td>{tx.transactionType}</td><td>{formatUgx(tx.amount)}</td><td>{formatUgx(tx.balanceAfter)}</td><td>{tx.referenceId ?? tx.referenceType}</td></tr>)}</tbody></table></div>}
          </article>
        </>
      )}
    </>
  );
}
