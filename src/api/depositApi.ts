import { apiClient, type ApiRequestConfig } from "@/src/api/apiClient";

export type RedeemShopDepositRequest = {
  Code: string;
};

export type RedeemShopDepositResponseDto = {
  message?: string;
  Message?: string;
  code?: string;
  Code?: string;
  balance?: number;
  Balance?: number;
  amount?: number;
  Amount?: number;
};

export type AccountStatementDto = {
  Account?: string;
  account?: string;
  Amount?: number;
  amount?: number;
  BalAfter?: number;
  balAfter?: number;
  Comment?: string;
  comment?: string;
  StatetmentDate?: string;
  statetmentDate?: string;
  Transcation?: string;
  transcation?: string;
  TransactionType?: string;
  transactionType?: string;
};

export type AccountStatementViewModel = {
  amount: number | null;
  balanceAfter: number | null;
  comment: string;
  date: string | null;
  transaction: string;
  transactionType: string;
};

const toNumberOrNull = (value: unknown): number | null => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
};

export const toAccountStatementViewModel = (
  dto: AccountStatementDto
): AccountStatementViewModel => ({
  amount: toNumberOrNull(dto.Amount ?? dto.amount),
  balanceAfter: toNumberOrNull(dto.BalAfter ?? dto.balAfter),
  comment: String(dto.Comment ?? dto.comment ?? ""),
  date: (dto.StatetmentDate ?? dto.statetmentDate ?? null) as string | null,
  transaction: String(dto.Transcation ?? dto.transcation ?? ""),
  transactionType: String(dto.TransactionType ?? dto.transactionType ?? ""),
});

export const depositApi = {
  async redeemShopDepositCode(
    code: string,
    config?: ApiRequestConfig
  ): Promise<RedeemShopDepositResponseDto> {
    const response = await apiClient.post<RedeemShopDepositResponseDto>(
      "/Online/redeem",
      { Code: code.trim() } satisfies RedeemShopDepositRequest,
      config
    );
    return response.data;
  },

  async getMyStatements(config?: ApiRequestConfig): Promise<AccountStatementViewModel[]> {
    const response = await apiClient.get<AccountStatementDto[]>("/Statement/Me", config);
    return (response.data ?? []).map(toAccountStatementViewModel);
  },
};

export default depositApi;
