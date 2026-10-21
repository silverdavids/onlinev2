import AccountPage from "@/components/Account/AccountPage";
import MobileWithdrawalPage from "@/components/Account/MobileWithdrawalPage";

export const metadata = { title: "Mobile money withdrawal | SmartBet" };

export default function Page() {
  return <AccountPage title="Mobile money withdrawal"><MobileWithdrawalPage /></AccountPage>;
}
