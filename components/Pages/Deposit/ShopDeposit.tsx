"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { IconBuildingStore, IconCheck, IconCreditCard, IconHistory } from "@tabler/icons-react";
import { useRouter, useSearchParams } from "next/navigation";
import { depositApi, type AccountStatementViewModel } from "@/src/api/depositApi";
import { normalizeApiError } from "@/src/api/apiError";
import { useAccount } from "@/src/account/useAccount";
import { formatUgx } from "@/src/account/formatCurrency";

type DepositMethod = "mobile-money" | "shop";

type SuccessDetails = {
  code: string;
  amount: number | null;
  balance: number | null;
  date: string | null;
  branch: string | null;
  message: string;
};

const methodFromQuery = (value: string | null): DepositMethod =>
  value?.toLowerCase() === "shop" ? "shop" : "mobile-money";

const formatDate = (value: string | null) => {
  if (!value) return "Unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

const findStatementForCode = (
  statements: AccountStatementViewModel[],
  code: string
) => {
  const normalizedCode = code.trim().replace(/-/g, "").toLowerCase();
  return statements.find((statement) =>
    statement.comment.replace(/-/g, "").toLowerCase().includes(normalizedCode)
  );
};

export default function ShopDeposit() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { balance, isLoadingAccount, refreshAccount } = useAccount();
  const [method, setMethod] = useState<DepositMethod>(
    methodFromQuery(searchParams.get("method"))
  );
  const [depositCode, setDepositCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<SuccessDetails | null>(null);
  const [statements, setStatements] = useState<AccountStatementViewModel[]>([]);
  const [isLoadingStatements, setIsLoadingStatements] = useState(false);
  const [statementError, setStatementError] = useState<string | null>(null);

  const balanceText =
    typeof balance === "number"
      ? formatUgx(balance)
      : isLoadingAccount
        ? "Loading..."
        : "Unavailable";

  const recentTransactions = useMemo(
    () => statements.slice(0, 8),
    [statements]
  );

  const loadStatements = useCallback(async () => {
    setIsLoadingStatements(true);
    setStatementError(null);
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - 30);
      const nextStatements = await depositApi.getMyStatements({
        params: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
      });
      setStatements(nextStatements);
      return nextStatements;
    } catch (err) {
      const apiError = normalizeApiError(err);
      setStatementError(apiError.message);
      return [];
    } finally {
      setIsLoadingStatements(false);
    }
  }, []);

  const selectMethod = (nextMethod: DepositMethod) => {
    setMethod(nextMethod);
    const queryMethod = nextMethod === "shop" ? "shop" : "mobile-money";
    router.replace(`/deposit?method=${queryMethod}`, { scroll: false });
  };

  useEffect(() => {
    setMethod(methodFromQuery(searchParams.get("method")));
  }, [searchParams]);

  useEffect(() => {
    void loadStatements();
  }, [loadStatements]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    const trimmedCode = depositCode.trim();
    setError(null);
    setSuccess(null);

    if (!trimmedCode) {
      setError("Deposit code is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await depositApi.redeemShopDepositCode(trimmedCode);
      const refreshed = await refreshAccount();
      const latestStatements = await loadStatements();
      const matchingStatement = findStatementForCode(latestStatements, trimmedCode);
      const amount = Number(response.amount ?? response.Amount);
      const balanceAfter = Number(response.balance ?? response.Balance);

      setSuccess({
        code: response.code ?? response.Code ?? trimmedCode,
        amount: Number.isFinite(amount) ? amount : matchingStatement?.amount ?? null,
        balance: Number.isFinite(balanceAfter)
          ? balanceAfter
          : refreshed?.balance ?? matchingStatement?.balanceAfter ?? null,
        date: matchingStatement?.date ?? null,
        branch: null,
        message: response.message ?? response.Message ?? "Deposit successful.",
      });
      setDepositCode("");
    } catch (err) {
      const apiError = normalizeApiError(err);
      setError(apiError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="pay_method pb-120">
      <div className="container-fluid">
        <div className="row">
          <div className="col-12 gx-0 gx-sm-4">
            <div className="hero_area__main">
              <div className="pay_method__paymethod p-4 p-lg-6 p2-bg rounded-8 mb-8 mb-md-10">
                <div className="pay_method__paymethod-title d-flex align-items-center justify-content-between gap-3 mb-5 mb-md-6 flex-wrap">
                  <div className="d-flex align-items-center gap-3">
                    <IconCreditCard className="ti ti-credit-card fs-four g1-color" />
                    <h5 className="n10-color">Deposit</h5>
                  </div>
                  <div className="text-end">
                    <span className="fs-seven text-white-50 d-block mb-1">Current balance</span>
                    <span className="fw-bold n10-color">{balanceText}</span>
                  </div>
                </div>

                <div className="d-flex align-items-center flex-wrap gap-3">
                  <button
                    type="button"
                    className={`cmn-btn py-2 px-5 fw-bold ${method === "mobile-money" ? "" : "second-alt"}`}
                    onClick={() => selectMethod("mobile-money")}>
                    Use Mobile Money
                  </button>
                  <button
                    type="button"
                    className={`cmn-btn py-2 px-5 fw-bold ${method === "shop" ? "" : "second-alt"}`}
                    onClick={() => selectMethod("shop")}>
                    Shop Deposit
                  </button>
                </div>
              </div>

              {method === "shop" ? (
                <div className="pay_method__paymethod p-4 p-lg-6 p2-bg rounded-8 mb-8 mb-md-10">
                  <div className="pay_method__paymethod-title d-flex align-items-center gap-3 mb-5 mb-md-6">
                    <IconBuildingStore className="ti ti-building-store fs-four g1-color" />
                    <h5 className="n10-color">Shop Deposit</h5>
                  </div>

                  {error && (
                    <div className="alert alert-danger mb-5" role="alert">
                      {error}
                    </div>
                  )}

                  {success && (
                    <div className="alert alert-success mb-5" role="status">
                      <div className="d-flex align-items-center gap-2 mb-3">
                        <IconCheck size={20} />
                        <strong>{success.message}</strong>
                      </div>
                      <div className="row gy-3">
                        <div className="col-sm-6 col-lg-3">
                          <span className="d-block text-muted">Deposit code</span>
                          <span className="fw-bold">{success.code}</span>
                        </div>
                        <div className="col-sm-6 col-lg-3">
                          <span className="d-block text-muted">Amount</span>
                          <span className="fw-bold">
                            {typeof success.amount === "number" ? formatUgx(success.amount) : "Unavailable"}
                          </span>
                        </div>
                        <div className="col-sm-6 col-lg-3">
                          <span className="d-block text-muted">Balance after</span>
                          <span className="fw-bold">
                            {typeof success.balance === "number" ? formatUgx(success.balance) : "Unavailable"}
                          </span>
                        </div>
                        <div className="col-sm-6 col-lg-3">
                          <span className="d-block text-muted">Transaction time</span>
                          <span className="fw-bold">{formatDate(success.date)}</span>
                        </div>
                        <div className="col-sm-6 col-lg-3">
                          <span className="d-block text-muted">Branch/shop</span>
                          <span className="fw-bold">{success.branch ?? "Unavailable"}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <form className="pay_method__formarea" onSubmit={handleSubmit}>
                    <label className="mb-3 d-block" htmlFor="shop-deposit-code">
                      Deposit code
                    </label>
                    <div className="d-flex w-100 p1-bg rounded-8 mb-5">
                      <input
                        id="shop-deposit-code"
                        className="w-100"
                        type="text"
                        autoComplete="one-time-code"
                        placeholder="Enter deposit code"
                        value={depositCode}
                        onChange={(event) => setDepositCode(event.target.value)}
                        disabled={isSubmitting}
                      />
                    </div>
                    <button
                      type="submit"
                      className="py-4 px-5 n11-bg rounded-2 w-100 fw-bold"
                      disabled={isSubmitting}>
                      {isSubmitting ? "Redeeming..." : "Redeem shop deposit"}
                    </button>
                  </form>
                </div>
              ) : (
                <div className="pay_method__paymethod p-4 p-lg-6 p2-bg rounded-8 mb-8 mb-md-10">
                  <div className="pay_method__paymethod-title mb-5 mb-md-6">
                    <h5 className="n10-color">Mobile Money</h5>
                  </div>
                  <p className="mb-0 text-white-50">
                    Mobile Money deposits remain separate from shop deposit code redemption.
                  </p>
                </div>
              )}

              <div className="pay_method__tabletwo">
                <div className="pay_method__paymethod-title d-flex align-items-center gap-3 mb-5 mb-md-6">
                  <IconHistory className="ti ti-history fs-four g1-color" />
                  <h5 className="n10-color">Recent Transactions</h5>
                </div>
                <div style={{ overflowX: "auto" }} className="pay_method__table-scrollbar">
                  <table className="w-100 text-center p2-bg">
                    <thead>
                      <tr>
                        <th className="text-nowrap">Date</th>
                        <th className="text-nowrap">Transaction</th>
                        <th className="text-nowrap">Amount</th>
                        <th className="text-nowrap">Balance after</th>
                      </tr>
                    </thead>
                    <tbody>
                      {isLoadingStatements ? (
                        <tr>
                          <td colSpan={4} className="py-5 text-white">
                            Loading transactions...
                          </td>
                        </tr>
                      ) : statementError ? (
                        <tr>
                          <td colSpan={4} className="py-5 text-danger fw-bold">
                            {statementError}
                          </td>
                        </tr>
                      ) : recentTransactions.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-5 text-white-50">
                            No recent transactions found.
                          </td>
                        </tr>
                      ) : (
                        recentTransactions.map((transaction, index) => (
                          <tr key={`${transaction.date ?? "tx"}-${index}`}>
                            <td className="text-nowrap">{formatDate(transaction.date)}</td>
                            <td className="text-nowrap">{transaction.transaction || transaction.comment}</td>
                            <td className="text-nowrap fw-bold">
                              {typeof transaction.amount === "number"
                                ? formatUgx(transaction.amount)
                                : "Unavailable"}
                            </td>
                            <td className="text-nowrap">
                              {typeof transaction.balanceAfter === "number"
                                ? formatUgx(transaction.balanceAfter)
                                : "Unavailable"}
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
