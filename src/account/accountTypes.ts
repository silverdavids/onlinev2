import type { AccountProfileViewModel } from "@/src/types/viewModels";

export type AccountContextValue = {
  account: AccountProfileViewModel | null;
  balance: number | null;
  isLoadingAccount: boolean;
  accountLoaded: boolean;
  accountError: string | null;
  refreshAccount: () => Promise<AccountProfileViewModel | null>;
  clearAccount: () => void;
};
