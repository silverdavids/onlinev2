"use client";

import { useContext } from "react";
import { OnlineSettingsContext } from "@/src/settings/OnlineSettingsProvider";

export const useOnlineSettings = () => {
  const context = useContext(OnlineSettingsContext);
  if (!context) {
    throw new Error("useOnlineSettings must be used within OnlineSettingsProvider");
  }
  return context;
};
