import AccountPage from "@/components/Account/AccountPage";
import ProfilePage from "@/components/Account/ProfilePage";

export const metadata = { title: "Profile | SmartBet" };

export default function Page() {
  return <AccountPage title="Profile"><ProfilePage /></AccountPage>;
}
