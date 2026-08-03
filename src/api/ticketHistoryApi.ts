import { apiClient, type ApiRequestConfig } from "@/src/api/apiClient";

export type TicketHistoryItemDto = {
  AmountPaid?: number;
  amountPaid?: number;
  BookingCode?: number | null;
  bookingCode?: number | null;
  IsLive?: boolean;
  isLive?: boolean;
  PaymentReference?: string | null;
  paymentReference?: string | null;
  PaymentSource?: string | null;
  paymentSource?: string | null;
  ReceiptDate?: string;
  receiptDate?: string;
  ReceiptId?: number;
  receiptId?: number;
  ReceiptStatus?: number;
  receiptStatus?: number;
  SerialCode?: string;
  serialCode?: string;
  SetSize?: number;
  setSize?: number;
  Stake?: number;
  stake?: number;
  StatusName?: string;
  statusName?: string;
  TotalOdds?: number;
  totalOdds?: number;
  WonSize?: number;
  wonSize?: number;
  PendingBetsCount?: number;
  pendingBetsCount?: number;
  WinningBetsCount?: number;
  winningBetsCount?: number;
  LostBetsCount?: number;
  lostBetsCount?: number;
  PostponedBetsCount?: number;
  postponedBetsCount?: number;
  VoidedBetsCount?: number;
  voidedBetsCount?: number;
  TotalBetsCount?: number;
  totalBetsCount?: number;
};

export type TicketSelectionDto = {
  BetId?: number;
  betId?: number;
  MatchId?: number;
  matchId?: number;
  League?: string | null;
  league?: string | null;
  HomeTeam?: string | null;
  homeTeam?: string | null;
  AwayTeam?: string | null;
  awayTeam?: string | null;
  MatchTime?: string | null;
  matchTime?: string | null;
  Market?: string | null;
  market?: string | null;
  Option?: string | null;
  option?: string | null;
  Line?: string | null;
  line?: string | null;
  Odd?: number;
  odd?: number;
  IsLive?: boolean;
  isLive?: boolean;
  Score?: string | null;
  score?: string | null;
  LiveScore?: string | null;
  liveScore?: string | null;
  LiveMinute?: number;
  liveMinute?: number;
  HomeScore?: number;
  homeScore?: number;
  AwayScore?: number;
  awayScore?: number;
  HalfTimeHomeScore?: number;
  halfTimeHomeScore?: number;
  HalfTimeAwayScore?: number;
  halfTimeAwayScore?: number;
  PeriodCode?: number | null;
  periodCode?: number | null;
  MatchStatus?: number;
  matchStatus?: number;
  SelectionStatus?: number;
  selectionStatus?: number;
};

export type TicketDetailsDto = {
  AmountPaid?: number;
  amountPaid?: number;
  BookingCode?: number | null;
  bookingCode?: number | null;
  Branch?: string | null;
  branch?: string | null;
  IsBlocked?: boolean;
  isBlocked?: boolean;
  IsLive?: boolean;
  isLive?: boolean;
  PaymentReference?: string | null;
  paymentReference?: string | null;
  PaymentSource?: string | null;
  paymentSource?: string | null;
  PossibleReturn?: number;
  possibleReturn?: number;
  Payout?: number;
  payout?: number;
  ReceiptDate?: string;
  receiptDate?: string;
  ReceiptId?: number;
  receiptId?: number;
  ReceiptStatus?: number;
  receiptStatus?: number;
  SerialCode?: string;
  serialCode?: string;
  SetNo?: number;
  setNo?: number;
  SetSize?: number;
  setSize?: number;
  Stake?: number;
  stake?: number;
  StatusName?: string;
  statusName?: string;
  TimePaid?: string | null;
  timePaid?: string | null;
  TotalOdds?: number;
  totalOdds?: number;
  WonSize?: number;
  wonSize?: number;
  Bets?: TicketSelectionDto[];
  bets?: TicketSelectionDto[];
};

export type TicketHistoryResponse = {
  items: TicketHistoryItemDto[];
  total: number | null;
};

export const ticketHistoryApi = {
  async getTickets(
    page: number,
    itemsPerPage: number,
    config?: ApiRequestConfig
  ): Promise<TicketHistoryResponse> {
    const response = await apiClient.get<TicketHistoryItemDto[]>("/Online/MyBets", {
      ...config,
      params: {
        Page: page,
        ItemsPerPage: itemsPerPage,
        ...config?.params,
      },
    });

    const totalHeader = response.headers["x-pagination-total"];
    const total = Number(totalHeader);

    return {
      items: response.data ?? [],
      total: Number.isFinite(total) ? total : null,
    };
  },

  async getTicket(
    receiptId: number,
    config?: ApiRequestConfig
  ): Promise<TicketDetailsDto> {
    const response = await apiClient.get<TicketDetailsDto>(
      `/Online/MyBets/${receiptId}`,
      config
    );
    return response.data;
  },
};

export default ticketHistoryApi;
