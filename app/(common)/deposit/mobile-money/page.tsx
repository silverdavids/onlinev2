import AccountPage from "@/components/Account/AccountPage";
import MobileDepositPage from "@/components/Account/MobileDepositPage";

export const metadata = { title: "Mobile money deposit | SmartBet" };
export default function Page() { return <AccountPage title="Mobile money deposit"><MobileDepositPage /></AccountPage>; }
