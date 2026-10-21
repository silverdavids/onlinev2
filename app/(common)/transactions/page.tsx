import AccountPage from "@/components/Account/AccountPage";
import TransactionHistory from "@/components/Pages/Dashboard/TransactionHistory";

export const metadata = { title: "Account statement | SmartBet" };

export default function Page() {
  return <AccountPage title="Account statement"><div className="pay_method smartbet-dashboard"><TransactionHistory /></div></AccountPage>;
}
