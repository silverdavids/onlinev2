"use client";

import React, { createContext, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { accountApi } from "@/src/api/accountApi";
import { ApiError, normalizeApiError } from "@/src/api/apiError";
import { useAuth } from "@/src/auth/useAuth";
import type { AccountContextValue } from "@/src/account/accountTypes";
import type { AccountProfileViewModel } from "@/src/types/viewModels";

export const AccountContext = createContext<AccountContextValue | undefined>(undefined);

export const AccountProvider = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoadingSession, sessionChecked } = useAuth();
  const [account, setAccount] = useState<AccountProfileViewModel | null>(null);
  const [isLoadingAccount, setIsLoadingAccount] = useState(false);
  const [accountLoaded, setAccountLoaded] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);
  const inFlightRef = useRef<Promise<AccountProfileViewModel | null> | null>(null);

  const clearAccount = useCallback(() => {
    setAccount(null);
    setIsLoadingAccount(false);
    setAccountLoaded(false);
    setAccountError(null);
    inFlightRef.current = null;
  }, []);

  const refreshAccount = useCallback(async () => {
    if (!isAuthenticated) {
      clearAccount();
      return null;
    }

    if (inFlightRef.current) {
      return inFlightRef.current;
    }

    const request = accountApi
      .getOnlineClientInformation()
      .then((profile) => {
        setAccount(profile);
        setAccountLoaded(true);
        setAccountError(null);
        return profile;
      })
      .catch((error: unknown) => {
        const apiError = normalizeApiError(error);
        if (apiError instanceof ApiError && (apiError.status === 401 || apiError.status === 204)) {
          setAccount(null);
          setAccountLoaded(false);
          setAccountError(null);
          return null;
        }
        setAccountError(apiError.message);
        setAccountLoaded(false);
        throw apiError;
      })
      .finally(() => {
        setIsLoadingAccount(false);
        inFlightRef.current = null;
      });

    inFlightRef.current = request;
    setIsLoadingAccount(true);
    setAccountError(null);
    return request;
  }, [clearAccount, isAuthenticated]);

  useEffect(() => {
    if (isLoadingSession || !sessionChecked) return;
    if (!isAuthenticated) {
      clearAccount();
      return;
    }
    void refreshAccount().catch(() => undefined);
  }, [clearAccount, isAuthenticated, isLoadingSession, refreshAccount, sessionChecked]);

  const value = useMemo<AccountContextValue>(
    () => ({
      account,
      balance: account?.balance ?? null,
      isLoadingAccount,
      accountLoaded,
      accountError,
      refreshAccount,
      clearAccount,
    }),
    [account, accountError, accountLoaded, clearAccount, isLoadingAccount, refreshAccount]
  );

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
};
