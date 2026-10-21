import AccountPage from "@/components/Account/AccountPage";
import PasswordPage from "@/components/Account/PasswordPage";

export const metadata = { title: "Change password | SmartBet" };

export default function Page() {
  return <AccountPage title="Change password"><PasswordPage mode="change" /></AccountPage>;
}
