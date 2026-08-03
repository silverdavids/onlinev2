"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  accountActivityApi,
  type AccountStatementDto,
} from "@/src/api/accountActivityApi";
import { ApiError, normalizeApiError } from "@/src/api/apiError";
import { formatUgx } from "@/src/account/formatCurrency";
import { useAuth } from "@/src/auth/useAuth";

const PAGE_SIZE = 10;

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

const getDirection = (transactionType: string, balanceBefore: number | null, balanceAfter: number | null) => {
  const normalized = transactionType.toLowerCase();
  if (normalized.includes("credit") || normalized.includes("deposit") || normalized.includes("in")) {
    return "credit";
  }
  if (normalized.includes("debit") || normalized.includes("withdraw") || normalized.includes("bet")) {
    return "debit";
  }
  if (balanceBefore !== null && balanceAfter !== null) {
    return balanceAfter >= balanceBefore ? "credit" : "debit";
  }
  return "neutral";
};

export default function TransactionHistory() {
  const { isAuthenticated } = useAuth();
  const [items, setItems] = useState<AccountStatementDto[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(() => formatDateInput(new Date(Date.now() - 30 * 86400000)));
  const [endDate, setEndDate] = useState(() => formatDateInput(new Date()));

  const hasMore = useMemo(() => {
    if (total === null) return items.length >= PAGE_SIZE;
    return items.length < total;
  }, [items.length, total]);

  const loadPage = useCallback(
    async (nextPage: number, replace = false) => {
      if (!isAuthenticated) return;
      setIsLoading(true);
      setError(null);
      try {
        const response = await accountActivityApi.getStatements({
          page: nextPage,
          itemsPerPage: PAGE_SIZE,
          startDate,
          endDate,
        });
        setItems((current) => {
          const merged = replace ? response.items : [...current, ...response.items];
          const seen = new Set<number | string>();
          return merged.filter((item, index) => {
            const record = item as Record<string, unknown>;
            const id = read<number>(record, "StatementId", "statementId") ?? `${read<string>(record, "StatetmentDate", "statetmentDate")}-${index}`;
            if (seen.has(id)) return false;
            seen.add(id);
            return true;
          });
        });
        setTotal(response.total);
        setPage(nextPage);
      } catch (err) {
        const apiError = normalizeApiError(err);
        if (apiError instanceof ApiError && apiError.status === 401) {
          setError("Sign in to view your transactions.");
        } else {
          setError(apiError.message);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [endDate, isAuthenticated, startDate]
  );

  useEffect(() => {
    void loadPage(1, true);
  }, [loadPage]);

  const applyFilters = (event: React.FormEvent) => {
    event.preventDefault();
    void loadPage(1, true);
  };

  return (
    <div className="pay_method__tabletwo">
      <form className="d-flex flex-wrap align-items-end gap-4 mb-5" onSubmit={applyFilters}>
        <div>
          <label className="mb-2 d-block" htmlFor="transaction-start-date">From</label>
          <input id="transaction-start-date" className="n11-bg rounded-8" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
        </div>
        <div>
          <label className="mb-2 d-block" htmlFor="transaction-end-date">To</label>
          <input id="transaction-end-date" className="n11-bg rounded-8" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
        </div>
        <button type="submit" className="cmn-btn py-3 px-6 fw-bold" disabled={isLoading}>
          {isLoading ? "Loading..." : "Apply"}
        </button>
      </form>

      <div style={{ overflowX: "auto" }} className="pay_method__table-scrollbar">
        <table className="w-100 text-center p2-bg">
          <thead>
            <tr>
              <th className="text-nowrap">Reference</th>
              <th className="text-nowrap">Date</th>
              <th className="text-nowrap">Type</th>
              <th className="text-nowrap">Amount</th>
              <th className="text-nowrap">Before</th>
              <th className="text-nowrap">After</th>
              <th className="text-nowrap">Method</th>
              <th className="text-nowrap">Description</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && items.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-5 text-white">Loading account transactions...</td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={8} className="py-5 text-danger fw-bold">{error}</td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-5 text-white-50">No transactions found.</td>
              </tr>
            ) : (
              items.map((item) => {
                const record = item as Record<string, unknown>;
                const id = read<number>(record, "StatementId", "statementId");
                const amount = toNumber(read(record, "Amount", "amount"));
                const before = toNumber(read(record, "BalBefore", "balBefore"));
                const after = toNumber(read(record, "BalAfter", "balAfter"));
                const type = String(read(record, "Transcation", "transcation") ?? "Transaction");
                const direction = getDirection(String(read(record, "TransactionType", "transactionType") ?? type), before, after);
                return (
                  <tr key={id ?? `${read<string>(record, "StatetmentDate", "statetmentDate")}-${read<string>(record, "Serial", "serial")}`}>
                    <td className="text-nowrap">{String(read(record, "Serial", "serial") ?? id ?? "-")}</td>
                    <td className="text-nowrap">{formatDateTime(read(record, "StatetmentDate", "statetmentDate") ?? null)}</td>
                    <td className="text-nowrap">{type}</td>
                    <td className={`text-nowrap fw-bold ${direction === "credit" ? "g1-color" : direction === "debit" ? "r1-color" : ""}`}>
                      {amount === null ? "Unavailable" : formatUgx(amount)}
                    </td>
                    <td className="text-nowrap">{before === null ? "-" : formatUgx(before)}</td>
                    <td className="text-nowrap">{after === null ? "-" : formatUgx(after)}</td>
                    <td className="text-nowrap">{String(read(record, "Method", "method") ?? "Online")}</td>
                    <td className="text-start">{String(read(record, "Comment", "comment") ?? "")}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {items.length > 0 && (
        <div className="d-flex align-items-center justify-content-between gap-4 flex-wrap mt-5">
          <span className="text-white-50">
            Showing {items.length}{total !== null ? ` of ${total}` : ""} transactions
          </span>
          {hasMore && (
            <button type="button" className="cmn-btn py-2 px-5 fw-bold" disabled={isLoading} onClick={() => void loadPage(page + 1)}>
              {isLoading ? "Loading..." : "Load more"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

