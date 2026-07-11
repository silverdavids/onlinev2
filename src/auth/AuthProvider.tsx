"use client";

import React, { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { authApi } from "@/src/api/authApi";
import { ApiError, normalizeApiError } from "@/src/api/apiError";
import type { UserSessionViewModel, LoginCredentials } from "@/src/types/viewModels";
import type { AuthContextValue, AuthState } from "@/src/auth/authTypes";

const unauthenticatedSession: UserSessionViewModel = {
  authenticated: false,
  user: null,
  roles: [],
};

const initialState: AuthState = {
  user: null,
  roles: [],
  isAuthenticated: false,
  isLoadingSession: true,
  sessionChecked: false,
  error: null,
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const getErrorMessage = (error: unknown): string => {
  const apiError = normalizeApiError(error);
  return apiError.message || "Authentication request failed.";
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, setState] = useState<AuthState>(initialState);

  const applySession = useCallback((session: UserSessionViewModel) => {
    const authenticated = Boolean(session.authenticated && session.user);
    setState({
      user: authenticated ? session.user ?? null : null,
      roles: authenticated ? session.roles : [],
      isAuthenticated: authenticated,
      isLoadingSession: false,
      sessionChecked: true,
      error: null,
    });
    return session;
  }, []);

  const clearSession = useCallback((error: string | null = null) => {
    setState({
      user: null,
      roles: [],
      isAuthenticated: false,
      isLoadingSession: false,
      sessionChecked: true,
      error,
    });
    return unauthenticatedSession;
  }, []);

  const refreshSession = useCallback(async () => {
    setState((current) => ({ ...current, isLoadingSession: true, error: null }));
    try {
      const session = await authApi.checkLogin();
      if (!session.authenticated || !session.user) {
        return clearSession(session.reason ?? null);
      }
      return applySession(session);
    } catch (error) {
      const apiError = normalizeApiError(error);
      if (apiError instanceof ApiError && apiError.status === 401) {
        return clearSession(null);
      }
      return clearSession(apiError.message);
    }
  }, [applySession, clearSession]);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  const login = useCallback(
    async (credentials: LoginCredentials) => {
      setState((current) => ({ ...current, error: null }));
      await authApi.login(credentials);
      const session = await refreshSession();
      if (!session.authenticated || !session.user) {
        const message =
          session.reason === "not_in_online_role"
            ? "Your account is not enabled for online access."
            : "Login succeeded, but the session could not be confirmed. Please contact support if this continues.";
        setState((current) => ({ ...current, error: message }));
        throw new Error(message);
      }
      return session;
    },
    [refreshSession]
  );

  const logout = useCallback(async () => {
    setState((current) => ({ ...current, error: null }));
    try {
      await authApi.logOff();
    } catch (error) {
      setState((current) => ({ ...current, error: getErrorMessage(error) }));
    } finally {
      clearSession(null);
    }
  }, [clearSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      login,
      logout,
      refreshSession,
    }),
    [login, logout, refreshSession, state]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
