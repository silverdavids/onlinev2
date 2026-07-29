export type ActiveOddDto = {
  BetCategory?: unknown;
  BetOption?: unknown;
  Line?: unknown;
  BookMakerId?: unknown;
  LastUpdateTime?: string | null;
  MatchOddId?: unknown;
  MarketId?: unknown;
  OddId?: unknown;
  SelectionId?: unknown;
  Odd?: unknown;
  row?: number;
};

export type ActiveMatchDto = {
  Id?: unknown;
  MatchId?: unknown;
  OriginalMatchId?: unknown;
  BetServiceMatchNo?: unknown;
  MatchNo?: unknown;
  ShortCode?: unknown;
  LeagueId?: unknown;
  League?: unknown;
  IsJackPot?: boolean | null;
  StartTime?: unknown;
  GameStatus?: unknown;
  AwayTeamName?: unknown;
  HomeTeamName?: unknown;
  MatchOdds?: unknown;
};
