import type {
  ActiveMatchViewModel,
  ActiveSportViewModel,
} from "@/src/types/activeMatchesViewModels";

export type OddMovement = "up" | "down" | "same";

export type ActiveMatchesContextValue = {
  matches: ActiveMatchViewModel[];
  isLoading: boolean;
  isRefreshing: boolean;
  loaded: boolean;
  error: string | null;
  receivedRecordCount: number;
  malformedRecordCount: number;
  droppedOddCount: number;
  partialRecordCount: number;
  oddMovements: Record<string, OddMovement>;
  changedOddCount: number;
  lastFetchedAt: Date | null;
  refresh: () => Promise<ActiveMatchViewModel[]>;
  leagues: string[];
  sports: ActiveSportViewModel[];
  matchCount: number;
  oddsCount: number;
};
