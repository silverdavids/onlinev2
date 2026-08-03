import { apiClient, type ApiRequestConfig } from "@/src/api/apiClient";

export type PrematchTicketBetRequest = {
  BetCategory: string;
  BetOption: string;
  BookMakerId: number;
  Line: string | null;
  MatchId: number;
  MatchOddId: number | null;
  Odd: number;
  OptionId: number | null;
  ShortCode: number;
  IsLive: false;
  Period: 0;
  BetMinute: 0;
  Scores: null;
  HomeScore: 0;
  AwayScore: 0;
};

export type PrematchTicketRequest = {
  BetData: PrematchTicketBetRequest[];
  SetNo: number;
  TotalBonus: number;
  TotalOdd: number;
  TotalStake: number;
  BookingCode: 0;
  IsLive: false;
  BonusId: 0;
  PaymentSource: null;
  PaymentReference: null;
};

export type TicketChangedOddDto = {
  MatchId?: number;
  matchId?: number;
  MatchOddId?: number | null;
  matchOddId?: number | null;
  BetCategory?: string;
  betCategory?: string;
  BetOption?: string;
  betOption?: string;
  Line?: string | null;
  line?: string | null;
  Odd?: number;
  odd?: number;
  PostedOdd?: number | null;
  postedOdd?: number | null;
  ValidationError?: string | null;
  validationError?: string | null;
};

export type TicketReceiptDto = {
  FormattedSerial?: string;
  formattedSerial?: string;
  Stake?: number;
  stake?: number;
  TotalOdds?: number;
  totalOdds?: number;
  ReceiptNumber?: number;
  receiptNumber?: number;
  ReceiptTime?: string;
  receiptTime?: string;
  Serial?: string;
  serial?: string;
  BookingCode?: number;
  bookingCode?: number;
};

export type TicketResultDto = {
  Succeeded?: boolean;
  succeeded?: boolean;
  Message?: string | null;
  message?: string | null;
  ChangedOdds?: TicketChangedOddDto[] | null;
  changedOdds?: TicketChangedOddDto[] | null;
  JsonData?: TicketReceiptDto | null;
  jsonData?: TicketReceiptDto | null;
  Errors?: unknown[] | null;
  errors?: unknown[] | null;
};

export type ReceiptListItemDto = {
  ReceiptId?: number;
  receiptId?: number;
  ReceiptDate?: string;
  receiptDate?: string;
  SerialCode?: string;
  serialCode?: string;
  Stake?: number;
  stake?: number;
  TotalOdds?: number;
  totalOdds?: number;
};

export const prematchTicketApi = {
  async placeTicket(
    request: PrematchTicketRequest,
    config?: ApiRequestConfig
  ): Promise<TicketResultDto | null> {
    const response = await apiClient.post<TicketResultDto | undefined>(
      "/Ticket",
      request,
      config
    );
    return response.data ?? null;
  },

  async getLatestReceipt(
    userId?: string,
    config?: ApiRequestConfig
  ): Promise<ReceiptListItemDto | null> {
    const response = await apiClient.get<ReceiptListItemDto[]>("/Receipt", {
      ...config,
      params: {
        Page: 1,
        ItemsPerPage: 1,
        ...(userId ? { UserId: userId } : {}),
        ...config?.params,
      },
    });

    return response.data?.[0] ?? null;
  },
};

export default prematchTicketApi;
