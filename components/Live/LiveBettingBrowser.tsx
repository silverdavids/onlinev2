"use client";

import { useEffect, useMemo, useState } from "react";
import type { LiveMarket, LiveMatch, LiveOddOption } from "@/src/domain/live";
import { useLiveFeed } from "@/src/live/useLiveFeed";
import { usePrematchBetslip } from "@/src/betslip/usePrematchBetslip";

const MAX_MATCHES = 80;
const MAX_MARKETS_PER_MATCH = 4;
const MAX_OPTIONS_PER_MARKET = 4;
const PREFERRED_MARKETS = ["1X2", "DC", "OU", "BTS", "DNB"];

const formatOdd = (value: number): string =>
  new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

const buildLiveSelectionKey = (
  match: LiveMatch,
  market: LiveMarket,
  option: LiveOddOption
): string =>
  option.matchOddId ||
  ["live", match.matchId, market.name, option.name, market.line ?? ""].join("|");

const formatTime = (match: LiveMatch): string => {
  if (match.matchTime) return match.matchTime;
  if (match.minute > 0) return `${match.minute}'`;
  return "Live";
};

const marketLabel = (market: LiveMarket): string =>
  market.line ? `${market.name} ${market.line}` : market.name;

const sortedMarkets = (match: LiveMatch): LiveMarket[] => {
  const markets = [...match.markets].sort((left, right) => {
    const leftIndex = PREFERRED_MARKETS.indexOf(left.name.toUpperCase());
    const rightIndex = PREFERRED_MARKETS.indexOf(right.name.toUpperCase());
    const leftRank = leftIndex === -1 ? 100 : leftIndex;
    const rightRank = rightIndex === -1 ? 100 : rightIndex;
    if (leftRank !== rightRank) return leftRank - rightRank;
    return left.name.localeCompare(right.name);
  });

  return markets.slice(0, MAX_MARKETS_PER_MATCH);
};

const LiveOddButton = ({
  match,
  market,
  option,
}: {
  match: LiveMatch;
  market: LiveMarket;
  option: LiveOddOption;
}) => {
  const { isSelected, toggleLiveSelection } = usePrematchBetslip();
  const key = buildLiveSelectionKey(match, market, option);
  const blocked = match.blocked || market.blocked || option.blocked;

  return (
    <button
      className="top_matches__innercount-item prematch-preview-selection clickable-active py-2 px-3 rounded-3 n11-bg text-center border-0"
      data-live-match-id={match.matchId}
      data-live-short-code={match.shortCode || undefined}
      data-live-market={market.name}
      data-live-option={option.name}
      data-live-line={market.line ?? undefined}
      data-live-bookmaker={match.bookmakerId || undefined}
      disabled={blocked}
      onClick={() => toggleLiveSelection(match, market, option)}
      style={{
        outline: isSelected(key) ? "2px solid #35C31E" : undefined,
        backgroundColor: isSelected(key) ? "#12351f" : undefined,
        opacity: blocked ? 0.55 : undefined,
      }}
      title={blocked ? "Suspended" : `${marketLabel(market)} ${option.name}`}
      type="button"
    >
      <span className="prematch-preview-selection__label fs-seven d-block mb-2">
        {option.name}
      </span>
      <span className="prematch-preview-selection__odd fw-bold d-block text-nowrap">
        {formatOdd(option.odd)}
      </span>
    </button>
  );
};

const LiveMatchCard = ({ match }: { match: LiveMatch }) => {
  const markets = useMemo(() => sortedMarkets(match), [match]);

  return (
    <div
      className="top_matches__cmncard p2-bg p-4 rounded-3 mb-4"
      data-live-fixture-id={match.matchId}
      data-live-score={`${match.homeScore}:${match.awayScore}`}
      data-live-period={match.period}
    >
      <div className="prematch-fixture-preview">
        <div className="prematch-fixture-preview__identity">
          <div className="top_matches__clubname">
            <div className="top_matches__cmncard-right prematch-fixture-preview__meta pb-4 mb-4">
              <div className="prematch-fixture-preview__league d-flex align-items-center gap-1">
                <span className="fs-eight cpoint" title={match.league}>
                  {match.league}
                </span>
              </div>
              <div className="prematch-fixture-preview__time d-flex align-items-center gap-3">
                <span className="fs-eight cpoint">
                  {formatTime(match)} {match.eventState ?? ""}
                </span>
                {match.blocked && (
                  <span className="fs-eight text-warning">Suspended</span>
                )}
              </div>
            </div>
            <div className="top_matches__cmncard-left prematch-fixture-preview__teams">
              <div className="prematch-fixture-preview__team-list">
                <div className="prematch-fixture-preview__team d-flex align-items-center gap-2 mb-4">
                  <span
                    className="top_matches__cmncard-countcercle rounded-17 fs-seven text-center"
                    aria-label="Home score"
                  >
                    {match.homeScore}
                  </span>
                  <span className="fs-seven cpoint" title={match.homeTeam}>
                    {match.homeTeam}
                  </span>
                </div>
                <div className="prematch-fixture-preview__team d-flex align-items-center gap-2">
                  <span
                    className="top_matches__cmncard-countcercle rounded-17 fs-seven text-center"
                    aria-label="Away score"
                  >
                    {match.awayScore}
                  </span>
                  <span className="fs-seven cpoint" title={match.awayTeam}>
                    {match.awayTeam}
                  </span>
                </div>
              </div>
              <div className="prematch-fixture-preview__icons d-flex align-items-center gap-4 position-relative">
                <span className="fs-eight cpoint">#{match.shortCode || match.matchId}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="prematch-fixture-preview__markets">
          {markets.length > 0 ? (
            <div className="prematch-fixture-preview__market-list">
              {markets.map((market) => (
                <div
                  className="prematch-fixture-preview__market"
                  key={market.key}
                >
                  <div className="prematch-fixture-preview__market-title text-center">
                    <span className="fs-eight">{marketLabel(market)}</span>
                  </div>
                  <div className="top_matches__innercount prematch-fixture-preview__selection-grid">
                    {market.options
                      .slice(0, MAX_OPTIONS_PER_MARKET)
                      .map((option) => (
                        <LiveOddButton
                          key={`${market.key}-${option.name}`}
                          match={match}
                          market={market}
                          option={option}
                        />
                      ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="prematch-fixture-preview__empty p3-bg rounded-3">
              <span className="fs-eight cpoint">No markets available</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default function LiveBettingBrowser() {
  const { matches, isConnecting, error, lastUpdatedAt, refresh } = useLiveFeed();
  const { syncLiveSelections } = usePrematchBetslip();
  const [search, setSearch] = useState("");

  useEffect(() => {
    syncLiveSelections(matches);
  }, [matches, syncLiveSelections]);

  const filteredMatches = useMemo(() => {
    const query = search.trim().toLowerCase();
    return matches
      .filter((match) => {
        if (!query) return true;
        return `${match.league} ${match.homeTeam} ${match.awayTeam}`
          .toLowerCase()
          .includes(query);
      })
      .slice(0, MAX_MATCHES);
  }, [matches, search]);

  return (
    <section className="top_matches">
      <div className="container-fluid">
        <div className="row">
          <div className="col-12 gx-0 gx-lg-4">
            <div className="top_matches__main">
              <div className="row w-100">
                <div className="col-12">
                  <div className="top_matches__title d-flex align-items-center justify-content-between gap-3 mb-4">
                    <div className="d-flex align-items-center gap-2">
                      <h3>Live Betting</h3>
                      <span className="fs-eight cpoint">
                        {filteredMatches.length} live
                      </span>
                    </div>
                    <button
                      className="cmn-btn px-4 py-2"
                      disabled={isConnecting}
                      onClick={refresh}
                      type="button"
                    >
                      {isConnecting ? "Connecting..." : "Refresh"}
                    </button>
                  </div>

                  <div className="mb-4">
                    <input
                      aria-label="Search live matches"
                      className="p2-bg rounded-3 py-2 px-3 border-0 n4-color w-100"
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search live matches"
                      type="search"
                      value={search}
                    />
                  </div>

                  {error && (
                    <div className="top_matches__cmncard p2-bg p-4 rounded-3 mb-4">
                      <span className="fs-seven">{error}</span>
                    </div>
                  )}

                  {!error && isConnecting && matches.length === 0 && (
                    <div className="top_matches__cmncard p2-bg p-4 rounded-3 mb-4">
                      <span className="fs-seven">Loading live matches...</span>
                    </div>
                  )}

                  {!error && !isConnecting && filteredMatches.length === 0 && (
                    <div className="top_matches__cmncard p2-bg p-4 rounded-3 mb-4">
                      <span className="fs-seven">No live matches available.</span>
                    </div>
                  )}

                  <div className="top_matches__content">
                    {filteredMatches.map((match) => (
                      <LiveMatchCard key={match.matchId} match={match} />
                    ))}
                  </div>

                  {lastUpdatedAt && (
                    <span className="fs-nine cpoint d-block mt-3">
                      Updated {new Date(lastUpdatedAt).toLocaleTimeString()}
                    </span>
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
