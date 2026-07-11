import { apiGet, type ApiRequestConfig } from "@/src/api/apiClient";
import {
  toAccountBonusesViewModel,
  toAccountProfileViewModel,
} from "@/src/adapters/accountAdapters";
import type {
  AccountBonusesResponseDto,
  BonusSettingsDto,
  LiveSettingsDto,
  LocaleSettingsDto,
  OnlineUserInformationDto,
  OnlineSettingsDto,
} from "@/src/types/backendDtos";
import type {
  AccountBonusesViewModel,
  AccountProfileViewModel,
} from "@/src/types/viewModels";

export const accountApi = {
  async getOnlineClientInformation(
    config?: ApiRequestConfig
  ): Promise<AccountProfileViewModel> {
    const data = await apiGet<OnlineUserInformationDto>("/Online/UserInfo", config);
    return toAccountProfileViewModel(data);
  },

  async getAccountBonuses(config?: ApiRequestConfig): Promise<AccountBonusesViewModel> {
    const data = await apiGet<AccountBonusesResponseDto>("/Account/Bonuses", config);
    return toAccountBonusesViewModel(data);
  },

  getOnlineSettings(config?: ApiRequestConfig): Promise<OnlineSettingsDto> {
    return apiGet<OnlineSettingsDto>("/CompanySettings/OnlineSettings", config);
  },

  getLocaleSettings(config?: ApiRequestConfig): Promise<LocaleSettingsDto> {
    return apiGet<LocaleSettingsDto>("/CompanySettings/Locale", config);
  },

  getBonusSettings(config?: ApiRequestConfig): Promise<BonusSettingsDto> {
    return apiGet<BonusSettingsDto>("/CompanySettings/Bonus", config);
  },

  getLiveSettings(config?: ApiRequestConfig): Promise<LiveSettingsDto> {
    return apiGet<LiveSettingsDto>("/CompanySettings/Live", config);
  },
};

export default accountApi;
