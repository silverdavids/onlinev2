import type { PrematchSportId } from "@/src/domain/sports";

export type PrematchSelection = {
  betCategory: string;
  betOption: string;
  line: string | null;
  bookmakerId: string | null;
  lastUpdateTime: string | null;
  marketId: string | null;
  matchOddId: string;
  oddId: string | null;
  selectionId: string | null;
  odd: number;
  row: number | null;
  selectionKey: string;
};

export type PrematchMarket = {
  key: string;
  betCategory: string;
  line: string | null;
  selections: PrematchSelection[];
};

export type PrematchFixture = {
  id: string | null;
  matchId: string | null;
  originalMatchId: string;
  betServiceMatchNo: string | null;
  matchNo: string | null;
  shortCode: string | null;
  leagueId: string | null;
  sportId: PrematchSportId;
  sportName: string;
  isJackpot: boolean;
  league: string;
  startTime: string;
  startDate: Date | null;
  displayStartTime: string;
  gameStatus: string | number | null;
  status: "scheduled" | "live" | "finished" | "unknown";
  awayTeamName: string;
  homeTeamName: string;
  odds: PrematchSelection[];
  markets: PrematchMarket[];
  hasPartialData: boolean;
};

export type PrematchLeague = {
  id: string;
  name: string;
  sportId: PrematchSportId;
  sportName: string;
  fixtureCount: number;
  fixtures: PrematchFixture[];
};

export type PrematchSport = {
  id: PrematchSportId;
  name: string;
  leagues: PrematchLeague[];
  fixtureCount: number;
};
