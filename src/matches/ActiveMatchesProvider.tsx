"use client";

import React, { createContext, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { activeMatchesApi } from "@/src/api/activeMatchesApi";
import { normalizeApiError } from "@/src/api/apiError";
import { getMatchesApiBaseUrl, matchesApiConfig } from "@/src/config/env";
import {
  getSportBrowser,
  getUniqueLeagues,
} from "@/src/matches/activeMatchesSelectors";
import type {
  ActiveMatchesContextValue,
  OddMovement,
} from "@/src/matches/activeMatchesTypes";
import type { ActiveMatchViewModel } from "@/src/types/activeMatchesViewModels";

const MIN_REFRESH_INTERVAL_MS = 60 * 1000;
const REFRESH_INTERVAL_MS = Math.max(
  matchesApiConfig.refreshIntervalMs,
  MIN_REFRESH_INTERVAL_MS
);

type RefreshOptions = {
  force?: boolean;
  background?: boolean;
};

export const ActiveMatchesContext = createContext<
  ActiveMatchesContextValue | undefined
>(undefined);

const isAbortError = (error: unknown): boolean =>
  error instanceof Error &&
  (error.name === "AbortError" ||
    error.name === "CanceledError" ||
    error.message === "canceled");

const isDocumentHidden = (): boolean =>
  typeof document !== "undefined" && document.visibilityState === "hidden";

const buildOddsSnapshot = (
  nextMatches: ActiveMatchViewModel[]
): Map<string, number> => {
  const snapshot = new Map<string, number>();

  nextMatches.forEach((match) => {
    match.odds.forEach((selection) => {
      snapshot.set(selection.matchOddId, selection.odd);
    });
  });

  return snapshot;
};

const getOddMovements = (
  previous: Map<string, number>,
  next: Map<string, number>
): { movements: Record<string, OddMovement>; changedCount: number } => {
  const movements: Record<string, OddMovement> = {};
  let changedCount = 0;

  next.forEach((nextOdd, matchOddId) => {
    const previousOdd = previous.get(matchOddId);
    if (previousOdd === undefined || previousOdd === nextOdd) return;

    const movement = nextOdd > previousOdd ? "up" : "down";
    movements[matchOddId] = movement;
    changedCount += 1;
  });

  return { movements, changedCount };
};

export const ActiveMatchesProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [matches, setMatches] = useState<ActiveMatchViewModel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receivedRecordCount, setReceivedRecordCount] = useState(0);
  const [malformedRecordCount, setMalformedRecordCount] = useState(0);
  const [droppedOddCount, setDroppedOddCount] = useState(0);
  const [partialRecordCount, setPartialRecordCount] = useState(0);
  const [oddMovements, setOddMovements] = useState<Record<string, OddMovement>>({});
  const [changedOddCount, setChangedOddCount] = useState(0);
  const [lastFetchedAt, setLastFetchedAt] = useState<Date | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const inFlightRef = useRef<Promise<ActiveMatchViewModel[]> | null>(null);
  const lastAttemptAtRef = useRef<number>(0);
  const lastFetchedAtRef = useRef<number | null>(null);
  const hasDataRef = useRef(false);
  const matchesRef = useRef<ActiveMatchViewModel[]>([]);
  const oddsSnapshotRef = useRef<Map<string, number>>(new Map());

  const runRefresh = useCallback(
    async ({ force = false, background = false }: RefreshOptions = {}) => {
      if (!force && isDocumentHidden()) {
        return matchesRef.current;
      }

      if (inFlightRef.current && abortControllerRef.current?.signal.aborted) {
        inFlightRef.current = null;
        abortControllerRef.current = null;
      }

      if (inFlightRef.current) {
        return inFlightRef.current;
      }

      const now = Date.now();
      if (
        !force &&
        lastAttemptAtRef.current > 0 &&
        now - lastAttemptAtRef.current < MIN_REFRESH_INTERVAL_MS
      ) {
        return matchesRef.current;
      }

      lastAttemptAtRef.current = now;
      const controller = new AbortController();
      abortControllerRef.current = controller;
      const shouldShowInitialLoading = !background && !hasDataRef.current;

      if (shouldShowInitialLoading) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }
      setError(null);

      const request = activeMatchesApi
        .getActiveMatchesResult(controller.signal)
        .then((result) => {
          const fetchedAt = new Date();
          const nextMatches = result.matches;
          const nextOddsSnapshot = buildOddsSnapshot(nextMatches);
          const movementResult = getOddMovements(
            oddsSnapshotRef.current,
            nextOddsSnapshot
          );
          setMatches(nextMatches);
          matchesRef.current = nextMatches;
          oddsSnapshotRef.current = nextOddsSnapshot;
          hasDataRef.current = nextMatches.length > 0;
          setLoaded(true);
          setLastFetchedAt(fetchedAt);
          lastFetchedAtRef.current = fetchedAt.getTime();
          setReceivedRecordCount(result.receivedRecordCount);
          setMalformedRecordCount(result.malformedRecordCount);
          setDroppedOddCount(result.droppedOddCount);
          setPartialRecordCount(result.partialRecordCount);
          setOddMovements(movementResult.movements);
          setChangedOddCount(movementResult.changedCount);
          if (process.env.NODE_ENV === "development") {
            const first = nextMatches[0];
            const selectionCount = nextMatches.reduce(
              (total, match) => total + match.odds.length,
              0
            );
            const marketCount = nextMatches.reduce(
              (total, match) => total + match.markets.length,
              0
            );
            console.debug("[ActiveMatches]", {
              source: getMatchesApiBaseUrl(),
              Fixtures: nextMatches.length,
              Markets: marketCount,
              Selections: selectionCount,
              Refresh: "OK",
              ChangedOdds: movementResult.changedCount,
              received: result.receivedRecordCount,
              sport: first?.sportId ?? "none",
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
          }
          setError(null);
          return nextMatches;
        })
        .catch((refreshError: unknown) => {
          if (isAbortError(refreshError)) {
            return matchesRef.current;
          }

          const apiError = normalizeApiError(refreshError);
          setError(apiError.message);
          throw apiError;
        })
        .finally(() => {
          if (abortControllerRef.current === controller) {
            abortControllerRef.current = null;
          }
          inFlightRef.current = null;
          setIsLoading(false);
          setIsRefreshing(false);
        });

      inFlightRef.current = request;
      return request;
    },
    []
  );

  const refresh = useCallback(
    () => runRefresh({ force: true, background: hasDataRef.current }),
    [runRefresh]
  );

  useEffect(() => {
    void runRefresh({ force: true }).catch(() => undefined);

    const intervalId = window.setInterval(() => {
      if (isDocumentHidden()) return;
      void runRefresh({ background: true }).catch(() => undefined);
    }, REFRESH_INTERVAL_MS);

    const handleVisibilityChange = () => {
      if (isDocumentHidden()) return;

      const lastFetched = lastFetchedAtRef.current;
      if (!lastFetched || Date.now() - lastFetched >= REFRESH_INTERVAL_MS) {
        void runRefresh({ background: true }).catch(() => undefined);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      abortControllerRef.current?.abort();
    };
  }, [runRefresh]);

  const leagues = useMemo(() => getUniqueLeagues(matches), [matches]);
  const sports = useMemo(() => getSportBrowser(matches), [matches]);
  const oddsCount = useMemo(
    () => matches.reduce((total, match) => total + match.odds.length, 0),
    [matches]
  );

  const value = useMemo<ActiveMatchesContextValue>(
    () => ({
      matches,
      isLoading,
      isRefreshing,
      loaded,
      error,
      receivedRecordCount,
      malformedRecordCount,
      droppedOddCount,
      partialRecordCount,
      oddMovements,
      changedOddCount,
      lastFetchedAt,
      refresh,
      leagues,
      sports,
      matchCount: matches.length,
      oddsCount,
    }),
    [
      changedOddCount,
      droppedOddCount,
      error,
      isLoading,
      isRefreshing,
      lastFetchedAt,
      leagues,
      loaded,
      malformedRecordCount,
      matches,
      oddsCount,
      oddMovements,
      partialRecordCount,
      receivedRecordCount,
      refresh,
      sports,
    ]
  );

  return (
    <ActiveMatchesContext.Provider value={value}>
      {children}
    </ActiveMatchesContext.Provider>
  );
};
