export type BackendValidationErrors = Record<string, string[]>;

export type BackendModelState = Record<string, string[]>;

export type BackendErrorBody = {
  Message?: string;
  message?: string;
  Error?: string;
  error?: string;
  ModelState?: BackendModelState;
  errors?: BackendValidationErrors | string[];
  detail?: string;
  success?: boolean;
};

export type LoginRequestDto = {
  UserName: string;
  Password: string;
  RememberMe: boolean;
};

export type LoginResponseDto = {
  success: boolean;
  message: string;
  user: {
    Id: string;
    UserName: string;
    Email?: string | null;
  };
};

export type CheckLoginResponseDto = {
  authenticated: boolean;
  reason?: string;
  user?: {
    id: string;
    username: string;
    email?: string | null;
    phone?: string | null;
  } | null;
  roles?: string[];
};

export type RegisterOnlineRequestDto = {
  Email?: string | null;
  PhoneNumber: string;
  UserName?: string;
  FirstName?: string;
  SurName?: string;
  NIN?: string;
  DOB?: string;
  PromoCode?: string;
};

export type RegisterOnlineResponseDto = {
  success: boolean;
  message: string;
  expiresAt?: string;
  promoApplied?: boolean;
  promoMessage?: string | null;
};

export type VerifyOtpAndSetPasswordRequestDto = {
  PhoneNumber: string;
  OtpCode: string;
  NewPassword: string;
  ConfirmPassword: string;
};

export type VerifyOtpAndSetPasswordResponseDto = {
  success: boolean;
  message: string;
};

export type ChangePasswordRequestDto = {
  UserName: string;
  OldPassword: string;
  NewPassword: string;
  ConfirmPassword: string;
};

export type SetNewPasswordRequestDto = {
  UserName?: string;
  NewPassword: string;
  ConfirmPassword: string;
  Code?: string | null;
  PhoneNumber?: string;
};

export type OnlineUserInformationDto = {
  AccountId: number;
  Balance: number | null;
  UserId: string;
  PhoneNumber?: string | null;
};

export type AccountBonusesResponseDto = {
  wallets: Array<{
    walletId?: number | null;
    campaignName: string;
    bonusType?: string | null;
    campaignDescription?: string | null;
    promoCode: string | null;
    bonusBalance: number;
    wageredAmount: number;
    requiredWagerAmount: number;
    expiryDate: string | null;
    status: string;
    createdAt?: string | null;
  }>;
  transactions: Array<{
    bonusTransactionId?: number | null;
    createdAt: string;
    transactionType: string;
    amount: number;
    balanceBefore: number;
    balanceAfter: number;
    referenceType: string;
    referenceId: string | number | null;
    description?: string | null;
  }>;
};

export type OnlineSettingsDto = {
  MinStake: number | null;
  MaxStake: number | null;
  MaxPayOut: number | null;
};

export type LocaleSettingsDto = {
  Currency?: string;
  Locale?: string;
  TimeZone?: string;
  [key: string]: unknown;
};

export type BonusSettingsDto = {
  HasBonus?: boolean;
  BonusType?: string;
  [key: string]: unknown;
};

export type LiveSettingsDto = {
  Enabled?: boolean;
  IsEnabled?: boolean;
  [key: string]: unknown;
};
