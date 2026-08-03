"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { IconArrowLeft, IconTicket } from "@tabler/icons-react";
import { normalizeApiError } from "@/src/api/apiError";
import { ticketHistoryApi } from "@/src/api/ticketHistoryApi";
import type { TicketDetailsDto, TicketSelectionDto } from "@/src/api/ticketHistoryApi";
import {
  formatDateTime,
  formatMoney,
  formatOdd,
  normalizeTicketStatus,
  possibleReturn,
  selectionStatusView,
  selectionValue,
  statusClassName,
  ticketValue,
} from "@/src/tickets/ticketViewModels";

type Props = {
  receiptId: number;
};

const scoreText = (selection: TicketSelectionDto): string => {
  const liveScore = selectionValue<string | null>(selection, "LiveScore", "liveScore");
  const score = selectionValue<string | null>(selection, "Score", "score");
  if (liveScore || score) return liveScore ?? score ?? "-";

  const home = selectionValue<number>(selection, "HomeScore", "homeScore");
  const away = selectionValue<number>(selection, "AwayScore", "awayScore");
  if (home === undefined || away === undefined || home < 0 || away < 0) return "-";
  return `${home}:${away}`;
};

const halfTimeScoreText = (selection: TicketSelectionDto): string => {
  const home = selectionValue<number>(
    selection,
    "HalfTimeHomeScore",
    "halfTimeHomeScore"
  );
  const away = selectionValue<number>(
    selection,
    "HalfTimeAwayScore",
    "halfTimeAwayScore"
  );
  if (home === undefined || away === undefined || home < 0 || away < 0) return "-";
  return `${home}:${away}`;
};

export default function TicketDetailsPage({ receiptId }: Props) {
  const [ticket, setTicket] = useState<TicketDetailsDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadTicket = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await ticketHistoryApi.getTicket(receiptId);
        if (!cancelled) setTicket(result);
      } catch (loadError) {
        const apiError = normalizeApiError(loadError);
        if (!cancelled) {
          setError(
            apiError.status === 404
              ? "Ticket was not found for this account."
              : apiError.message || "Ticket details could not be loaded."
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void loadTicket();
    return () => {
      cancelled = true;
    };
  }, [receiptId]);

  const bets = useMemo(
    () => ticketValue<TicketSelectionDto[]>(ticket ?? {}, "Bets", "bets") ?? [],
    [ticket]
  );
  const status = ticket ? normalizeTicketStatus(ticket) : null;
  const stake = ticket ? ticketValue<number>(ticket, "Stake", "stake") : null;
  const totalOdds = ticket ? ticketValue<number>(ticket, "TotalOdds", "totalOdds") : null;
  const isLive = Boolean(ticket && ticketValue<boolean>(ticket, "IsLive", "isLive"));

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
                    <h5 className="n10-color">Ticket details</h5>
                  </div>
                  <Link className="cmn-btn px-5 py-2" href="/tickets">
                    <IconArrowLeft className="me-2" size={18} />
                    Tickets
                  </Link>
                </div>

                {isLoading && <p className="mb-0 text-white-50">Loading ticket...</p>}
                {error && <p className="mb-0 text-danger fw-bold">{error}</p>}

                {ticket && status && (
                  <>
                    <div className="row gy-4 mb-6">
                      <div className="col-sm-6 col-lg-3">
                        <span className="fs-seven text-white-50 d-block mb-1">Receipt</span>
                        <span className="fw-bold n10-color">
                          #{ticketValue(ticket, "ReceiptId", "receiptId") ?? receiptId}
                        </span>
                        <span className="d-block fs-nine text-white-50">
                          {ticketValue(ticket, "SerialCode", "serialCode") ?? "-"}
                        </span>
                      </div>
                      <div className="col-sm-6 col-lg-3">
                        <span className="fs-seven text-white-50 d-block mb-1">Placed</span>
                        <span className="fw-bold n10-color">
                          {formatDateTime(ticketValue(ticket, "ReceiptDate", "receiptDate"))}
                        </span>
                      </div>
                      <div className="col-sm-6 col-lg-3">
                        <span className="fs-seven text-white-50 d-block mb-1">Status</span>
                        <span className={`fw-bold ${statusClassName(status.tone)}`}>
                          {status.label}
                        </span>
                      </div>
                      <div className="col-sm-6 col-lg-3">
                        <span className="fs-seven text-white-50 d-block mb-1">Type</span>
                        <span className="fw-bold n10-color">{isLive ? "Live" : "Prematch"}</span>
                      </div>
                    </div>

                    <div className="row gy-4 mb-6">
                      <div className="col-sm-6 col-lg-3">
                        <span className="fs-seven text-white-50 d-block mb-1">Stake</span>
                        <span className="fw-bold n10-color">UGX {formatMoney(stake)}</span>
                      </div>
                      <div className="col-sm-6 col-lg-3">
                        <span className="fs-seven text-white-50 d-block mb-1">Total odds</span>
                        <span className="fw-bold n10-color">{formatOdd(totalOdds)}</span>
                      </div>
                      <div className="col-sm-6 col-lg-3">
                        <span className="fs-seven text-white-50 d-block mb-1">Possible return</span>
                        <span className="fw-bold n10-color">
                          UGX{" "}
                          {formatMoney(
                            ticketValue(ticket, "PossibleReturn", "possibleReturn") ??
                              possibleReturn(stake, totalOdds)
                          )}
                        </span>
                      </div>
                      <div className="col-sm-6 col-lg-3">
                        <span className="fs-seven text-white-50 d-block mb-1">Payout</span>
                        <span className="fw-bold n10-color">
                          UGX{" "}
                          {formatMoney(
                            ticketValue(ticket, "Payout", "payout") ??
                              ticketValue(ticket, "AmountPaid", "amountPaid")
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="row gy-4 mb-6">
                      <div className="col-sm-6 col-lg-3">
                        <span className="fs-seven text-white-50 d-block mb-1">Booking</span>
                        <span className="fw-bold n10-color">
                          {ticketValue(ticket, "BookingCode", "bookingCode") ?? "-"}
                        </span>
                      </div>
                      <div className="col-sm-6 col-lg-3">
                        <span className="fs-seven text-white-50 d-block mb-1">Payment source</span>
                        <span className="fw-bold n10-color">
                          {ticketValue(ticket, "PaymentSource", "paymentSource") ?? "-"}
                        </span>
                      </div>
                      <div className="col-sm-6 col-lg-3">
                        <span className="fs-seven text-white-50 d-block mb-1">Payment reference</span>
                        <span className="fw-bold n10-color text-break">
                          {ticketValue(ticket, "PaymentReference", "paymentReference") ?? "-"}
                        </span>
                      </div>
                      <div className="col-sm-6 col-lg-3">
                        <span className="fs-seven text-white-50 d-block mb-1">Paid time</span>
                        <span className="fw-bold n10-color">
                          {formatDateTime(ticketValue(ticket, "TimePaid", "timePaid"))}
                        </span>
                      </div>
                    </div>

                    <div className="pay_method__tabletwo">
                      <div
                        className="pay_method__table-scrollbar"
                        style={{ overflowX: "auto" }}
                      >
                        <table className="w-100 text-center p2-bg">
                          <thead>
                            <tr>
                              <th className="text-nowrap">Match</th>
                              <th className="text-nowrap">League</th>
                              <th className="text-nowrap">Match time</th>
                              <th className="text-nowrap">Market</th>
                              <th className="text-nowrap">Option</th>
                              <th className="text-nowrap">Line</th>
                              <th className="text-nowrap">Odd</th>
                              <th className="text-nowrap">Type</th>
                              <th className="text-nowrap">Score</th>
                              <th className="text-nowrap">HT</th>
                              <th className="text-nowrap">Live time</th>
                              <th className="text-nowrap">Result</th>
                            </tr>
                          </thead>
                          <tbody>
                            {bets.map((selection) => {
                              const selectionStatus = selectionStatusView(
                                selectionValue<number>(
                                  selection,
                                  "SelectionStatus",
                                  "selectionStatus"
                                )
                              );
                              const selectionIsLive = Boolean(
                                selectionValue<boolean>(selection, "IsLive", "isLive")
                              );
                              const minute = selectionValue<number>(
                                selection,
                                "LiveMinute",
                                "liveMinute"
                              );
                              const period = selectionValue<number | null>(
                                selection,
                                "PeriodCode",
                                "periodCode"
                              );

                              return (
                                <tr key={selectionValue(selection, "BetId", "betId")}>
                                  <td className="text-nowrap">
                                    {selectionValue(selection, "HomeTeam", "homeTeam") ?? "Home"}
                                    {" vs "}
                                    {selectionValue(selection, "AwayTeam", "awayTeam") ?? "Away"}
                                    <span className="d-block fs-nine text-white-50">
                                      Match {selectionValue(selection, "MatchId", "matchId") ?? "-"}
                                    </span>
                                  </td>
                                  <td className="text-nowrap">
                                    {selectionValue(selection, "League", "league") ?? "-"}
                                  </td>
                                  <td className="text-nowrap">
                                    {formatDateTime(
                                      selectionValue(selection, "MatchTime", "matchTime")
                                    )}
                                  </td>
                                  <td className="text-nowrap">
                                    {selectionValue(selection, "Market", "market") ?? "-"}
                                  </td>
                                  <td className="text-nowrap">
                                    {selectionValue(selection, "Option", "option") ?? "-"}
                                  </td>
                                  <td className="text-nowrap">
                                    {selectionValue(selection, "Line", "line") ?? "-"}
                                  </td>
                                  <td className="text-nowrap">
                                    {formatOdd(selectionValue(selection, "Odd", "odd"))}
                                  </td>
                                  <td className="text-nowrap">
                                    {selectionIsLive ? "Live" : "Prematch"}
                                  </td>
                                  <td className="text-nowrap">{scoreText(selection)}</td>
                                  <td className="text-nowrap">{halfTimeScoreText(selection)}</td>
                                  <td className="text-nowrap">
                                    {selectionIsLive
                                      ? `${minute ?? 0}'${period ? ` P${period}` : ""}`
                                      : "-"}
                                  </td>
                                  <td className="text-nowrap">
                                    <span
                                      className={`fw-bold ${statusClassName(
                                        selectionStatus.tone
                                      )}`}
                                    >
                                      {selectionStatus.label}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
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
