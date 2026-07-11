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
  wallets: dto.wallets,
  transactions: dto.transactions,
});

export const toOnlineSettingsViewModel = (
  dto: OnlineSettingsDto
): OnlineSettingsViewModel => ({
  minStake: dto.MinStake,
  maxStake: dto.MaxStake,
  maxPayout: dto.MaxPayOut,
});
