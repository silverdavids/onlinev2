"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { IconRefresh, IconTicket } from "@tabler/icons-react";
import { normalizeApiError } from "@/src/api/apiError";
import { ticketHistoryApi } from "@/src/api/ticketHistoryApi";
import type { TicketHistoryItemDto } from "@/src/api/ticketHistoryApi";
import {
  formatDateTime,
  formatMoney,
  formatOdd,
  normalizeTicketId,
  normalizeTicketStatus,
  possibleReturn,
  statusClassName,
  ticketValue,
} from "@/src/tickets/ticketViewModels";

const PAGE_SIZE = 10;

export default function TicketHistoryPage() {
  const [tickets, setTickets] = useState<TicketHistoryItemDto[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const hasNextPage = useMemo(() => {
    if (total === null) return tickets.length >= PAGE_SIZE;
    return tickets.length < total;
  }, [tickets.length, total]);

  const loadTickets = async (nextPage: number, append = false) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await ticketHistoryApi.getTickets(nextPage, PAGE_SIZE);
      setTickets((current) => {
        const merged = append ? [...current, ...result.items] : result.items;
        const byReceiptId = new Map<number, TicketHistoryItemDto>();
        merged.forEach((ticket) => {
          const id = normalizeTicketId(ticket);
          if (id !== null && !byReceiptId.has(id)) byReceiptId.set(id, ticket);
        });
        return Array.from(byReceiptId.values());
      });
      setTotal(result.total);
      setPage(nextPage);
    } catch (loadError) {
      const apiError = normalizeApiError(loadError);
      setError(apiError.message || "Ticket history could not be loaded.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadTickets(1);
  }, []);

  return (
    <section className="pay_method pb-120">
      <div className="container-fluid">
        <div className="row">
          <div className="col-12 gx-0 gx-sm-4">
            <div className="hero_area__main">
              <div className="pay_method__paymethod p-4 p-lg-6 p2-bg rounded-8 mb-8 mb-md-10">
                <div className="pay_method__paymethod-title d-flex align-items-center justify-content-between gap-3 mb-5 mb-md-6 flex-wrap">
                  <div className="d-flex align-items-center gap-3">
                    <IconTicket className="ti ti-ticket fs-four g1-color" />
                    <h5 className="n10-color">My tickets</h5>
                  </div>
                  <button
                    className="cmn-btn py-2 px-5 fw-bold"
                    disabled={isLoading}
                    onClick={() => void loadTickets(1)}
                    type="button"
                  >
                    <IconRefresh className="me-2" size={18} />
                    {isLoading ? "Loading..." : "Refresh"}
                  </button>
                </div>

                {error && <p className="mb-0 text-danger fw-bold">{error}</p>}
                {!error && isLoading && tickets.length === 0 && (
                  <p className="mb-0 text-white-50">Loading tickets...</p>
                )}
                {!error && !isLoading && tickets.length === 0 && (
                  <p className="mb-0 text-white-50">No tickets found.</p>
                )}

                {tickets.length > 0 && (
                  <>
                    <div className="pay_method__tabletwo">
                      <div
                        className="pay_method__table-scrollbar"
                        style={{ overflowX: "auto" }}
                      >
                        <table className="w-100 text-center p2-bg">
                          <thead>
                            <tr>
                              <th className="text-nowrap">Receipt</th>
                              <th className="text-nowrap">Placed</th>
                              <th className="text-nowrap">Stake</th>
                              <th className="text-nowrap">Odds</th>
                              <th className="text-nowrap">Possible return</th>
                              <th className="text-nowrap">Payout</th>
                              <th className="text-nowrap">Selections</th>
                              <th className="text-nowrap">Type</th>
                              <th className="text-nowrap">Booking</th>
                              <th className="text-nowrap">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {tickets.map((ticket) => {
                              const receiptId = normalizeTicketId(ticket);
                              const status = normalizeTicketStatus(ticket);
                              const stake = ticketValue<number>(ticket, "Stake", "stake");
                              const odds = ticketValue<number>(
                                ticket,
                                "TotalOdds",
                                "totalOdds"
                              );
                              const isLive = Boolean(
                                ticketValue<boolean>(ticket, "IsLive", "isLive")
                              );
                              const bookingCode =
                                ticketValue<number | null>(
                                  ticket,
                                  "BookingCode",
                                  "bookingCode"
                                ) ?? null;

                              return (
                                <tr key={receiptId ?? ticketValue(ticket, "SerialCode", "serialCode")}>
                                  <td className="text-nowrap">
                                    {receiptId ? (
                                      <Link className="g1-color fw-bold" href={`/tickets/${receiptId}`}>
                                        #{receiptId}
                                      </Link>
                                    ) : (
                                      "-"
                                    )}
                                    <span className="d-block fs-nine text-white-50">
                                      {ticketValue(ticket, "SerialCode", "serialCode") ?? "-"}
                                    </span>
                                  </td>
                                  <td className="text-nowrap">
                                    {formatDateTime(
                                      ticketValue(ticket, "ReceiptDate", "receiptDate")
                                    )}
                                  </td>
                                  <td className="text-nowrap">UGX {formatMoney(stake)}</td>
                                  <td className="text-nowrap">{formatOdd(odds)}</td>
                                  <td className="text-nowrap">
                                    UGX {formatMoney(possibleReturn(stake, odds))}
                                  </td>
                                  <td className="text-nowrap">
                                    UGX{" "}
                                    {formatMoney(
                                      ticketValue(ticket, "AmountPaid", "amountPaid")
                                    )}
                                  </td>
                                  <td className="text-nowrap">
                                    {ticketValue(ticket, "TotalBetsCount", "totalBetsCount") ??
                                      ticketValue(ticket, "SetSize", "setSize") ??
                                      "-"}
                                  </td>
                                  <td className="text-nowrap">{isLive ? "Live" : "Prematch"}</td>
                                  <td className="text-nowrap">{bookingCode ?? "-"}</td>
                                  <td className="text-nowrap">
                                    <span className={`fw-bold ${statusClassName(status.tone)}`}>
                                      {status.label}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="d-flex justify-content-between align-items-center gap-3 mt-5 flex-wrap">
                      <span className="fs-eight text-white-50">
                        Showing {tickets.length}
                        {total !== null ? ` of ${total}` : ""} tickets
                      </span>
                      {hasNextPage && (
                        <button
                          className="cmn-btn px-5 py-2"
                          disabled={isLoading}
                          onClick={() => void loadTickets(page + 1, true)}
                          type="button"
                        >
                          {isLoading ? "Loading..." : "Load more"}
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
