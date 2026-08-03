"use client";

import { IconArrowBadgeUpFilled } from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";
import { usePrematchBetslip } from "@/src/betslip/usePrematchBetslip";

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

export default function FooterCard() {
  const [isCardExpanded, setIsCardExpanded] = useState(false);
  const [isBetslipBetEnabled, setIsBetslipBetEnabled] = useState(false);
  const {
    selections,
    selectionCount,
    stakeInput,
    totalOdds,
    potentialWin,
    validation,
    serverMessage,
    isSubmitting,
    changedOdds,
    receipt,
    clearSelections,
    removeSelection,
    setStakeInput,
    placeTicket,
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
  const isValidationBlocked =
    selectionCount > 0 && (!validation.valid || changedOdds.length > 0);
  const canPlaceTicket =
    selectionCount > 0 &&
    validation.valid &&
    changedOdds.length === 0 &&
    !isSubmitting;

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
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isCardExpanded &&
        event.target instanceof Element &&
        !event.target.closest(".fixed_footer")
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
    <div
      className={`fixed_footer p3-bg rounded-5 ${
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
            <span className="fw-bold">Betslip</span>
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
          <div
            className="fixed_footer__head-quickbet d-flex align-items-center gap-2"
            onClick={(event) => event.stopPropagation()}
          >
            <span className="fw-bold">Betslip Bet</span>
            <input
              checked={isBetslipBetEnabled}
              id="prematch-betslip-bet-toggle"
              onChange={(event) => setIsBetslipBetEnabled(event.target.checked)}
              type="checkbox"
            />
            <label
              htmlFor="prematch-betslip-bet-toggle"
              aria-label="Toggle betslip bet"
            >
              Betslip Bet
            </label>
          </div>
        </div>
      </div>

      <div className="fixed_footer__content position-relative">
          <div className="fixed_footer__content-live px-4 py-5 mb-5">
            {selectionCount === 0 && (
              <div className="sportsbook-betslip-empty">
                <h6 className="mb-2">Betslip</h6>
                <span className="fs-eight cpoint d-block mb-2">
                  0 selections
                </span>
                <p className="fs-seven cpoint mb-0">
                  Select an odd to add it to your betslip
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

            {serverMessage && (
              <div className="top_matches__cmncard p2-bg p-3 rounded-3 mb-4">
                <span className="fs-seven">{serverMessage}</span>
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
              <div className="mb-4" key={selection.key}>
                <div className="d-flex align-items-start justify-content-between gap-3 mb-2">
                  <div>
                    <span className="fs-seven cpoint d-block">
                      {selection.display.homeTeamName} vs{" "}
                      {selection.display.awayTeamName}
                    </span>
                    <span className="fs-nine d-block">
                      {selection.display.league} - {selection.display.kickoff}
                    </span>
                  </div>
                  <div className="text-end">
                    <span className="fixed_footer__content-scr py-1 px-2 fs-seven d-inline-block mb-2">
                      {formatOdd(selection.operational.odd)}
                    </span>
                    <button
                      className="border-0 bg-transparent n4-color fs-nine d-block"
                      type="button"
                      onClick={() => removeSelection(selection.key)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
                <span className="fs-nine d-block">
                  {selection.display.marketName} -{" "}
                  {selection.display.selectionName}
                </span>
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
              <>
                <div className="mb-4">
                  <label className="fs-eight d-block mb-2" htmlFor="prematch-stake">
                    Stake
                  </label>
                  <input
                    id="prematch-stake"
                    className="p2-bg rounded-3 py-2 px-3 border-0 n4-color w-100"
                    inputMode="decimal"
                    min="0"
                    placeholder="Enter stake"
                    type="text"
                    value={stakeInput}
                    onChange={(event) => setStakeInput(event.target.value)}
                  />
                </div>

                <div className="d-flex align-items-center justify-content-between mb-2">
                  <span className="fs-eight">Total odds</span>
                  <strong>{formatOdd(totalOdds)}</strong>
                </div>
                <div className="d-flex align-items-center justify-content-between mb-4">
                  <span className="fs-eight">Potential win</span>
                  <strong>{formatNumber(potentialWin)}</strong>
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

                {isValidationBlocked && (
                  <span className="fs-nine cpoint d-block mb-3">
                    Resolve the validation messages above before this slip can be used later.
                  </span>
                )}

                <div className="d-flex align-items-center gap-3 flex-wrap">
                  <button
                    className="cmn-btn third-alt px-4 py-2"
                    type="button"
                    disabled={!canPlaceTicket}
                    onClick={placeTicket}
                  >
                    {isSubmitting ? "Placing..." : "Place Bet"}
                  </button>
                  <button
                    className="cmn-btn px-4 py-2"
                    type="button"
                    disabled
                    title="Booking is not part of this placement flow."
                  >
                    Booking unavailable
                  </button>
                  <button
                    className="cmn-btn px-4 py-2"
                    type="button"
                    onClick={clearSelections}
                  >
                    Clear
                  </button>
                </div>
              </>
            )}

          </div>
        </div>
    </div>
  );
}
