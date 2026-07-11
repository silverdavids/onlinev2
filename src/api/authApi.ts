import { apiClient, apiPost, type ApiRequestConfig } from "@/src/api/apiClient";
import {
  toLoginRequestDto,
  toRegisterOnlineRequestDto,
  toUserSessionViewModel,
} from "@/src/adapters/authAdapters";
import type {
  ChangePasswordRequestDto,
  CheckLoginResponseDto,
  LoginRequestDto,
  LoginResponseDto,
  RegisterOnlineRequestDto,
  RegisterOnlineResponseDto,
  SetNewPasswordRequestDto,
  VerifyOtpAndSetPasswordRequestDto,
  VerifyOtpAndSetPasswordResponseDto,
} from "@/src/types/backendDtos";
import type {
  LoginCredentials,
  RegistrationFormModel,
  UserSessionViewModel,
} from "@/src/types/viewModels";

export const authApi = {
  login(credentials: LoginCredentials, config?: ApiRequestConfig): Promise<LoginResponseDto> {
    return apiPost<LoginResponseDto, LoginRequestDto>(
      "/Account/Login",
      toLoginRequestDto(credentials),
      config
    );
  },

  logOff(config?: ApiRequestConfig): Promise<void> {
    return apiPost<void>("/Account/LogOff", undefined, config);
  },

  async checkLogin(config?: ApiRequestConfig): Promise<UserSessionViewModel> {
    const response = await apiClient.get<CheckLoginResponseDto | undefined>(
      "/Account/CheckLogin",
      {
        validateStatus: (status) => [200, 204, 401].includes(status),
        ...config,
      }
    );
    if (response.status === 204 || response.status === 401) {
      return toUserSessionViewModel(null, false);
    }
    return toUserSessionViewModel(response.data ?? null, true);
  },

  register(
    form: RegistrationFormModel,
    config?: ApiRequestConfig
  ): Promise<RegisterOnlineResponseDto> {
    return apiPost<RegisterOnlineResponseDto, RegisterOnlineRequestDto>(
      "/Account/Register",
      toRegisterOnlineRequestDto(form),
      config
    );
  },

  verifyOtpAndSetPassword(
    payload: VerifyOtpAndSetPasswordRequestDto,
    config?: ApiRequestConfig
  ): Promise<VerifyOtpAndSetPasswordResponseDto> {
    return apiPost<
      VerifyOtpAndSetPasswordResponseDto,
      VerifyOtpAndSetPasswordRequestDto
    >("/Account/VerifyOtpAndSetPassword", payload, config);
  },

  changePassword(
    payload: ChangePasswordRequestDto,
    config?: ApiRequestConfig
  ): Promise<boolean> {
    return apiPost<boolean, ChangePasswordRequestDto>(
      "/Account/ChangePassWord",
      payload,
      config
    );
  },

  setNewPassword(
    payload: SetNewPasswordRequestDto,
    config?: ApiRequestConfig
  ): Promise<{ Item1: boolean; Item2: string }> {
    return apiPost<{ Item1: boolean; Item2: string }, SetNewPasswordRequestDto>(
      "/Account/SetNewPassWord",
      payload,
      config
    );
  },
};

export default authApi;
