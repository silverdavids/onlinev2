import { apiClient, type ApiRequestConfig } from "@/src/api/apiClient";

export type AccountStatementDto = {
  Account?: string;
  account?: string;
  Amount?: number;
  amount?: number;
  BalAfter?: number;
  balAfter?: number;
  BalBefore?: number;
  balBefore?: number;
  Comment?: string;
  comment?: string;
  Controller?: string;
  controller?: string;
  Error?: boolean;
  error?: boolean;
  Method?: string | null;
  method?: string | null;
  Serial?: string | number | null;
  serial?: string | number | null;
  StatementId?: number;
  statementId?: number;
  StatetmentDate?: string;
  statetmentDate?: string;
  Transcation?: string;
  transcation?: string;
  TransactionType?: string | number | null;
  transactionType?: string | number | null;
};

export type WithdrawalDto = {
  WithDrawalId?: number;
  withDrawalId?: number;
  Amount?: number;
  amount?: number;
  Requestcode?: string | null;
  requestcode?: string | null;
  RequestStatus?: number;
  requestStatus?: number;
  StatusName?: string | null;
  statusName?: string | null;
  RequestTime?: string;
  requestTime?: string;
  PaymentTime?: string | null;
  paymentTime?: string | null;
  Branch?: string | null;
  branch?: string | null;
  Destination?: string | null;
  destination?: string | null;
  Notes?: string | null;
  notes?: string | null;
};

export type WithdrawalRequestDto = {
  Amount: number;
};

export type WithdrawalResponseDto = {
  successful?: boolean;
  Successful?: boolean;
  message?: string;
  Message?: string;
  code?: string;
  Code?: string;
  balance?: number | string;
  Balance?: number | string;
  correlationId?: string;
};

export type PagedResponse<T> = {
  items: T[];
  total: number | null;
};

const readTotalHeader = (headers: Record<string, unknown>): number | null => {
  const total = Number(headers["x-pagination-total"]);
  return Number.isFinite(total) ? total : null;
};

export const accountActivityApi = {
  async getStatements(
    params: {
      page: number;
      itemsPerPage: number;
      startDate?: string;
      endDate?: string;
    },
    config?: ApiRequestConfig
  ): Promise<PagedResponse<AccountStatementDto>> {
    const response = await apiClient.get<AccountStatementDto[]>("/Statement/Me", {
      ...config,
      params: {
        Page: params.page,
        ItemsPerPage: params.itemsPerPage,
        StartDate: params.startDate,
        EndDate: params.endDate,
        ...config?.params,
      },
    });

    return {
      items: response.data ?? [],
      total: readTotalHeader(response.headers),
    };
  },

  async getWithdrawals(
    params: {
      page: number;
      itemsPerPage: number;
      startDate?: string;
      endDate?: string;
    },
    config?: ApiRequestConfig
  ): Promise<PagedResponse<WithdrawalDto>> {
    const response = await apiClient.get<WithdrawalDto[]>("/Online/Withdrawals", {
      ...config,
      params: {
        Page: params.page,
        ItemsPerPage: params.itemsPerPage,
        StartDate: params.startDate,
        EndDate: params.endDate,
        ...config?.params,
      },
    });

    return {
      items: response.data ?? [],
      total: readTotalHeader(response.headers),
    };
  },

  async createBranchWithdrawal(
    amount: number,
    config?: ApiRequestConfig
  ): Promise<WithdrawalResponseDto> {
    const response = await apiClient.post<WithdrawalResponseDto>(
      "/Online/WithdrawAtBranch",
      { Amount: amount } satisfies WithdrawalRequestDto,
      config
    );
    return response.data;
  },
};

export default accountActivityApi;

