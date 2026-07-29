import type {
  ActiveLeagueViewModel,
  ActiveMatchViewModel,
  ActiveMarketGroupViewModel,
  ActiveOddViewModel,
  ActiveSportViewModel,
} from "@/src/types/activeMatchesViewModels";
import type { PrematchSportId } from "@/src/domain/sports";

const HEADLINE_1X2_ORDER = new Map([
  ["1", 0],
  ["X", 1],
  ["2", 2],
]);

const marketKey = (betCategory: string, line: string | null): string =>
  `${betCategory}|${line ?? ""}`;

export const groupMatchesByLeague = (
  matches: ActiveMatchViewModel[]
): Record<string, ActiveMatchViewModel[]> => {
  const groups: Record<string, ActiveMatchViewModel[]> = {};

  matches.forEach((match) => {
    const leagueMatches = groups[match.league] ?? [];
    leagueMatches.push(match);
    groups[match.league] = leagueMatches;
  });

  return groups;
};

export const getUniqueLeagues = (matches: ActiveMatchViewModel[]): string[] =>
  Array.from(new Set(matches.map((match) => match.league)));

export const getLeagueBrowser = (
  matches: ActiveMatchViewModel[],
  sportId?: PrematchSportId
): ActiveLeagueViewModel[] =>
  Object.entries(
    groupMatchesByLeague(
      sportId ? matches.filter((match) => match.sportId === sportId) : matches
    )
  )
    .map(([league, fixtures]) => ({
      id: fixtures[0]?.leagueId ?? league,
      name: league,
      sportId: fixtures[0]?.sportId ?? "football",
      sportName: fixtures[0]?.sportName ?? "Football",
      fixtureCount: fixtures.length,
      fixtures,
    }))
    .sort((left, right) => left.name.localeCompare(right.name));

export const getSportBrowser = (
  matches: ActiveMatchViewModel[]
): ActiveSportViewModel[] => {
  const sportIds = Array.from(new Set(matches.map((match) => match.sportId)));

  return sportIds.map((sportId) => {
    const sportMatches = matches.filter((match) => match.sportId === sportId);
    const first = sportMatches[0];

    return {
      id: sportId,
      name: first?.sportName ?? sportId,
      leagues: getLeagueBrowser(matches, sportId),
      fixtureCount: sportMatches.length,
    };
  });
};

export const filterUpcomingMatches = (
  matches: ActiveMatchViewModel[]
): ActiveMatchViewModel[] => {
  const now = Date.now();

  return matches.filter((match) => {
    if (match.status === "finished") return false;
    if (!match.startDate) return true;
    return match.startDate.getTime() >= now;
  });
};

export const searchMatches = (
  matches: ActiveMatchViewModel[],
  query: string
): ActiveMatchViewModel[] => {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return matches;

  return matches.filter((match) =>
    [
      match.league,
      match.homeTeamName,
      match.awayTeamName,
      match.matchNo,
      match.originalMatchId,
    ]
      .filter(Boolean)
      .some((value) => value!.toLowerCase().includes(normalizedQuery))
  );
};

export const getHeadlineOdds = (
  match: ActiveMatchViewModel
): ActiveOddViewModel[] =>
  match.odds
    .filter(
      (odd) =>
        odd.betCategory.toLowerCase() === "1x2" &&
        odd.line === null &&
        HEADLINE_1X2_ORDER.has(odd.betOption.toUpperCase())
    )
    .slice()
    .sort(
      (left, right) =>
        (HEADLINE_1X2_ORDER.get(left.betOption.toUpperCase()) ?? 99) -
        (HEADLINE_1X2_ORDER.get(right.betOption.toUpperCase()) ?? 99)
    );

export const findMatchByOriginalMatchId = (
  matches: ActiveMatchViewModel[],
  originalMatchId: string
): ActiveMatchViewModel | undefined =>
  matches.find((match) => match.originalMatchId === originalMatchId);

export const getMarketsForMatch = (
  match: ActiveMatchViewModel
): ActiveMarketGroupViewModel[] => {
  if (match.markets.length > 0) {
    return match.markets.map((market) => ({
      key: market.key,
      betCategory: market.betCategory,
      line: market.line,
      odds: market.selections,
    }));
  }

  const groups = new Map<string, ActiveMarketGroupViewModel>();

  match.odds.forEach((odd) => {
    const key = marketKey(odd.betCategory, odd.line);
    const existing = groups.get(key);

    if (existing) {
      existing.odds.push(odd);
      return;
    }

    groups.set(key, {
      key,
      betCategory: odd.betCategory,
      line: odd.line,
      odds: [odd],
    });
  });

  return Array.from(groups.values());
};
