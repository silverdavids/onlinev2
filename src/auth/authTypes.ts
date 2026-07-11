import type { LoginCredentials, UserSessionViewModel } from "@/src/types/viewModels";

export type AuthUser = NonNullable<UserSessionViewModel["user"]>;

export type AuthState = {
  user: AuthUser | null;
  roles: string[];
  isAuthenticated: boolean;
  isLoadingSession: boolean;
  sessionChecked: boolean;
  error: string | null;
};

export type AuthContextValue = AuthState & {
  login: (credentials: LoginCredentials) => Promise<UserSessionViewModel>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<UserSessionViewModel>;
};
