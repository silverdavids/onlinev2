import type {
  LoginCredentials,
  RegistrationFormModel,
  UserSessionViewModel,
} from "@/src/types/viewModels";
import type {
  CheckLoginResponseDto,
  LoginRequestDto,
  RegisterOnlineRequestDto,
} from "@/src/types/backendDtos";

const normalizeOptionalString = (value: string | undefined): string | undefined => {
  const trimmed = value?.trim();
  return trimmed || undefined;
};

export const toLoginRequestDto = (credentials: LoginCredentials): LoginRequestDto => ({
  UserName: credentials.username,
  Password: credentials.password,
  RememberMe: credentials.rememberMe ?? true,
});

export const toRegisterOnlineRequestDto = (
  form: RegistrationFormModel
): RegisterOnlineRequestDto => ({
  Email: normalizeOptionalString(form.email) || null,
  PhoneNumber: form.phoneNumber,
  UserName: normalizeOptionalString(form.username),
  FirstName: normalizeOptionalString(form.firstName),
  SurName: normalizeOptionalString(form.surname),
  NIN: normalizeOptionalString(form.nin),
  DOB: normalizeOptionalString(form.dob),
  PromoCode: normalizeOptionalString(form.promoCode),
});

export const toUserSessionViewModel = (
  dto: CheckLoginResponseDto | null,
  fallbackAuthenticated = false
): UserSessionViewModel => ({
  authenticated: dto?.authenticated ?? fallbackAuthenticated,
  reason: dto?.reason,
  user: dto?.user
    ? {
        id: dto.user.id,
        username: dto.user.username,
        email: dto.user.email ?? null,
        phone: dto.user.phone ?? null,
      }
    : null,
  roles: dto?.roles ?? [],
});
