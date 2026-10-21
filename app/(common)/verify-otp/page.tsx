import ContentPage from "@/components/Shared/ContentPage";
import PasswordPage from "@/components/Account/PasswordPage";

export const metadata = { title: "Verify your phone | SmartBet" };

export default function Page() {
 return <ContentPage title="Verify your phone"><PasswordPage mode="verify" /></ContentPage>;
}
