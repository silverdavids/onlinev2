import AccountPage from "@/components/Account/AccountPage";
import FinancePage from "@/components/Account/FinancePage";
import WithdrawalAmount from "@/components/Pages/Dashboard/WithdrawalAmount";

export const metadata = { title: "Withdraw | SmartBet" };

export default function Page({ searchParams }: { searchParams: { method?: string } }) {
  if (["shop", "branch"].includes(searchParams.method ?? "")) {
    return <AccountPage title="Branch withdrawal"><div className="pay_method smartbet-dashboard"><WithdrawalAmount /></div></AccountPage>;
  }
  return <AccountPage title="Withdraw"><FinancePage withdrawalsOnly /></AccountPage>;
}
