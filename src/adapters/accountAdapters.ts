import type {
  AccountBonusesResponseDto,
  OnlineUserInformationDto,
} from "@/src/types/backendDtos";
import type {
  AccountBonusesViewModel,
  AccountProfileViewModel,
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
