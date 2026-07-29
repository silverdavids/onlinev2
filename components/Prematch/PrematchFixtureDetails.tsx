"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { findMatchByOriginalMatchId } from "@/src/matches/activeMatchesSelectors";
import { useActiveMatches } from "@/src/matches/useActiveMatches";
import {
  getMarketDisplayName,
  getSelectionDisplayName,
  isMarketCollapsedByDefault,
  sortMarketsForDisplay,
} from "@/src/domain/prematchMarkets";
import { usePrematchBetslip } from "@/src/betslip/usePrematchBetslip";

type PrematchFixtureDetailsProps = {
  originalMatchId: string;
};

const formatOdd = (value: number): string => String(value);

const movementLabel = (movement?: "up" | "down" | "same"): string => {
  if (movement === "up") return "▲";
  if (movement === "down") return "▼";
  return "";
};

export default function PrematchFixtureDetails({
  originalMatchId,
}: PrematchFixtureDetailsProps) {
  const {
    matches,
    isLoading,
    isRefreshing,
    loaded,
    error,
    malformedRecordCount,
    droppedOddCount,
    partialRecordCount,
    oddMovements,
    refresh,
  } = useActiveMatches();
  const { isSelected, toggleSelection } = usePrematchBetslip();
  const fixture = useMemo(
    () => findMatchByOriginalMatchId(matches, originalMatchId),
    [matches, originalMatchId]
  );
  const [expandedMarkets, setExpandedMarkets] = useState<Set<string>>(
    () => new Set()
  );

  const markets = useMemo(
    () => sortMarketsForDisplay(fixture?.markets ?? []),
    [fixture]
  );
  const hasPartialPayload =
    malformedRecordCount > 0 || droppedOddCount > 0 || partialRecordCount > 0;

  const toggleMarket = (key: string) => {
    setExpandedMarkets((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  return (
    <section className="top_matches pb-5 pb-md-6">
      <div className="container-fluid">
        <div className="row">
          <div className="col-12 gx-0 gx-lg-4">
            <div className="top_matches__main">
              <div className="row w-100">
                <div className="col-12">
                  <div className="top_matches__title d-flex align-items-center gap-2 mb-4">
                    <Image
                      width={32}
                      height={32}
                      src="/images/icon/soccer-icon.png"
                      alt="Icon"
                    />
                    <h3>Fixture Details</h3>
                    {isRefreshing && !isLoading && (
                      <span className="fs-eight cpoint">Refreshing</span>
                    )}
                  </div>

                  <Link href="/" className="fs-eight cpoint d-inline-block mb-4">
                    Back to fixtures
                  </Link>

                  {isLoading && (
                    <div className="top_matches__cmncard p2-bg p-4 rounded-3 mb-4">
                      <span className="fs-seven cpoint">
                        Loading fixture details...
                      </span>
                    </div>
                  )}

                  {!isLoading && error && (
                    <div className="top_matches__cmncard p2-bg p-4 rounded-3 mb-4">
                      <p className="fs-seven mb-3">
                        Fixture details are temporarily unavailable.
                      </p>
                      <p className="fs-eight cpoint mb-3">{error}</p>
                      <button
                        className="cmn-btn py-2 px-4"
                        type="button"
                        onClick={() => void refresh().catch(() => undefined)}
                      >
                        Retry
                      </button>
                    </div>
                  )}

                  {!isLoading && !error && loaded && !fixture && (
                    <div className="top_matches__cmncard p2-bg p-4 rounded-3 mb-4">
                      <p className="fs-seven mb-0">
                        Fixture {originalMatchId} was not found in the active feed.
                      </p>
                    </div>
                  )}

                  {!isLoading && !error && fixture && (
                    <>
                      <div
                        className="top_matches__cmncard p2-bg p-4 rounded-3 mb-4"
                        data-fixture-id={fixture.originalMatchId}
                        data-match-no={fixture.matchNo ?? undefined}
                      >
                        <div className="d-flex align-items-center justify-content-between gap-4 flex-wrap mb-4">
                          <div>
                            <h3 className="mb-2">{fixture.homeTeamName}</h3>
                            <h5 className="mb-2">vs</h5>
                            <h3 className="mb-3">{fixture.awayTeamName}</h3>
                            <span className="fs-eight cpoint d-block">
                              {fixture.league}
                            </span>
                          </div>
                          <div className="text-end">
                            <span className="fs-eight cpoint d-block">
                              {fixture.displayStartTime}
                            </span>
                            <span className="fs-eight cpoint d-block">
                              OriginalMatchId: {fixture.originalMatchId}
                            </span>
                            {fixture.matchNo && (
                              <span className="fs-eight cpoint d-block">
                                MatchNo: {fixture.matchNo}
                              </span>
                            )}
                          </div>
                        </div>
                        {fixture.hasPartialData && (
                          <p className="fs-eight cpoint mb-0">
                            Some market data is currently unavailable for this
                            fixture.
                          </p>
                        )}
                      </div>

                      {hasPartialPayload && (
                        <div className="top_matches__cmncard p2-bg p-4 rounded-3 mb-4">
                          <span className="fs-eight cpoint">
                            Some feed records were incomplete and were skipped or
                            rendered with limited market data.
                          </span>
                        </div>
                      )}

                      {markets.length === 0 && (
                        <div className="top_matches__cmncard p2-bg p-4 rounded-3 mb-4">
                          <span className="fs-seven cpoint">
                            No markets are currently available for this fixture.
                          </span>
                        </div>
                      )}

                      {markets.map((market) => {
                        const defaultCollapsed = isMarketCollapsedByDefault(market);
                        const expanded = defaultCollapsed
                          ? expandedMarkets.has(market.key)
                          : !expandedMarkets.has(market.key);
                        const visibleSelections = expanded
                          ? market.selections
                          : market.selections.slice(0, 12);
                        const marketName = getMarketDisplayName(market);

                        return (
                          <div
                            className="top_matches__cmncard p2-bg p-4 rounded-3 mb-4"
                            key={market.key}
                          >
                            <div className="d-flex align-items-center justify-content-between gap-3 mb-4">
                              <h5 className="mb-0">{marketName}</h5>
                              {market.selections.length > 12 && (
                                <button
                                  className="cmn-btn py-2 px-4"
                                  type="button"
                                  onClick={() => toggleMarket(market.key)}
                                >
                                  {expanded ? "Collapse" : "Show all"}
                                </button>
                              )}
                            </div>
                            <div className="d-flex align-items-center gap-3 flex-wrap">
                              {visibleSelections.map((selection) => (
                                <button
                                  className="top_matches__innercount-item clickable-active py-2 px-6 rounded-3 n11-bg text-center border-0"
                                  key={selection.matchOddId}
                                  data-selection-id={selection.matchOddId}
                                  onClick={() =>
                                    toggleSelection(
                                      fixture,
                                      market,
                                      selection,
                                      marketName,
                                      getSelectionDisplayName(
                                        selection,
                                        market,
                                        fixture
                                      )
                                    )
                                  }
                                  style={{
                                    outline: isSelected(selection.matchOddId)
                                      ? "2px solid #35C31E"
                                      : undefined,
                                    backgroundColor: isSelected(
                                      selection.matchOddId
                                    )
                                      ? "#12351f"
                                      : undefined,
                                  }}
                                  type="button"
                                >
                                  <span className="fs-seven d-block mb-2 text-nowrap">
                                    {getSelectionDisplayName(
                                      selection,
                                      market,
                                      fixture
                                    )}
                                  </span>
                                  <span className="fw-bold d-block text-nowrap">
                                    {formatOdd(selection.odd)}
                                    {oddMovements[selection.matchOddId] &&
                                      oddMovements[selection.matchOddId] !==
                                        "same" && (
                                        <span className="ms-1">
                                          {movementLabel(
                                            oddMovements[selection.matchOddId]
                                          )}
                                        </span>
                                      )}
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
