import type { OnlineSettingsViewModel } from "@/src/types/viewModels";

export type OnlineSettingsContextValue = {
  settings: OnlineSettingsViewModel | null;
  minStake: number | null;
  maxStake: number | null;
  maxPayout: number | null;
  isLoadingSettings: boolean;
  settingsLoaded: boolean;
  settingsError: string | null;
  refreshSettings: () => Promise<OnlineSettingsViewModel | null>;
};
