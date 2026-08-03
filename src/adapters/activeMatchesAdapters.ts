import { ApiError } from "@/src/api/apiError";
import {
  ACTIVE_FEED_SPORT_ID,
  ACTIVE_FEED_SPORT_NAME,
} from "@/src/domain/sports";
import type { ActiveMatchDto, ActiveOddDto } from "@/src/types/activeMatchesDtos";
import type {
  ActiveMatchesAdaptationResult,
  ActiveMatchViewModel,
  ActiveMarketGroupViewModel,
  ActiveOddViewModel,
} from "@/src/types/activeMatchesViewModels";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const toTrimmedString = (value: unknown): string | null => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return null;
};

const toNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;

  const parsed = Number(value.trim());
  return Number.isFinite(parsed) ? parsed : null;
};

const toNullableString = (value: unknown): string | null =>
  value === null || value === undefined ? null : toTrimmedString(value);

export const normalizeActiveIdentifier = (value: unknown): string | null =>
  toNullableString(value);

export const parseActiveMatchDate = (
  value: unknown
): { raw: string; date: Date | null; display: string } | null => {
  const raw = toTrimmedString(value);
  if (!raw) return null;

  const timestamp = Date.parse(raw);
  if (!Number.isFinite(timestamp)) {
    return { raw, date: null, display: raw };
  }

  const date = new Date(timestamp);
  return {
    raw,
    date,
    display: new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date),
  };
};

export const mapActiveMatchStatus = (
  status: unknown
): ActiveMatchViewModel["status"] => {
  const normalized = toTrimmedString(status)?.toLowerCase();
  if (!normalized) return "unknown";

  if (["0", "notstarted", "not started", "scheduled", "prematch"].includes(normalized)) {
    return "scheduled";
  }

  if (["1", "live", "inplay", "in play", "started"].includes(normalized)) {
    return "live";
  }

  if (["2", "finished", "ended", "closed", "complete"].includes(normalized)) {
    return "finished";
  }

  return "unknown";
};

export const adaptActiveSelectionDto = (
  odd: ActiveOddDto,
  originalMatchId: string
): ActiveOddViewModel | null => {
  if (!isRecord(odd)) return null;

  const betCategory = toTrimmedString(odd.BetCategory);
  const betOption = toTrimmedString(odd.BetOption);
  const marketId = normalizeActiveIdentifier(odd.MarketId);
  const matchOddId = normalizeActiveIdentifier(odd.MatchOddId);
  const oddId = normalizeActiveIdentifier(odd.OddId);
  const selectionId = normalizeActiveIdentifier(odd.SelectionId);
  const oddValue = toNumber(odd.Odd);

  if (!betCategory || !betOption || !matchOddId || oddValue === null) return null;

  const bookmakerId = normalizeActiveIdentifier(odd.BookMakerId);
  const line = toNullableString(odd.Line);

  return {
    betCategory,
    betOption,
    line,
    bookmakerId,
    lastUpdateTime: toNullableString(odd.LastUpdateTime),
    marketId,
    matchOddId,
    oddId,
    selectionId,
    odd: oddValue,
    row: toNumber(odd.row),
    selectionKey: matchOddId,
  };
};

export const adaptActiveMarketDto = (
  odds: unknown,
  originalMatchId: string
): { selections: ActiveOddViewModel[]; droppedOddCount: number } => {
  if (!Array.isArray(odds)) {
    return { selections: [], droppedOddCount: 0 };
  }

  const selections = odds
    .map((odd) => adaptActiveSelectionDto(odd, originalMatchId))
    .filter((odd): odd is ActiveOddViewModel => odd !== null);

  return {
    selections,
    droppedOddCount: odds.length - selections.length,
  };
};

const marketKey = (betCategory: string, line: string | null): string =>
  `${betCategory}|${line ?? ""}`;

export const groupActiveSelectionsIntoMarkets = (
  selections: ActiveOddViewModel[]
): ActiveMarketGroupViewModel[] => {
  const groups = new Map<string, ActiveMarketGroupViewModel>();

  selections.forEach((selection) => {
    const key = marketKey(selection.betCategory, selection.line);
    const existing = groups.get(key);

    if (existing) {
      existing.odds.push(selection);
      return;
    }

    groups.set(key, {
      key,
      betCategory: selection.betCategory,
      line: selection.line,
      odds: [selection],
    });
  });

  return Array.from(groups.values());
};

export const adaptActiveLeagueDto = (league: unknown): string | null =>
  toTrimmedString(league);

export const adaptActiveMatchDto = (
  match: ActiveMatchDto
):
  | {
      match: ActiveMatchViewModel;
      droppedOddCount: number;
      isPartial: boolean;
    }
  | null => {
  if (!isRecord(match)) return null;

  const originalMatchId = normalizeActiveIdentifier(match.OriginalMatchId);
  const league = adaptActiveLeagueDto(match.League ?? match.Champ);
  const homeTeamName = toTrimmedString(match.HomeTeamName);
  const awayTeamName = toTrimmedString(match.AwayTeamName);
  const start = parseActiveMatchDate(match.OldDateTime ?? match.StartTime);

  if (!originalMatchId || !league || !homeTeamName || !awayTeamName || !start) {
    return null;
  }

  const { selections, droppedOddCount } = adaptActiveMarketDto(
    match.MatchOdds,
    originalMatchId
  );

  const isPartial = !Array.isArray(match.MatchOdds) || selections.length === 0;

  return {
    droppedOddCount,
    isPartial,
    match: {
      id: normalizeActiveIdentifier(match.Id),
      matchId: normalizeActiveIdentifier(match.MatchId),
      originalMatchId,
      betServiceMatchNo: normalizeActiveIdentifier(match.BetServiceMatchNo),
      matchNo: normalizeActiveIdentifier(match.MatchNo),
      shortCode: normalizeActiveIdentifier(match.ShortCode),
      leagueId: normalizeActiveIdentifier(match.LeagueId),
      setNo: normalizeActiveIdentifier(match.SetNo),
      sportId: ACTIVE_FEED_SPORT_ID,
      sportName: ACTIVE_FEED_SPORT_NAME,
      isJackpot: match.IsJackPot === true,
      league,
      startTime: start.raw,
      startDate: start.date,
      displayStartTime: start.display,
      gameStatus:
        typeof match.GameStatus === "string" || typeof match.GameStatus === "number"
          ? match.GameStatus
          : null,
      status: mapActiveMatchStatus(match.GameStatus),
      awayTeamName,
      homeTeamName,
      odds: selections,
      markets: groupActiveSelectionsIntoMarkets(selections).map((market) => ({
        key: market.key,
        betCategory: market.betCategory,
        line: market.line,
        selections: market.odds,
      })),
      hasPartialData: isPartial,
    },
  };
};

export const adaptActiveMatchesResponseWithMeta = (
  response: unknown
): ActiveMatchesAdaptationResult => {
  if (!Array.isArray(response)) {
    throw new ApiError("Active matches response was malformed", {
      code: "REQUEST_FAILED",
      raw: response,
    });
  }

  const result = response.reduce<ActiveMatchesAdaptationResult>(
    (summary, item) => {
      const adapted = adaptActiveMatchDto(item as ActiveMatchDto);

      if (!adapted) {
        summary.malformedRecordCount += 1;
        return summary;
      }

      summary.matches.push(adapted.match);
      summary.droppedOddCount += adapted.droppedOddCount;
      if (adapted.isPartial) summary.partialRecordCount += 1;
      return summary;
    },
    {
      matches: [],
      receivedRecordCount: response.length,
      malformedRecordCount: 0,
      droppedOddCount: 0,
      partialRecordCount: 0,
    }
  );

  return result;
};

export const adaptActiveMatchesResponse = (
  response: unknown
): ActiveMatchViewModel[] => adaptActiveMatchesResponseWithMeta(response).matches;
