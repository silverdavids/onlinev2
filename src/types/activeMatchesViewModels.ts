import type {
  PrematchFixture,
  PrematchLeague,
  PrematchMarket,
  PrematchSelection,
  PrematchSport,
} from "@/src/domain/prematch";

export type ActiveOddViewModel = PrematchSelection;
export type ActiveMarketGroupViewModel = {
  key: string;
  betCategory: string;
  line: string | null;
  odds: ActiveOddViewModel[];
};
export type ActiveMatchViewModel = PrematchFixture;
export type ActiveLeagueViewModel = PrematchLeague;
export type ActiveSportViewModel = PrematchSport;

export type ActiveMatchesAdaptationResult = {
  matches: ActiveMatchViewModel[];
  receivedRecordCount: number;
  malformedRecordCount: number;
  droppedOddCount: number;
  partialRecordCount: number;
};
