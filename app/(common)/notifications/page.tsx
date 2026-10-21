import AccountPage from "@/components/Account/AccountPage";
import NotificationsPage from "@/components/Account/NotificationsPage";

export const metadata = { title: "Notifications | SmartBet" };

export default function Page() {
  return <AccountPage title="Notifications"><NotificationsPage /></AccountPage>;
}
