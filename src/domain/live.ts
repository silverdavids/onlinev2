export type LiveOddOption = {
  name: string;
  odd: number;
  previousOdd: number | null;
  blocked: boolean;
  matchOddId: string | null;
  optionId: number | null;
};

export type LiveMarket = {
  key: string;
  name: string;
  line: string | null;
  blocked: boolean;
  options: LiveOddOption[];
};

export type LiveMatch = {
  matchId: string;
  shortCode: number;
  bookmakerId: number;
  league: string;
  homeTeam: string;
  awayTeam: string;
  startTime: string;
  period: number;
  eventState: string | null;
  eventStateId: string | null;
  matchTime: string | null;
  matchTimeSeconds: number;
  minute: number;
  homeScore: number;
  awayScore: number;
  blocked: boolean;
  markets: LiveMarket[];
};

export type LiveSelectionInput = {
  match: LiveMatch;
  market: LiveMarket;
  option: LiveOddOption;
};
