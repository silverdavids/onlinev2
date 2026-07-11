export type UserSessionViewModel = {
  authenticated: boolean;
  reason?: string;
  user?: {
    id: string;
    username: string;
    email: string | null;
    phone: string | null;
  } | null;
  roles: string[];
};

export type LoginCredentials = {
  username: string;
  password: string;
  rememberMe?: boolean;
};

export type RegistrationFormModel = {
  email?: string;
  phoneNumber: string;
  username?: string;
  firstName?: string;
  surname?: string;
  nin?: string;
  dob?: string;
};

export type AccountProfileViewModel = {
  accountId: number;
  balance: number | null;
  userId: string;
  phoneNumber: string | null;
};

export type OnlineSettingsViewModel = {
  minStake: number | null;
  maxStake: number | null;
  maxPayout: number | null;
};

export type AccountBonusesViewModel = {
  wallets: Array<{
    campaignName: string;
    promoCode: string | null;
    bonusBalance: number;
    wageredAmount: number;
    requiredWagerAmount: number;
    expiryDate: string;
    status: string;
  }>;
  transactions: Array<{
    createdAt: string;
    transactionType: string;
    amount: number;
    balanceBefore: number;
    balanceAfter: number;
    referenceType: string;
    referenceId: string | number | null;
  }>;
};
