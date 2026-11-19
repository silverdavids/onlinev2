/**
 * src/lib/auth-context.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Global reactive Authentication Context.
 *
 * Ensures sign-in and sign-out update every mounted consumer (SiteHeader,
 * AccountMenu, WalletProvider, Deposit, Withdraw, MyBets) synchronously,
 * SmartBet's server session is the only source of betting authentication.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { smartBetApi } from "@/lib/api-smartbet";
import { validateSmartBetSession, type AuthenticatedCustomer } from "@/lib/auth-session";
import { createRequestEpoch } from "@/lib/request-epoch";
export { toAuthenticatedCustomer as toAuthUser, validateSmartBetSession } from "@/lib/auth-session";

export type AuthUser = AuthenticatedCustomer;

export type AuthContextValue = {
  user: AuthUser | null;
  profile: null;
  loading: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
  refreshAuth: () => Promise<AuthUser | null>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const requests = useRef(createRequestEpoch());
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<null>(null);
  const [loading, setLoading] = useState(true);

  const refreshAuth = useCallback(async () => {
    const request = requests.current.next();
    const nextUser = await validateSmartBetSession(() => smartBetApi.checkLogin());
    if (!requests.current.isCurrent(request)) return null;
    setUser(nextUser);
    setProfile(null);
    setLoading(false);
    return nextUser;
  }, []);

  useEffect(() => {
    const epoch = requests.current;
    void refreshAuth();
    const validateOnFocus = () => {
      if (document.visibilityState === "visible") void refreshAuth();
    };
    const clearExpiredSession = () => {
      requests.current.invalidate();
      setUser(null);
      setProfile(null);
      setLoading(false);
    };
    window.addEventListener("focus", validateOnFocus);
    document.addEventListener("visibilitychange", validateOnFocus);
    window.addEventListener("smartbet:session-expired", clearExpiredSession);
    return () => {
      epoch.invalidate();
      window.removeEventListener("focus", validateOnFocus);
      document.removeEventListener("visibilitychange", validateOnFocus);
      window.removeEventListener("smartbet:session-expired", clearExpiredSession);
    };
  }, [refreshAuth]);

  const signOut = useCallback(async () => {
    // Keep the authenticated UI until the backend confirms session revocation.
    await smartBetApi.logOff();
    requests.current.invalidate();
    setUser(null);
    setProfile(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isAuthenticated: !!user,
        signOut,
        refreshAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return ctx;
}
