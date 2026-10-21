import AccountPage from "@/components/Account/AccountPage";
import FinancePage from "@/components/Account/FinancePage";

export const metadata = { title: "Deposits & withdrawals | SmartBet" };

export default function Page() {
  return <AccountPage title="Deposits & withdrawals"><FinancePage /></AccountPage>;
}
