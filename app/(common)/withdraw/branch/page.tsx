import AccountPage from "@/components/Account/AccountPage";
import WithdrawalAmount from "@/components/Pages/Dashboard/WithdrawalAmount";

export const metadata = { title: "Branch withdrawal | SmartBet" };

export default function Page() {
  return <AccountPage title="Branch withdrawal"><div className="pay_method smartbet-dashboard"><WithdrawalAmount /></div></AccountPage>;
}
