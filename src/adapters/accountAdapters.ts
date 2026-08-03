import type {
  AccountBonusesResponseDto,
  OnlineSettingsDto,
  OnlineUserInformationDto,
} from "@/src/types/backendDtos";
import type {
  AccountBonusesViewModel,
  AccountProfileViewModel,
  OnlineSettingsViewModel,
} from "@/src/types/viewModels";

export const toAccountProfileViewModel = (
  dto: OnlineUserInformationDto
): AccountProfileViewModel => ({
  accountId: dto.AccountId,
  balance: dto.Balance,
  userId: dto.UserId,
  phoneNumber: dto.PhoneNumber || null,
});

export const toAccountBonusesViewModel = (
  dto: AccountBonusesResponseDto
): AccountBonusesViewModel => ({
  wallets: (dto.wallets ?? []).map((wallet) => ({
    walletId: wallet.walletId ?? null,
    campaignName: wallet.campaignName,
    bonusType: wallet.bonusType ?? null,
    campaignDescription: wallet.campaignDescription ?? null,
    promoCode: wallet.promoCode,
    bonusBalance: wallet.bonusBalance,
    wageredAmount: wallet.wageredAmount,
    requiredWagerAmount: wallet.requiredWagerAmount,
    expiryDate: wallet.expiryDate,
    status: wallet.status,
    createdAt: wallet.createdAt ?? null,
  })),
  transactions: (dto.transactions ?? []).map((transaction) => ({
    bonusTransactionId: transaction.bonusTransactionId ?? null,
    createdAt: transaction.createdAt,
    transactionType: transaction.transactionType,
    amount: transaction.amount,
    balanceBefore: transaction.balanceBefore,
    balanceAfter: transaction.balanceAfter,
    referenceType: transaction.referenceType,
    referenceId: transaction.referenceId,
    description: transaction.description ?? null,
  })),
});

export const toOnlineSettingsViewModel = (
  dto: OnlineSettingsDto
): OnlineSettingsViewModel => ({
  minStake: dto.MinStake,
  maxStake: dto.MaxStake,
  maxPayout: dto.MaxPayOut,
});
