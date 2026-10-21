"use client";

import { IconArrowBadgeUpFilled, IconTicket, IconTrash, IconX } from "@tabler/icons-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import BetslipNotification, { getBetslipNotice, type BetslipNotice } from "./BetslipNotification";
import type { BetslipReceiptState, BetslipBookingConfirmation } from "@/src/betslip/PrematchBetslipProvider";
import { usePrematchBetslip } from "@/src/betslip/usePrematchBetslip";
import { useAuth } from "@/src/auth/useAuth";
import { recordTicketNotification } from "@/src/notifications/ticketNotifications";

const formatNumber = (value: number | null | undefined): string => {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "-";
  }
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 2,
  }).format(value);
};

const formatOdd = (value: number): string =>
  new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

type BetslipToast = {
  id: number;
  message: string;
  notice: BetslipNotice;
  receipt: BetslipReceiptState | null;
  booking: BetslipBookingConfirmation | null;
};

export default function FooterCard() {
  const [isCardExpanded, setIsCardExpanded] = useState(false);
  const [bookingCodeInput, setBookingCodeInput] = useState("");
  const contentRef = useRef<HTMLDivElement>(null);
  const recordedResponseRef = useRef<number | null>(null);
  const { user } = useAuth();
  const [toast, setToast] = useState<BetslipToast | null>(null);
  const {
    selections,
    selectionCount,
    stakeInput,
    totalOdds,
    potentialWin,
    validation,
    serverMessage,
    serverResponseId,
    isSubmitting,
    isBooking,
    isRetrievingBooking,
    changedOdds,
    receipt,
    bookingConfirmation,
    loadedBookingCode,
    clearSelections,
    removeSelection,
    setStakeInput,
    placeTicket,
    bookTicket,
    retrieveBooking,
    acceptChangedOdds,
    cancelChangedOdds,
    removeSuspendedSelections,
  } = usePrematchBetslip();

  const hasBlockedSelections = useMemo(
    () => selections.some((selection) => selection.status === "suspended"),
    [selections]
  );
  const suspendedCount = useMemo(
    () => selections.filter((selection) => selection.status === "suspended").length,
    [selections]
  );
  const canPlaceTicket =
    selectionCount > 0 &&
    validation.valid &&
    changedOdds.length === 0 &&
    !isSubmitting &&
    !isBooking &&
    !isRetrievingBooking;
  const canBookTicket =
    selectionCount > 0 &&
    validation.valid &&
    changedOdds.length === 0 &&
    !isBooking &&
    !isSubmitting &&
    !isRetrievingBooking;
  const betslipNotice = serverMessage
    ? getBetslipNotice(serverMessage)
    : null;

  useEffect(() => {
    const stored = window.localStorage.getItem("prematch-betslip-open");
    if (stored === "true") {
      setIsCardExpanded(true);
    }

  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      "prematch-betslip-open",
      isCardExpanded ? "true" : "false"
    );
  }, [isCardExpanded]);

  useEffect(() => {
    if (isSubmitting || isBooking || isRetrievingBooking) {
      setToast(null);
      return;
    }
    if (!serverMessage) {
      setToast((current) => current?.notice.role === "alert" ? null : current);
      return;
    }
    const notice = getBetslipNotice(serverMessage);
    if (user?.id && recordedResponseRef.current !== serverResponseId) {
      recordedResponseRef.current = serverResponseId;
      recordTicketNotification(user.id, {
        title: notice.title,
        message: serverMessage,
        href: receipt?.receiptId ? `/tickets/${receipt.receiptId}` : bookingConfirmation ? "/booking-code" : "/betslip",
      });
    }
    setToast({
      id: serverResponseId,
      message: serverMessage,
      notice,
      receipt: notice.role === "status" ? receipt : null,
      booking: notice.role === "status" ? bookingConfirmation : null,
    });
  }, [serverMessage, serverResponseId, isSubmitting, isBooking, isRetrievingBooking, receipt, bookingConfirmation, user?.id]);

  const dismissToast = useCallback(() => setToast(null), []);
  const showResponseDetails = () => {
    dismissToast();
    setIsCardExpanded(true);
    requestAnimationFrame(() => contentRef.current?.scrollTo({ top: 0, behavior: "smooth" }));
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isCardExpanded &&
        event.target instanceof Element &&
        !event.target.closest(".fixed_footer, .betslip-response--floating")
      ) {
        setIsCardExpanded(false);
      }
    };

    document.body.addEventListener("click", handleClickOutside);
    return () => {
      document.body.removeEventListener("click", handleClickOutside);
    };
  }, [isCardExpanded]);

  return (
    <>
      {toast && (
        <BetslipNotification key={toast.id} notice={toast.notice} message={toast.message} onDismiss={dismissToast}>
          {toast.receipt && (
            <dl className="betslip-response__details">
              <div><dt>Receipt number</dt><dd>{toast.receipt.receiptId ?? toast.receipt.ticketNumber ?? "Pending"}</dd></div>
              <div><dt>Stake</dt><dd>USh {formatNumber(toast.receipt.stake)}</dd></div>
              <div><dt>Possible return</dt><dd>USh {formatNumber(toast.receipt.potentialPayout)}</dd></div>
            </dl>
          )}
          {toast.booking && (
            <dl className="betslip-response__details">
              <div><dt>Booking code</dt><dd>{toast.booking.bookingCode}</dd></div>
              <div><dt>Expires in</dt><dd>{toast.booking.expiresInMinutes} minutes</dd></div>
            </dl>
          )}
          {changedOdds.length > 0 && serverMessage === toast.message ? (
            <>
              <div className="betslip-response__changes">
                {changedOdds.map((change, index) => (
                  <div key={`${change.key ?? "change"}-${index}`}>
                    <span>{change.market} {change.option}</span>
                    <strong>{formatNumber(change.oldOdd)} to {formatNumber(change.newOdd)}</strong>
                  </div>
                ))}
              </div>
              <div className="betslip-response__actions">
                <button type="button" onClick={() => { acceptChangedOdds(); dismissToast(); }}>Accept changes</button>
                <button type="button" onClick={() => { cancelChangedOdds(); dismissToast(); }}>Cancel</button>
              </div>
              <p className="betslip-response__hint">After accepting, submit the slip again to confirm.</p>
            </>
          ) : serverMessage === toast.message && (
            <button className="betslip-response__view" type="button" onClick={showResponseDetails}>View slip details</button>
          )}
        </BetslipNotification>
      )}

      <div
        className={`fixed_footer smartbet-slip ${
          isCardExpanded ? "expandedtexta is-open" : "expanded2"
        }`}
      >
      <div
        className="fixed_footer__head py-3 px-4"
        onClick={() => setIsCardExpanded((expanded) => !expanded)}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setIsCardExpanded((expanded) => !expanded);
          }
        }}
      >
        <div className="d-flex justify-content-between">
          <div className="fixed_footer__head-betslip d-flex align-items-center gap-2">
            <span className="fw-bold">Bet slip</span>
            <span className="fixed_footer__head-n1">{selectionCount}</span>
            <button
              onClick={(event) => {
                event.stopPropagation();
                setIsCardExpanded((expanded) => !expanded);
              }}
              className="footfixedbtn"
              type="button"
              aria-label={isCardExpanded ? "Close betslip" : "Open betslip"}
            >
              <IconArrowBadgeUpFilled className="ti ti-arrow-badge-down-filled n5-color fs-four fixediconstyle" />
            </button>
          </div>
        </div>
      </div>

      <div ref={contentRef} className="fixed_footer__content position-relative">
          <div className="fixed_footer__content-live">
            {selectionCount > 0 && (
              <div className="smartbet-slip__selection-header">
                <strong>{selectionCount} {selectionCount === 1 ? "selection" : "selections"}</strong>
                <button type="button" onClick={clearSelections}>
                  <IconTrash size={16} aria-hidden="true" /> Clear all
                </button>
              </div>
            )}
            {selectionCount === 0 && !receipt && !bookingConfirmation && !serverMessage && (
              <div className="sportsbook-betslip-empty">
                <IconTicket size={32} aria-hidden="true" />
                <h6 className="mb-2">Your bet slip is empty</h6>
                <p className="fs-seven cpoint mb-0">
                  Tap any odds to add a selection.
                </p>
              </div>
            )}

            {receipt && (
              <div className="top_matches__cmncard p2-bg p-3 rounded-3 mb-4">
                <h6 className="mb-3">Ticket placed</h6>
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <span className="fs-eight">Receipt number</span>
                  <strong>{receipt.receiptId ?? receipt.ticketNumber ?? "-"}</strong>
                </div>
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <span className="fs-eight">Stake</span>
                  <strong>{formatNumber(receipt.stake)}</strong>
                </div>
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <span className="fs-eight">Total odds</span>
                  <strong>{formatNumber(receipt.totalOdds)}</strong>
                </div>
                <div className="d-flex align-items-center justify-content-between">
                  <span className="fs-eight">Possible return</span>
                  <strong>{formatNumber(receipt.potentialPayout)}</strong>
                </div>
                {receipt.receiptTime && (
                  <span className="fs-nine cpoint d-block mt-3">
                    {receipt.receiptTime}
                  </span>
                )}
              </div>
            )}

            {serverMessage && betslipNotice && (
              <div
                className={`betslip-response ${betslipNotice.className} mb-4`}
              >
                <strong className="d-block mb-1">{betslipNotice.title}</strong>
                <span className="fs-seven">{serverMessage}</span>
              </div>
            )}

            {bookingConfirmation && (
              <div className="top_matches__cmncard p2-bg p-3 rounded-3 mb-4">
                <h6 className="mb-3">Booking saved</h6>
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <span className="fs-eight">Booking code</span>
                  <strong>{bookingConfirmation.bookingCode}</strong>
                </div>
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <span className="fs-eight">Stake</span>
                  <strong>{formatNumber(bookingConfirmation.stake)}</strong>
                </div>
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <span className="fs-eight">Total odds</span>
                  <strong>{formatNumber(bookingConfirmation.totalOdds)}</strong>
                </div>
                <span className="fs-nine cpoint d-block mt-3">
                  Expires in {bookingConfirmation.expiresInMinutes} minutes
                </span>
              </div>
            )}

            {loadedBookingCode && !bookingConfirmation && (
              <div className="top_matches__cmncard p2-bg p-3 rounded-3 mb-4">
                <span className="fs-seven">
                  Loaded booking {loadedBookingCode}
                </span>
              </div>
            )}

            {changedOdds.length > 0 && (
              <div className="top_matches__cmncard p2-bg p-3 rounded-3 mb-4">
                <h6 className="mb-3">Odds Changed</h6>
                {changedOdds.map((change, index) => (
                  <div
                    className="d-flex align-items-center justify-content-between gap-3 mb-2"
                    key={`${change.key ?? "change"}-${index}`}
                  >
                    <span className="fs-eight">
                      {change.market} {change.option}
                    </span>
                    <span className="fs-eight">
                      {formatNumber(change.oldOdd)} to {formatNumber(change.newOdd)}
                    </span>
                  </div>
                ))}
                <div className="d-flex align-items-center gap-3 mt-3">
                  <button
                    className="cmn-btn third-alt px-4 py-2"
                    type="button"
                    onClick={acceptChangedOdds}
                  >
                    Accept Changes
                  </button>
                  <button
                    className="cmn-btn px-4 py-2"
                    type="button"
                    onClick={cancelChangedOdds}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {selections.map((selection) => (
              <div className="smartbet-slip__selection" key={selection.key}>
                <div className="smartbet-slip__selection-main">
                  <div className="smartbet-slip__selection-info">
                    <span className="smartbet-slip__match" title={`${selection.display.homeTeamName} v ${selection.display.awayTeamName}`}>
                      {selection.display.homeTeamName} v{" "}
                      {selection.display.awayTeamName}
                    </span>
                    <span className="smartbet-slip__market">
                      {selection.display.marketName} · <strong>{selection.display.selectionName}</strong>
                    </span>
                  </div>
                    <span className="smartbet-slip__odd">
                      {formatOdd(selection.operational.odd)}
                    </span>
                    <button
                      className="smartbet-slip__remove"
                      aria-label={`Remove ${selection.display.homeTeamName} v ${selection.display.awayTeamName}`}
                      type="button"
                      onClick={() => removeSelection(selection.key)}
                    >
                      <IconX size={18} aria-hidden="true" />
                    </button>
                </div>
                {selection.previousOdd !== null && (
                  <span className="fs-nine d-block cpoint">
                    Was {formatOdd(selection.previousOdd)}
                  </span>
                )}
                {selection.status === "suspended" && (
                  <span className="fs-nine d-block text-warning">
                    {selection.statusMessage ?? "Selection suspended"}
                  </span>
                )}
              </div>
            ))}

            {selectionCount > 0 && (
              <div className="smartbet-slip__controls">
                <div className="smartbet-slip__quick-stakes" aria-label="Quick stake">
                  {[1000, 2000, 5000, 10000].map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      aria-pressed={Number(stakeInput) === amount}
                      onClick={() => setStakeInput(String(amount))}
                    >
                      {amount / 1000}k
                    </button>
                  ))}
                </div>
                <label className="smartbet-slip__stake" htmlFor="prematch-stake">
                  <span>Stake (UGX)</span>
                  <input
                    id="prematch-stake"
                    inputMode="decimal"
                    min="0"
                    placeholder="Enter stake"
                    type="number"
                    step="500"
                    value={stakeInput}
                    onChange={(event) => setStakeInput(event.target.value)}
                  />
                </label>

                <div className="smartbet-slip__total">
                  <span className="fs-eight">Total odds</span>
                  <strong>{formatOdd(totalOdds)}</strong>
                </div>
                <div className="smartbet-slip__total smartbet-slip__potential">
                  <span className="fs-eight">Potential win</span>
                  <strong>USh {formatNumber(potentialWin)}</strong>
                </div>

                {!validation.valid && (
                  <div className="mb-4">
                    {validation.messages.map((message) => (
                      <span className="fs-nine d-block cpoint" key={message}>
                        {message}
                      </span>
                    ))}
                  </div>
                )}

                {hasBlockedSelections && (
                  <div className="top_matches__cmncard p2-bg p-3 rounded-3 mb-4">
                    <p className="fs-nine text-warning mb-3">
                    {suspendedCount} suspended{" "}
                      {suspendedCount === 1 ? "selection must" : "selections must"}{" "}
                      be removed before this slip can be used later.
                    </p>
                    <button
                      className="cmn-btn px-4 py-2"
                      type="button"
                      onClick={removeSuspendedSelections}
                    >
                      Remove suspended selections
                    </button>
                  </div>
                )}

                <div className="smartbet-slip__actions">
                  <button
                    className="smartbet-slip__book"
                    type="button"
                    disabled={!canBookTicket}
                    onClick={bookTicket}
                  >
                    {isBooking ? "Creating..." : "Create booking code"}
                  </button>
                  <button
                    className="smartbet-slip__place"
                    type="button"
                    disabled={!canPlaceTicket}
                    onClick={placeTicket}
                  >
                    {isSubmitting ? "Placing..." : "Place bet"}
                  </button>
                </div>
              </div>
            )}

            <details className="smartbet-slip__load-booking">
              <summary>Load booking code</summary>
              <label className="fs-eight d-block mb-2" htmlFor="prematch-booking-code">
                Booking code
              </label>
              <div className="d-flex align-items-center gap-3">
                <input
                  id="prematch-booking-code"
                  className="p2-bg rounded-3 py-2 px-3 border-0 n4-color w-100"
                  inputMode="numeric"
                  placeholder="Enter code"
                  type="text"
                  value={bookingCodeInput}
                  onChange={(event) =>
                    setBookingCodeInput(event.target.value.replace(/\D/g, ""))
                  }
                />
                <button
                  className="cmn-btn third-alt px-4 py-2"
                  type="button"
                  disabled={
                    !bookingCodeInput ||
                    isRetrievingBooking ||
                    isSubmitting ||
                    isBooking
                  }
                  onClick={() => retrieveBooking(bookingCodeInput)}
                >
                  {isRetrievingBooking ? "Loading..." : "Load"}
                </button>
              </div>
            </details>

          </div>
        </div>
      </div>
    </>
  );
}
