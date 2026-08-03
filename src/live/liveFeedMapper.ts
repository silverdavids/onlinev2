import type { LiveMarket, LiveMatch, LiveOddOption } from "@/src/domain/live";

const toNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const toStringOrNull = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  const next = String(value).trim();
  return next ? next : null;
};

const getNested = (value: unknown, key: string): unknown => {
  if (!value || typeof value !== "object") return undefined;
  return (value as Record<string, unknown>)[key];
};

const parseMatchTimeSeconds = (rawSeconds: unknown, rawTime: unknown): number => {
  const seconds = toNumber(rawSeconds);
  if (seconds !== null && seconds > 0) return seconds;

  if (typeof rawTime !== "string") return 0;
  const [minutesPart, secondsPart] = rawTime.split(":");
  const minutes = Number(minutesPart);
  const parsedSeconds = Number(secondsPart);
  if (!Number.isFinite(minutes)) return 0;
  return minutes * 60 + (Number.isFinite(parsedSeconds) ? parsedSeconds : 0);
};

const timestampToIso = (value: unknown): string => {
  const seconds =
    toNumber(value) ??
    toNumber(getNested(value, "seconds")) ??
    toNumber(getNested(value, "Seconds"));
  if (seconds === null) return "";
  return new Date(seconds * 1000).toISOString().slice(0, 19);
};

const getScorePair = (scores: unknown): [number, number] => {
  const goal = getNested(scores, "goal") ?? getNested(scores, "GOAL");
  if (Array.isArray(goal)) {
    return [toNumber(goal[0]) ?? 0, toNumber(goal[1]) ?? 0];
  }
  return [0, 0];
};

const marketLine = (market: Record<string, unknown>): string | null => {
  const line = market.l ?? market.h;
  const numberValue = toNumber(line);
  if (numberValue !== null) return String(numberValue);
  return toStringOrNull(line);
};

const optionId = (option: Record<string, unknown>): number | null =>
  toNumber(
    option.OptionId ??
      option.optionId ??
      option.BetOptionId ??
      option.betOptionId ??
      option.id ??
      option.i
  );

const matchOddId = (option: Record<string, unknown>): string | null =>
  toStringOrNull(
    option.MatchOddId ??
      option.matchOddId ??
      option.MatchOddID ??
      option.matchOddID ??
      option.match_odd_id ??
      option.oid
  );

const mapOption = (option: unknown): LiveOddOption | null => {
  if (!option || typeof option !== "object") return null;
  const raw = option as Record<string, unknown>;
  const name = toStringOrNull(raw.n ?? raw.name);
  const odd = toNumber(raw.Odd ?? raw.odd ?? raw.v);
  if (!name || odd === null || odd <= 0) return null;

  return {
    name,
    odd,
    previousOdd: toNumber(raw.lv) ?? toNumber(raw.previousOdd),
    blocked: (toNumber(raw.b) ?? 0) !== 0,
    matchOddId: matchOddId(raw),
    optionId: optionId(raw),
  };
};

const mapMarket = (market: unknown): LiveMarket | null => {
  if (!market || typeof market !== "object") return null;
  const raw = market as Record<string, unknown>;
  const name = toStringOrNull(raw.n ?? raw.name);
  if (!name) return null;

  const line = marketLine(raw);
  const options = (Array.isArray(raw.o) ? raw.o : [])
    .map(mapOption)
    .filter((option): option is LiveOddOption => option !== null);
  if (options.length === 0) return null;

  return {
    key: `${name}|${line ?? ""}`,
    name,
    line,
    blocked: (toNumber(raw.b) ?? 0) !== 0,
    options,
  };
};

export const mapLiveFeedGame = (game: unknown): LiveMatch | null => {
  if (!game || typeof game !== "object") return null;
  const raw = game as Record<string, unknown>;
  const matchId = toStringOrNull(raw.std ?? raw.id);
  if (!matchId) return null;

  const [homeScore, awayScore] = getScorePair(raw.sc ?? raw.scores);
  const matchTimeSeconds = parseMatchTimeSeconds(raw.tm ?? raw.seconds, raw.tss);
  const markets = (Array.isArray(raw.bt) ? raw.bt : Array.isArray(raw.odds) ? raw.odds : [])
    .map(mapMarket)
    .filter((market): market is LiveMarket => market !== null);

  return {
    matchId,
    shortCode: toNumber(raw.cd ?? raw.shortCode) ?? 0,
    bookmakerId: toNumber(raw.bm ?? raw.bookMakerId) ?? 0,
    league: toStringOrNull(raw.inf ?? raw.league) ?? "Live",
    homeTeam: toStringOrNull(getNested(raw.t1, "n") ?? raw.homeTeam) ?? "Home",
    awayTeam: toStringOrNull(getNested(raw.t2, "n") ?? raw.awayTeam) ?? "Away",
    startTime: timestampToIso(raw.d ?? raw.startTime),
    period: toNumber(raw.p ?? raw.period) ?? 0,
    eventState: toStringOrNull(raw.stn ?? raw.eventState),
    eventStateId: toStringOrNull(raw.st ?? raw.eventStateId),
    matchTime: toStringOrNull(raw.tss ?? raw.matchTime),
    matchTimeSeconds,
    minute: Math.floor(matchTimeSeconds / 60),
    homeScore,
    awayScore,
    blocked: (toNumber(raw.b ?? raw.blocked) ?? 0) !== 0,
    markets,
  };
};

export const mergeLiveMatches = (
  previous: LiveMatch[],
  incoming: LiveMatch[]
): LiveMatch[] => {
  const byId = new Map(previous.map((match) => [match.matchId, match]));

  incoming.forEach((match) => {
    const existing = byId.get(match.matchId);
    if (!existing) {
      byId.set(match.matchId, match);
      return;
    }

    byId.set(match.matchId, {
      ...existing,
      ...match,
      shortCode: match.shortCode || existing.shortCode,
      bookmakerId: match.bookmakerId || existing.bookmakerId,
      league: match.league === "Live" ? existing.league : match.league,
      homeTeam: match.homeTeam === "Home" ? existing.homeTeam : match.homeTeam,
      awayTeam: match.awayTeam === "Away" ? existing.awayTeam : match.awayTeam,
      startTime: match.startTime || existing.startTime,
      markets: match.markets.length > 0 ? match.markets : existing.markets,
    });
  });

  return Array.from(byId.values()).sort((left, right) => {
    if (left.league !== right.league) return left.league.localeCompare(right.league);
    return left.shortCode - right.shortCode;
  });
};
