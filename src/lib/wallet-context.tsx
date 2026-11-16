/**
 * src/lib/wallet-context.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Global reactive Wallet & Online Account Context.
 *
 * Keeps wallet balance, bonus wallet, official statements, and ledger
 * transactions synchronized across SiteHeader, AccountMenu, BetSlip, Deposit,
 * Withdraw, and Transactions views without page reloads.
 *
 * Integrates with SmartBet Online API routes:
 * - GET /api/Online/UserInfo
 * - GET /api/Account/Bonuses
 * - GET /api/Statement/User?userid=...
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { WalletTransaction } from "@/modules/wallet/wallet.functions";
import { useAuth } from "@/hooks/use-auth";
import { smartBetApi, type BonusesResponse, type StatementRow } from "@/lib/api-smartbet";

export type WalletContextValue = {
  balance: number | null;
  bonusBalance: number | null;
  accountId: string | null;
  userId: string | null;
  phoneNumber: string | null;
  transactions: WalletTransaction[];
  statement: StatementRow[];
  bonuses: BonusesResponse | null;
  loading: boolean;
  refresh: () => Promise<void>;
  syncBalance: (newBalance: number) => void;
};

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);
  const [bonusBalance, setBonusBalance] = useState<number | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [statement, setStatement] = useState<StatementRow[]>([]);
  const [bonuses, setBonuses] = useState<BonusesResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const loadWallet = useCallback(async () => {
    if (authLoading) return;

    if (!isAuthenticated) {
      setBalance(null);
      setBonusBalance(null);
      setAccountId(null);
      setUserId(null);
      setPhoneNumber(null);
      setTransactions([]);
      setStatement([]);
      setBonuses(null);
      setLoading(false);
      return;
    }

    setBalance(null);
    setBonusBalance(null);
    setAccountId(null);
    setUserId(null);
    setPhoneNumber(null);
    setTransactions([]);
    setStatement([]);
    setBonuses(null);

    try {
      // 1. Fetch SmartBet Online UserInfo & Bonuses in parallel
      const [userInfoRes, bonusesRes] = await Promise.allSettled([
        smartBetApi.getUserInfo(),
        smartBetApi.getBonuses(),
      ]);

      if (userInfoRes.status === "fulfilled" && userInfoRes.value) {
        const info = userInfoRes.value;
        if (typeof info.Balance === "number" && Number.isFinite(info.Balance)) {
          setBalance(info.Balance);
        }
        if (info.AccountId != null) setAccountId(String(info.AccountId));
        if (info.UserId) {
          setUserId(String(info.UserId));
        }
        if (info.PhoneNumber) setPhoneNumber(info.PhoneNumber);
      }

      if (bonusesRes.status === "fulfilled" && bonusesRes.value) {
        const { wallets, transactions } = bonusesRes.value;
        if (Array.isArray(wallets) && Array.isArray(transactions)) {
          const amounts = wallets.map((wallet) => wallet.bonusBalance);
          if (amounts.every((amount) => typeof amount === "number" && Number.isFinite(amount))) {
            setBonuses(bonusesRes.value);
            setBonusBalance(amounts.reduce((total, amount) => total + amount, 0));
          }
        }
      }

      // The backend scopes this endpoint to the authenticated user identity.
      if (user?.id) {
        try {
          const stmtRows = await smartBetApi.getStatement();
          if (Array.isArray(stmtRows)) {
            setStatement(stmtRows);
          }
        } catch {
          // Safe if offline
        }
      }

      setTransactions([]);
    } catch (err) {
      setBalance(null);
      setBonusBalance(null);
      setAccountId(null);
      setUserId(null);
      setPhoneNumber(null);
      setTransactions([]);
      setStatement([]);
      setBonuses(null);
    } finally {
      setLoading(false);
    }
  }, [authLoading, isAuthenticated, user]);

  useEffect(() => {
    loadWallet();
  }, [loadWallet]);

  const refresh = useCallback(async () => {
    await loadWallet();
  }, [loadWallet]);

  const syncBalance = useCallback((newBalance: number) => {
    if (!Number.isFinite(newBalance)) return;
    setBalance(newBalance);
  }, []);

  return (
    <WalletContext.Provider
      value={{
        balance,
        bonusBalance,
        accountId,
        userId,
        phoneNumber,
        transactions,
        statement,
        bonuses,
        loading,
        refresh,
        syncBalance,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWalletContext(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) {
    throw new Error("useWallet must be used inside WalletProvider");
  }
  return ctx;
}
