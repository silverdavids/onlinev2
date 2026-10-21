import AccountPage from "@/components/Account/AccountPage";
import BonusesPage from "@/components/Account/BonusesPage";

export const metadata = { title: "My bonuses | SmartBet" };

export default function Page() {
  return <AccountPage title="My bonuses"><BonusesPage /></AccountPage>;
}
