"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { amountData } from "@/public/data/dashBoard";
import {
  accountActivityApi,
  type WithdrawalDto,
  type WithdrawalResponseDto,
} from "@/src/api/accountActivityApi";
import { normalizeApiError } from "@/src/api/apiError";
import { formatUgx } from "@/src/account/formatCurrency";
import { useAccount } from "@/src/account/useAccount";
import { useAuth } from "@/src/auth/useAuth";

const MIN_WITHDRAWAL = 1000;
const MAX_BRANCH_WITHDRAWAL = 500000;
const HISTORY_PAGE_SIZE = 8;

const getCleanAmount = (value: unknown): string =>
  String(value || "").replace(/[^0-9]/g, "");

const toNumber = (value: unknown): number | null => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const read = <T,>(dto: Record<string, unknown>, pascal: string, camel: string): T | undefined =>
  (dto[pascal] ?? dto[camel]) as T | undefined;

const formatDateInput = (date: Date): string => date.toISOString().slice(0, 10);

const formatDateTime = (value?: string | null): string => {
  if (!value) return "Unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getStatusLabel = (status?: number, statusName?: string | null): string => {
  if (statusName) return statusName;
  if (status === 0 || status === 1) return "Pending";
  if (status === 2) return "Paid";
  if (status === 3 || status === -1) return "Failed";
  return "Unknown";
};

const getResponseMessage = (response: WithdrawalResponseDto): string =>
  response.message ?? response.Message ?? "Request Successful";

const getResponseCode = (response: WithdrawalResponseDto): string | null =>
  response.code ?? response.Code ?? null;

export default function WithdrawalAmount() {
  const initialAmount = amountData[0] ? getCleanAmount(amountData[0].amount) : "";
  const { isAuthenticated } = useAuth();
  const { balance, refreshAccount } = useAccount();

  const [activeItem, setActiveItem] = useState<any>(amountData[0]);
  const [amountText, setAmountText] = useState(initialAmount);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error" | ""; text: string }>({ type: "", text: "" });
  const [success, setSuccess] = useState<{ amount: number; code: string | null; balance: number | null; status: string } | null>(null);
  const [withdrawals, setWithdrawals] = useState<WithdrawalDto[]>([]);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotal, setHistoryTotal] = useState<number | null>(null);
  const [startDate, setStartDate] = useState(() => formatDateInput(new Date(Date.now() - 30 * 86400000)));
  const [endDate, setEndDate] = useState(() => formatDateInput(new Date()));

  const finalAmount = getCleanAmount(amountText);
  const amount = Number.parseInt(finalAmount, 10);

  const hasMoreHistory = useMemo(() => {
    if (historyTotal === null) return withdrawals.length >= HISTORY_PAGE_SIZE;
    return withdrawals.length < historyTotal;
  }, [historyTotal, withdrawals.length]);

  const loadWithdrawals = useCallback(
    async (page: number, replace = false) => {
      if (!isAuthenticated) return;
      setIsLoadingHistory(true);
      setHistoryError(null);
      try {
        const response = await accountActivityApi.getWithdrawals({
          page,
          itemsPerPage: HISTORY_PAGE_SIZE,
          startDate,
          endDate,
        });
        setWithdrawals((current) => {
          const merged = replace ? response.items : [...current, ...response.items];
          const seen = new Set<number>();
          return merged.filter((item) => {
            const id = read<number>(item as Record<string, unknown>, "WithDrawalId", "withDrawalId");
            if (!id) return true;
            if (seen.has(id)) return false;
            seen.add(id);
            return true;
          });
        });
        setHistoryTotal(response.total);
        setHistoryPage(page);
      } catch (err) {
        setHistoryError(normalizeApiError(err).message);
      } finally {
        setIsLoadingHistory(false);
      }
    },
    [endDate, isAuthenticated, startDate]
  );

  useEffect(() => {
    void loadWithdrawals(1, true);
  }, [loadWithdrawals]);

  const handleCardClick = (item: any) => {
    const cleanAmount = getCleanAmount(item.amount);
    setActiveItem(item);
    setAmountText(cleanAmount);
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const strippedValue = getCleanAmount(event.target.value);
    setAmountText(strippedValue);
    const matchingPackage = amountData.find(
      (item: any) => getCleanAmount(item.amount) === strippedValue
    );
    setActiveItem(matchingPackage || null);
  };

  const getItemStyle = (item: any) => ({
    border: `1px solid ${activeItem?.id === item.id ? "#35C31E" : "#2C3655"}`,
    cursor: "pointer",
  });

  const validateAmount = (): string | null => {
    if (!isAuthenticated) return "Sign in to request a withdrawal.";
    if (!Number.isFinite(amount) || amount <= 0) return "Enter a withdrawal amount.";
    if (amount < MIN_WITHDRAWAL) return "Amount less than minimum withdrawal.";
    if (amount > MAX_BRANCH_WITHDRAWAL) return `Amount must not exceed ${formatUgx(MAX_BRANCH_WITHDRAWAL)}.`;
    if (typeof balance === "number" && amount > balance) return "Amount exceeds current balance.";
    return null;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;

    const validationMessage = validateAmount();
    if (validationMessage) {
      setFeedback({ type: "error", text: validationMessage });
      return;
    }

    setIsSubmitting(true);
    setFeedback({ type: "", text: "" });
    setSuccess(null);

    try {
      const response = await accountActivityApi.createBranchWithdrawal(amount);
      const nextBalance = toNumber(response.balance ?? response.Balance);
      setSuccess({
        amount,
        code: getResponseCode(response),
        balance: nextBalance,
        status: "Pending",
      });
      setFeedback({ type: "success", text: getResponseMessage(response) });
      await refreshAccount().catch(() => null);
      await loadWithdrawals(1, true);
    } catch (err) {
      setFeedback({ type: "error", text: normalizeApiError(err).message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const applyHistoryFilters = (event: React.FormEvent) => {
    event.preventDefault();
    void loadWithdrawals(1, true);
  };

  return (
    <>
      <div className="pay_method__paymethod p-4 p-lg-6 p2-bg rounded-8">
        <div className="pay_method__paymethod-alitem mb-5 mb-md-6">
          <div className="pay_method__paymethod-items d-flex align-items-center gap-4 gap-sm-5 gap-md-6">
            {amountData.map((singleData: any) => (
              <div
                key={singleData.id}
                onClick={() => handleCardClick(singleData)}
                style={getItemStyle(singleData)}
                className="pay_method__paymethod-item amount-active p-2 rounded-3 cpoint">
                <div className="py-3 px-5 px-md-6 n11-bg rounded-3">
                  <span className="fs-ten fw-bold mb-2">{singleData.amount}</span>
                  <span className="fs-seven d-block">Branch code</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="text-end mb-6 mb-md-8">
          <span>Min {formatUgx(MIN_WITHDRAWAL)} | Max {formatUgx(MAX_BRANCH_WITHDRAWAL)} per branch request</span>
        </div>

        <div className="pay_method__paymethod-title mb-5 mb-md-6">
          <h5 className="n10-color">Create branch withdrawal code</h5>
        </div>

        {feedback.text && (
          <div style={{
            padding: "12px",
            borderRadius: "6px",
            marginBottom: "20px",
            fontWeight: "600",
            backgroundColor: feedback.type === "success" ? "#d4edda" : "#f8d7da",
            color: feedback.type === "success" ? "#155724" : "#721c24",
            border: `1px solid ${feedback.type === "success" ? "#c3e6cb" : "#f5c6cb"}`,
          }}>
            {feedback.text}
          </div>
        )}

        {success && (
          <div className="n11-bg rounded-8 p-4 mb-5">
            <div className="row gy-3">
              <div className="col-sm-6 col-lg-3">
                <span className="fs-seven text-white-50 d-block mb-1">Withdrawal code</span>
                <span className="fw-bold n10-color">{success.code ?? "Unavailable"}</span>
              </div>
              <div className="col-sm-6 col-lg-3">
                <span className="fs-seven text-white-50 d-block mb-1">Amount</span>
                <span className="fw-bold n10-color">{formatUgx(success.amount)}</span>
              </div>
              <div className="col-sm-6 col-lg-3">
                <span className="fs-seven text-white-50 d-block mb-1">Status</span>
                <span className="fw-bold n10-color">{success.status}</span>
              </div>
              <div className="col-sm-6 col-lg-3">
                <span className="fs-seven text-white-50 d-block mb-1">Balance</span>
                <span className="fw-bold n10-color">{success.balance === null ? "Refreshed" : formatUgx(success.balance)}</span>
              </div>
            </div>
          </div>
        )}

        <div className="pay_method__formarea">
          <form onSubmit={handleSubmit}>
            <div className="d-flex align-items-center flex-wrap flex-md-nowrap gap-5 gap-md-6 mb-5">
              <div className="d-flex w-100 p1-bg rounded-8">
                <input
                  type="text"
                  inputMode="numeric"
                  name="withdrawal_amount"
                  placeholder="Enter amount"
                  value={amountText}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="d-flex align-items-center justify-content-between mb-7 mb-md-10">
              <span>Withdraw total:</span>
              <span className="fw-bold fs-four text-success">
                {Number.isFinite(amount) ? formatUgx(amount) : formatUgx(0)}
              </span>
            </div>

            <button
              type="submit"
              className="py-4 px-5 n11-bg rounded-2 w-100 fw-bold"
              disabled={isSubmitting}>
              {isSubmitting ? "Creating withdrawal..." : "Create withdrawal code"}
            </button>
          </form>
        </div>
      </div>

      <div className="pay_method__paymethod p-4 p-lg-6 p2-bg rounded-8 mt-6">
        <div className="pay_method__paymethod-title mb-5 mb-md-6">
          <h5 className="n10-color">Withdrawal history</h5>
        </div>
        <form className="d-flex flex-wrap align-items-end gap-4 mb-5" onSubmit={applyHistoryFilters}>
          <div>
            <label className="mb-2 d-block" htmlFor="withdrawal-start-date">From</label>
            <input id="withdrawal-start-date" className="n11-bg rounded-8" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
          </div>
          <div>
            <label className="mb-2 d-block" htmlFor="withdrawal-end-date">To</label>
            <input id="withdrawal-end-date" className="n11-bg rounded-8" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
          </div>
          <button type="submit" className="cmn-btn py-3 px-6 fw-bold" disabled={isLoadingHistory}>
            {isLoadingHistory ? "Loading..." : "Apply"}
          </button>
        </form>

        <div style={{ overflowX: "auto" }} className="pay_method__table-scrollbar">
          <table className="w-100 text-center p2-bg">
            <thead>
              <tr>
                <th className="text-nowrap">Reference</th>
                <th className="text-nowrap">Date</th>
                <th className="text-nowrap">Amount</th>
                <th className="text-nowrap">Destination</th>
                <th className="text-nowrap">Status</th>
                <th className="text-nowrap">Notes</th>
              </tr>
            </thead>
            <tbody>
              {isLoadingHistory && withdrawals.length === 0 ? (
                <tr><td colSpan={6} className="py-5 text-white">Loading withdrawals...</td></tr>
              ) : historyError ? (
                <tr><td colSpan={6} className="py-5 text-danger fw-bold">{historyError}</td></tr>
              ) : withdrawals.length === 0 ? (
                <tr><td colSpan={6} className="py-5 text-white-50">No withdrawals found.</td></tr>
              ) : (
                withdrawals.map((withdrawal) => {
                  const record = withdrawal as Record<string, unknown>;
                  const id = read<number>(record, "WithDrawalId", "withDrawalId");
                  const status = read<number>(record, "RequestStatus", "requestStatus");
                  const statusLabel = getStatusLabel(status, read(record, "StatusName", "statusName") ?? null);
                  return (
                    <tr key={id ?? read<string>(record, "Requestcode", "requestcode")}>
                      <td className="text-nowrap">{String(read(record, "Requestcode", "requestcode") ?? id ?? "-")}</td>
                      <td className="text-nowrap">{formatDateTime(read(record, "RequestTime", "requestTime") ?? null)}</td>
                      <td className="text-nowrap fw-bold">{formatUgx(toNumber(read(record, "Amount", "amount")) ?? 0)}</td>
                      <td className="text-nowrap">{String(read(record, "Destination", "destination") ?? read(record, "Branch", "branch") ?? "Branch")}</td>
                      <td className="text-nowrap">
                        <span className={`fw-bold ${status === 2 ? "g1-color" : status === 3 || status === -1 ? "r1-color" : "text-warning"}`}>{statusLabel}</span>
                      </td>
                      <td className="text-start">{String(read(record, "Notes", "notes") ?? "")}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {withdrawals.length > 0 && (
          <div className="d-flex align-items-center justify-content-between gap-4 flex-wrap mt-5">
            <span className="text-white-50">
              Showing {withdrawals.length}{historyTotal !== null ? ` of ${historyTotal}` : ""} requests
            </span>
            {hasMoreHistory && (
              <button type="button" className="cmn-btn py-2 px-5 fw-bold" disabled={isLoadingHistory} onClick={() => void loadWithdrawals(historyPage + 1)}>
                {isLoadingHistory ? "Loading..." : "Load more"}
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}
