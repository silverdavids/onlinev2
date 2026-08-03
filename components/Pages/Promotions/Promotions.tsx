"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  IconAlertCircle,
  IconGift,
  IconHistory,
  IconLock,
  IconRefresh,
  IconWallet,
} from "@tabler/icons-react";
import { accountApi } from "@/src/api/accountApi";
import { normalizeApiError } from "@/src/api/apiError";
import { useAccount } from "@/src/account/useAccount";
import { formatUgx } from "@/src/account/formatCurrency";
import type { AccountBonusesViewModel } from "@/src/types/viewModels";

const emptyBonuses: AccountBonusesViewModel = {
  wallets: [],
  transactions: [],
};

const formatDate = (value: string | null | undefined) => {
  if (!value) return "No expiry";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

const formatAmount = (value: number | null | undefined) =>
  typeof value === "number" && Number.isFinite(value) ? formatUgx(value) : "Unavailable";

const progressPercent = (wagered: number, required: number) => {
  if (!Number.isFinite(required) || required <= 0) return 100;
  return Math.max(0, Math.min(100, Math.round((wagered / required) * 100)));
};

const statusClassName = (status: string) => {
  const normalized = status.toLowerCase();
  if (normalized.includes("active") || normalized.includes("approved")) return "text-success";
  if (normalized.includes("expired") || normalized.includes("cancel")) return "text-danger";
  if (normalized.includes("used") || normalized.includes("consumed")) return "g1-color";
  return "text-warning";
};

export default function Promotions() {
  const { balance, isLoadingAccount, accountError, refreshAccount } = useAccount();
  const [bonuses, setBonuses] = useState<AccountBonusesViewModel>(emptyBonuses);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadBonuses = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const nextBonuses = await accountApi.getAccountBonuses();
      setBonuses(nextBonuses);
    } catch (err) {
      const apiError = normalizeApiError(err);
      setError(apiError.message);
      setBonuses(emptyBonuses);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBonuses();
  }, [loadBonuses]);

  const totalBonusBalance = useMemo(
    () => bonuses.wallets.reduce((sum, wallet) => sum + (Number(wallet.bonusBalance) || 0), 0),
    [bonuses.wallets]
  );

  const refreshAll = async () => {
    await Promise.all([
      loadBonuses(),
      refreshAccount().catch(() => null),
    ]);
  };

  return (
    <section className="Promotions pb-120">
      <div className="container-fluid">
        <div className="row">
          <div className="col-12 gx-0 gx-lg-4">
            <div className="Promotions__main">
              <div className="d-flex align-items-center justify-content-between flex-wrap gap-4 mb-6">
                <div>
                  <h3 className="mb-2">My Bonuses</h3>
                  <p className="mb-0 text-white-50">
                    Bonus wallets and bonus activity for your account.
                  </p>
                </div>
                <button
                  type="button"
                  className="cmn-btn second-alt px-5 py-3 d-flex align-items-center gap-2"
                  onClick={refreshAll}
                  disabled={isLoading}
                >
                  <IconRefresh size={18} />
                  {isLoading ? "Refreshing" : "Refresh"}
                </button>
              </div>

              <div className="row gy-4 mb-7">
                <div className="col-md-6 col-xl-4">
                  <div className="p-4 p-lg-6 rounded-8 p2-bg h-100">
                    <div className="d-flex align-items-center gap-3 mb-3">
                      <IconWallet className="g1-color" />
                      <span className="text-white-50">Cash balance</span>
                    </div>
                    <h4 className="mb-0">
                      {isLoadingAccount ? "Loading..." : formatAmount(balance)}
                    </h4>
                    {accountError && <p className="text-warning mt-3 mb-0">{accountError}</p>}
                  </div>
                </div>
                <div className="col-md-6 col-xl-4">
                  <div className="p-4 p-lg-6 rounded-8 p2-bg h-100">
                    <div className="d-flex align-items-center gap-3 mb-3">
                      <IconGift className="g1-color" />
                      <span className="text-white-50">Bonus balance</span>
                    </div>
                    <h4 className="mb-0">{formatAmount(totalBonusBalance)}</h4>
                    <p className="text-white-50 mt-3 mb-0">Shown separately from cash.</p>
                  </div>
                </div>
                <div className="col-md-6 col-xl-4">
                  <div className="p-4 p-lg-6 rounded-8 p2-bg h-100">
                    <div className="d-flex align-items-center gap-3 mb-3">
                      <IconLock className="g1-color" />
                      <span className="text-white-50">Active wallets</span>
                    </div>
                    <h4 className="mb-0">{bonuses.wallets.length}</h4>
                  </div>
                </div>
              </div>

              {error && (
                <div className="alert alert-danger d-flex align-items-center gap-2 mb-6" role="alert">
                  <IconAlertCircle size={20} />
                  {error}
                </div>
              )}

              <div className="row gy-5 mb-8">
                {isLoading ? (
                  <div className="col-12">
                    <div className="p-5 rounded-8 p2-bg text-white">Loading bonuses...</div>
                  </div>
                ) : bonuses.wallets.length === 0 ? (
                  <div className="col-12">
                    <div className="p-5 rounded-8 p2-bg text-white-50">
                      No bonus wallets are available for this account.
                    </div>
                  </div>
                ) : (
                  bonuses.wallets.map((wallet, index) => {
                    const required = Number(wallet.requiredWagerAmount) || 0;
                    const wagered = Number(wallet.wageredAmount) || 0;
                    const percent = progressPercent(wagered, required);

                    return (
                      <div
                        className="col-xl-6"
                        key={wallet.walletId ?? `${wallet.campaignName}-${index}`}
                      >
                        <div className="Promotions__card p-4 p-lg-6 rounded-8 p3-bg h-100">
                          <div className="d-flex align-items-start justify-content-between gap-4 mb-5">
                            <div>
                              <h4 className="mb-2">{wallet.campaignName}</h4>
                              <span className="text-white-50">
                                {wallet.bonusType || "Bonus campaign"}
                              </span>
                            </div>
                            <span className={`fw-bold ${statusClassName(wallet.status)}`}>
                              {wallet.status}
                            </span>
                          </div>

                          {wallet.campaignDescription && (
                            <p className="text-white-50 mb-5">{wallet.campaignDescription}</p>
                          )}

                          <div className="row gy-4">
                            <div className="col-sm-6">
                              <span className="d-block text-white-50 mb-1">Available bonus</span>
                              <strong>{formatAmount(wallet.bonusBalance)}</strong>
                            </div>
                            <div className="col-sm-6">
                              <span className="d-block text-white-50 mb-1">Promo code</span>
                              <strong>{wallet.promoCode || "Not linked"}</strong>
                            </div>
                            <div className="col-sm-6">
                              <span className="d-block text-white-50 mb-1">Expiry</span>
                              <strong>{formatDate(wallet.expiryDate)}</strong>
                            </div>
                            <div className="col-sm-6">
                              <span className="d-block text-white-50 mb-1">Wagering</span>
                              <strong>
                                {formatAmount(wagered)} / {formatAmount(required)}
                              </strong>
                            </div>
                          </div>

                          <div className="mt-5">
                            <div className="progress bg1-color" style={{ height: 8 }}>
                              <div
                                className="progress-bar g1-bg"
                                role="progressbar"
                                style={{ width: `${percent}%` }}
                                aria-valuenow={percent}
                                aria-valuemin={0}
                                aria-valuemax={100}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="pay_method__tabletwo">
                <div className="pay_method__paymethod-title d-flex align-items-center gap-3 mb-5 mb-md-6">
                  <IconHistory className="g1-color" />
                  <h5 className="n10-color">Bonus Transactions</h5>
                </div>
                <div style={{ overflowX: "auto" }} className="pay_method__table-scrollbar">
                  <table className="w-100 text-center p2-bg">
                    <thead>
                      <tr>
                        <th className="text-nowrap">Date</th>
                        <th className="text-nowrap">Type</th>
                        <th className="text-nowrap">Amount</th>
                        <th className="text-nowrap">Balance after</th>
                        <th className="text-nowrap">Reference</th>
                      </tr>
                    </thead>
                    <tbody>
                      {isLoading ? (
                        <tr>
                          <td colSpan={5} className="py-5 text-white">
                            Loading transactions...
                          </td>
                        </tr>
                      ) : bonuses.transactions.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-5 text-white-50">
                            No bonus transactions found.
                          </td>
                        </tr>
                      ) : (
                        bonuses.transactions.map((transaction, index) => (
                          <tr key={transaction.bonusTransactionId ?? `${transaction.createdAt}-${index}`}>
                            <td className="text-nowrap">{formatDate(transaction.createdAt)}</td>
                            <td className="text-nowrap">{transaction.transactionType}</td>
                            <td className="text-nowrap fw-bold">{formatAmount(transaction.amount)}</td>
                            <td className="text-nowrap">{formatAmount(transaction.balanceAfter)}</td>
                            <td className="text-nowrap">
                              {transaction.description ||
                                [transaction.referenceType, transaction.referenceId]
                                  .filter(Boolean)
                                  .join(" #") ||
                                "Unavailable"}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
