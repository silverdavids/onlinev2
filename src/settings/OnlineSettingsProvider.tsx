"use client";

import React, { createContext, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { accountApi } from "@/src/api/accountApi";
import { normalizeApiError } from "@/src/api/apiError";
import type { OnlineSettingsContextValue } from "@/src/settings/settingsTypes";
import type { OnlineSettingsViewModel } from "@/src/types/viewModels";

export const OnlineSettingsContext = createContext<OnlineSettingsContextValue | undefined>(undefined);

export const OnlineSettingsProvider = ({ children }: { children: React.ReactNode }) => {
  const [settings, setSettings] = useState<OnlineSettingsViewModel | null>(null);
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const inFlightRef = useRef<Promise<OnlineSettingsViewModel | null> | null>(null);

  const refreshSettings = useCallback(async () => {
    if (inFlightRef.current) {
      return inFlightRef.current;
    }

    const request = accountApi
      .getOnlineSettings()
      .then((onlineSettings) => {
        setSettings(onlineSettings);
        setSettingsLoaded(true);
        setSettingsError(null);
        return onlineSettings;
      })
      .catch((error: unknown) => {
        const apiError = normalizeApiError(error);
        setSettingsError(apiError.message);
        setSettingsLoaded(false);
        throw apiError;
      })
      .finally(() => {
        setIsLoadingSettings(false);
        inFlightRef.current = null;
      });

    inFlightRef.current = request;
    setIsLoadingSettings(true);
    setSettingsError(null);
    return request;
  }, []);

  useEffect(() => {
    void refreshSettings().catch(() => undefined);
  }, [refreshSettings]);

  const value = useMemo<OnlineSettingsContextValue>(
    () => ({
      settings,
      minStake: settings?.minStake ?? null,
      maxStake: settings?.maxStake ?? null,
      maxPayout: settings?.maxPayout ?? null,
      isLoadingSettings,
      settingsLoaded,
      settingsError,
      refreshSettings,
    }),
    [isLoadingSettings, refreshSettings, settings, settingsError, settingsLoaded]
  );

  return <OnlineSettingsContext.Provider value={value}>{children}</OnlineSettingsContext.Provider>;
};
