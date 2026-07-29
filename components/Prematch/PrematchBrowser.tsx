"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  filterUpcomingMatches,
  groupMatchesByLeague,
  searchMatches,
} from "@/src/matches/activeMatchesSelectors";
import { useActiveMatches } from "@/src/matches/useActiveMatches";
import type {
  ActiveMatchViewModel,
  ActiveOddViewModel,
} from "@/src/types/activeMatchesViewModels";
import { getMatchesApiBaseUrl } from "@/src/config/env";
import {
  getPrematchSport,
  type PrematchSportId,
} from "@/src/domain/sports";
import {
  getMarketDisplayName,
  getSelectionDisplayName,
  sortMarketsForDisplay,
} from "@/src/domain/prematchMarkets";
import { usePrematchBetslip } from "@/src/betslip/usePrematchBetslip";
import type { PrematchMarket } from "@/src/domain/prematch";
import type { OddMovement } from "@/src/matches/activeMatchesTypes";

const ALL_LEAGUES = "all";
const MAX_VISIBLE_MATCHES = 80;
const PREVIEW_SELECTION_LIMIT = 3;
const PREVIEW_MARKET_CATEGORIES = ["1X2", "DC"];

type PrematchBrowserProps = {
  title?: string;
  sportId?: PrematchSportId;
  compact?: boolean;
};

const formatOdd = (value: number): string => String(value);

const getFixtureHref = (match: ActiveMatchViewModel): string => {
  const params = new URLSearchParams({
    MatchNo: match.matchNo ?? "",
    League: match.league,
    HomeTeam: match.homeTeamName,
    AwayTeam: match.awayTeamName,
  });

  return `/fixture/${encodeURIComponent(match.originalMatchId)}?${params.toString()}`;
};

const movementLabel = (movement?: OddMovement): string => {
  if (movement === "up") return "▲";
  if (movement === "down") return "▼";
  return "";
};

const normalizeMarketCategory = (category: string): string =>
  category.trim().toUpperCase();

const baseMarketCategory = (category: string): string =>
  normalizeMarketCategory(category).replace(/_H[12]$/, "");

const isPreferredPreviewMarket = (market: PrematchMarket): boolean =>
  PREVIEW_MARKET_CATEGORIES.includes(normalizeMarketCategory(market.betCategory));

const getPreviewSelectionLabel = (
  selection: ActiveOddViewModel,
  market: PrematchMarket
): string => {
  const option = selection.betOption.trim().toUpperCase();
  const category = baseMarketCategory(market.betCategory);

  if (category === "1X2") {
    if (option === "1" || option === "HOME") return "1";
    if (option === "X" || option === "DRAW") return "X";
    if (option === "2" || option === "AWAY") return "2";
  }

  if (category === "DC") {
    if (option === "1X") return "1X";
    if (option === "12") return "12";
    if (option === "X2") return "X2";
  }

  return selection.betOption;
};

const previewSelectionOrder = (
  selection: ActiveOddViewModel,
  market: PrematchMarket
): number => {
  const label = getPreviewSelectionLabel(selection, market);

  if (label === "1" || label === "1X") return 1;
  if (label === "X" || label === "12") return 2;
  if (label === "2" || label === "X2") return 3;

  return 100;
};

const SelectionCell = ({
  odd,
  label,
  isSelected,
  movement,
  onSelect,
}: {
  odd?: ActiveOddViewModel;
  label?: string;
  isSelected: boolean;
  movement?: OddMovement;
  onSelect: () => void;
}) => (
  <button
    className="top_matches__innercount-item prematch-preview-selection clickable-active py-2 px-3 rounded-3 n11-bg text-center border-0"
    onClick={onSelect}
    disabled={!odd}
    title={label}
    type="button"
    style={{
      outline: isSelected ? "2px solid #35C31E" : undefined,
      backgroundColor: isSelected ? "#12351f" : undefined,
    }}
  >
    <span className="prematch-preview-selection__label fs-seven d-block mb-2">
      {label ?? "-"}
    </span>
    <span className="prematch-preview-selection__odd fw-bold d-block text-nowrap">
      {odd ? formatOdd(odd.odd) : "-"}
      {movement && movement !== "same" && (
        <span className="ms-1">{movementLabel(movement)}</span>
      )}
    </span>
  </button>
);

const selectionUpdatedAt = (selection: ActiveOddViewModel): number => {
  if (!selection.lastUpdateTime) return 0;

  const timestamp = Date.parse(selection.lastUpdateTime);
  return Number.isFinite(timestamp) ? timestamp : 0;
};

const getPreviewSelectionKey = (
  match: ActiveMatchViewModel,
  market: PrematchMarket,
  selection: ActiveOddViewModel
): string =>
  [
    match.matchId ?? match.originalMatchId,
    market.betCategory.trim().toUpperCase(),
    selection.betOption.trim().toUpperCase(),
    market.line ?? selection.line ?? "",
  ].join("|");

const dedupePreviewSelections = (
  match: ActiveMatchViewModel,
  market: PrematchMarket
): ActiveOddViewModel[] => {
  const selections = new Map<string, ActiveOddViewModel>();

  market.selections.forEach((selection) => {
    const key = getPreviewSelectionKey(match, market, selection);
    const existing = selections.get(key);

    if (!existing || selectionUpdatedAt(selection) > selectionUpdatedAt(existing)) {
      selections.set(key, selection);
    }
  });

  return Array.from(selections.values());
};

const getFixturePreviewMarkets = (
  match: ActiveMatchViewModel
): PrematchMarket[] => {
  const orderedMarkets = sortMarketsForDisplay(match.markets);
  const preferredMarkets = orderedMarkets
    .filter(isPreferredPreviewMarket)
    .map((market) => ({
      ...market,
      selections: dedupePreviewSelections(match, market)
        .sort(
          (left, right) =>
            previewSelectionOrder(left, market) -
            previewSelectionOrder(right, market)
        )
        .slice(0, PREVIEW_SELECTION_LIMIT),
    }))
    .filter((market) => market.selections.length > 0);

  if (preferredMarkets.length > 0) {
    return preferredMarkets;
  }

  for (const market of orderedMarkets) {
    const selections = dedupePreviewSelections(match, market).slice(
      0,
      PREVIEW_SELECTION_LIMIT
    );

    if (selections.length > 0) {
      return [{
        ...market,
        selections,
      }];
    }
  }

  return [];
};

export const PrematchFixtureCard = ({
  match,
}: {
  match: ActiveMatchViewModel;
}) => {
  const { isSelected, toggleSelection } = usePrematchBetslip();
  const { oddMovements } = useActiveMatches();
  const previewMarkets = useMemo(
    () => getFixturePreviewMarkets(match),
    [match]
  );

  return (
    <div
      data-fixture-id={match.originalMatchId}
      data-match-no={match.matchNo ?? undefined}
      data-bet-service-match-no={match.betServiceMatchNo ?? undefined}
    >
      <div className="top_matches__cmncard p2-bg p-4 rounded-3 mb-4">
        <div className="prematch-fixture-preview">
          <div className="prematch-fixture-preview__identity">
            <div className="top_matches__clubname">
              <div className="top_matches__cmncard-right prematch-fixture-preview__meta pb-4 mb-4">
                <div className="prematch-fixture-preview__league d-flex align-items-center gap-1">
                  <Image
                    src="/images/icon/soccer-icon.png"
                    width={16}
                    height={16}
                    alt="Icon"
                  />{" "}
                  <span className="fs-eight cpoint" title={match.league}>
                    {match.league}
                  </span>
                </div>
                <div className="prematch-fixture-preview__time d-flex align-items-center gap-3">
                  <span className="fs-eight cpoint">{match.displayStartTime}</span>
                  <div className="prematch-fixture-preview__status-icons d-flex align-items-center gap-1">
                    <Image
                      src="/images/icon/updwon.png"
                      width={16}
                      height={16}
                      alt="Odds movement"
                    />
                    <Image
                      src="/images/icon/t-shart.png"
                      width={16}
                      height={16}
                      alt="Lineups"
                    />
                  </div>
                  {match.hasPartialData && (
                    <span className="fs-eight cpoint">Partial</span>
                  )}
                </div>
              </div>
              <div className="top_matches__cmncard-left prematch-fixture-preview__teams">
                <div className="prematch-fixture-preview__team-list">
                  <div className="prematch-fixture-preview__team d-flex align-items-center gap-2 mb-4">
                    <Image
                      src="/images/icon/cmn-footbal.png"
                      width={24}
                      height={24}
                      alt="Icon"
                    />{" "}
                    <span className="fs-seven cpoint" title={match.homeTeamName}>
                      {match.homeTeamName}
                    </span>
                  </div>
                  <div className="prematch-fixture-preview__team d-flex align-items-center gap-2">
                    <Image
                      src="/images/icon/cmn-footbal.png"
                      width={24}
                      height={24}
                      alt="Icon"
                    />{" "}
                    <span className="fs-seven cpoint" title={match.awayTeamName}>
                      {match.awayTeamName}
                    </span>
                  </div>
                </div>
                <div className="prematch-fixture-preview__icons d-flex align-items-center gap-4 position-relative">
                  <span className="v-line lg d-none d-xl-block"></span>
                  <div className="d-flex flex-column gap-5">
                    <Image
                      className="cpoint"
                      src="/images/icon/line-chart.png"
                      width={16}
                      height={16}
                      alt="Icon"
                    />
                    <Image
                      className="cpoint"
                      src="/images/icon/star2.png"
                      width={16}
                      height={16}
                      alt="Icon"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="prematch-fixture-preview__markets">
            <div className="top_matches__clubdata">
              {previewMarkets.length > 0 ? (
                <div className="prematch-fixture-preview__market-list">
                  {previewMarkets.map((previewMarket) => (
                    <div
                      className="prematch-fixture-preview__market"
                      key={`${previewMarket.betCategory}-${previewMarket.line ?? ""}`}
                    >
                      <div className="prematch-fixture-preview__market-title text-center">
                        <span className="fs-eight">
                          {getMarketDisplayName(previewMarket)}
                        </span>
                      </div>
                      <div className="top_matches__innercount prematch-fixture-preview__selection-grid">
                        {previewMarket.selections.map((selection) => {
                          const label = isPreferredPreviewMarket(previewMarket)
                            ? getPreviewSelectionLabel(selection, previewMarket)
                            : getSelectionDisplayName(
                                selection,
                                previewMarket,
                                match
                              );

                          return (
                            <SelectionCell
                              key={selection.matchOddId}
                              label={label}
                              odd={selection}
                              isSelected={isSelected(selection.matchOddId)}
                              movement={oddMovements[selection.matchOddId]}
                              onSelect={() => {
                                toggleSelection(
                                  match,
                                  previewMarket,
                                  selection,
                                  getMarketDisplayName(previewMarket),
                                  label
                                );
                              }}
                            />
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="prematch-fixture-preview__empty p3-bg rounded-3">
                  <span className="fs-eight cpoint">No preview markets</span>
                </div>
              )}
              <div>
                <Link
                  href={getFixtureHref(match)}
                  className="fs-eight cpoint d-inline-block mt-3"
                >
                  View all markets
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function PrematchBrowser({
  title = "Upcoming Games",
  sportId = "football",
  compact = false,
}: PrematchBrowserProps) {
  const {
    matches,
    isLoading,
    isRefreshing,
    loaded,
    error,
    receivedRecordCount,
    malformedRecordCount,
    droppedOddCount,
    partialRecordCount,
    changedOddCount,
    refresh,
  } = useActiveMatches();
  const searchParams = useSearchParams();
  const selectedLeague = searchParams.get("league")?.trim() || ALL_LEAGUES;
  const [search, setSearch] = useState("");
  const [upcomingOnly, setUpcomingOnly] = useState(true);

  const selectedSport = useMemo(() => getPrematchSport(sportId), [sportId]);
  const sportMatches = useMemo(
    () => matches.filter((match) => match.sportId === sportId),
    [matches, sportId]
  );
  const timeFilteredMatches = useMemo(
    () => (upcomingOnly ? filterUpcomingMatches(sportMatches) : sportMatches),
    [sportMatches, upcomingOnly]
  );
  const leagueFilteredMatches = useMemo(() => {
    if (selectedLeague === ALL_LEAGUES) return timeFilteredMatches;
    return timeFilteredMatches.filter((match) => match.league === selectedLeague);
  }, [selectedLeague, timeFilteredMatches]);
  const filteredMatches = useMemo(
    () => searchMatches(leagueFilteredMatches, search).slice(0, MAX_VISIBLE_MATCHES),
    [leagueFilteredMatches, search]
  );
  const selectedLeagueLabel =
    selectedLeague === ALL_LEAGUES ? selectedSport.name : selectedLeague;
  const selectedLeagueCount = leagueFilteredMatches.length;

  const groupedMatches = useMemo(
    () => groupMatchesByLeague(filteredMatches),
    [filteredMatches]
  );

  const hasPartialPayload =
    malformedRecordCount > 0 || droppedOddCount > 0 || partialRecordCount > 0;

  useEffect(() => {
    if (process.env.NODE_ENV !== "development" || !loaded) return;

    const first = filteredMatches[0];
    console.debug("[ActiveMatches]", {
      source: getMatchesApiBaseUrl(),
      received: receivedRecordCount,
      normalized: matches.length,
      sport: sportId,
      displayed: filteredMatches.length,
      ChangedOdds: changedOddCount,
      firstFixture: first
        ? {
            League: first.league,
            HomeTeamName: first.homeTeamName,
            AwayTeamName: first.awayTeamName,
            OriginalMatchId: first.originalMatchId,
            MatchNo: first.matchNo,
          }
        : null,
    });
  }, [
    changedOddCount,
    filteredMatches,
    loaded,
    matches.length,
    receivedRecordCount,
    sportId,
  ]);

  const renderFixtures = () => {
    if (selectedLeague === ALL_LEAGUES) {
      return Object.entries(groupedMatches).map(([league, leagueMatches]) => (
        <div key={league}>
          <h5 className="mb-4 mt-2">{league}</h5>
          {leagueMatches.map((match) => (
            <PrematchFixtureCard
              key={match.originalMatchId}
              match={match}
            />
          ))}
        </div>
      ));
    }

    return filteredMatches.map((match) => (
      <PrematchFixtureCard key={match.originalMatchId} match={match} />
    ));
  };

  return (
    <section className={`top_matches ${compact ? "pb-5 pb-md-6" : ""}`}>
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
                      src="/images/icon/clock-icon.png"
                      alt="Icon"
                    />
                    <h3>{title}</h3>
                    {isRefreshing && !isLoading && (
                      <span className="fs-eight cpoint">Refreshing</span>
                    )}
                  </div>
                  <div className="top_matches__content">
                    <div className="singletab">
                      <div className="d-flex align-items-center gap-3 flex-wrap mb-4">
                        <input
                          aria-label="Search fixtures"
                          className="p3-bg rounded-3 py-2 px-4 border-0 n4-color"
                          placeholder="Search teams or leagues"
                          type="search"
                          value={search}
                          onChange={(event) => setSearch(event.target.value)}
                        />
                        <label className="d-flex align-items-center gap-2 fs-eight cpoint">
                          <input
                            checked={upcomingOnly}
                            onChange={(event) =>
                              setUpcomingOnly(event.target.checked)
                            }
                            type="checkbox"
                          />
                          Upcoming only
                        </label>
                      </div>
                      <div className="mb-4">
                        <h5 className="mb-1">{selectedLeagueLabel}</h5>
                        <span className="fs-eight cpoint d-block mb-4">
                          {selectedLeagueCount}{" "}
                          {upcomingOnly ? "upcoming fixtures" : "fixtures"}
                        </span>
                        {isLoading && (
                          <div className="top_matches__cmncard p2-bg p-4 rounded-3 mb-4">
                            <span className="fs-seven cpoint">
                              Loading upcoming games...
                            </span>
                          </div>
                        )}

                        {!isLoading && error && (
                          <div className="top_matches__cmncard p2-bg p-4 rounded-3 mb-4">
                            <p className="fs-seven mb-3">
                              Upcoming games are temporarily unavailable.
                            </p>
                            <p className="fs-eight cpoint mb-3">{error}</p>
                            <button
                              className="cmn-btn py-2 px-4"
                              type="button"
                              onClick={() =>
                                void refresh().catch(() => undefined)
                              }
                            >
                              Retry
                            </button>
                          </div>
                        )}

                        {!isLoading &&
                          !error &&
                          loaded &&
                          filteredMatches.length === 0 && (
                            <div className="top_matches__cmncard p2-bg p-4 rounded-3 mb-4">
                              <span className="fs-seven cpoint">
                                No prematch games are currently available for{" "}
                                {selectedLeagueLabel}.
                              </span>
                            </div>
                          )}

                        {!isLoading && !error && hasPartialPayload && (
                          <div className="top_matches__cmncard p2-bg p-4 rounded-3 mb-4">
                            <span className="fs-eight cpoint">
                              Some feed records were incomplete and were skipped
                              or rendered with limited market data.
                            </span>
                          </div>
                        )}

                        {!isLoading && !error && renderFixtures()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
