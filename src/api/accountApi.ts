import { apiClient, apiGet, type ApiRequestConfig } from "@/src/api/apiClient";
import { ApiError } from "@/src/api/apiError";
import {
  toAccountBonusesViewModel,
  toOnlineSettingsViewModel,
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
  OnlineSettingsViewModel,
} from "@/src/types/viewModels";

export const accountApi = {
  async getOnlineClientInformation(
    config?: ApiRequestConfig
  ): Promise<AccountProfileViewModel> {
    const response = await apiClient.get<OnlineUserInformationDto>("/Online/UserInfo", config);
    if (response.status === 204) {
      throw new ApiError("Account information unavailable", {
        code: "REQUEST_FAILED",
        status: 204,
      });
    }
    return toAccountProfileViewModel(response.data);
  },

  async getAccountBonuses(config?: ApiRequestConfig): Promise<AccountBonusesViewModel> {
    const data = await apiGet<AccountBonusesResponseDto>("/Account/Bonuses", config);
    return toAccountBonusesViewModel(data);
  },

  async getOnlineSettings(config?: ApiRequestConfig): Promise<OnlineSettingsViewModel> {
    const data = await apiGet<OnlineSettingsDto>("/CompanySettings/OnlineSettings", config);
    return toOnlineSettingsViewModel(data);
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
