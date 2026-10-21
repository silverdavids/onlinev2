import ContentPage from "@/components/Shared/ContentPage";
import PasswordPage from "@/components/Account/PasswordPage";

export const metadata = { title: "Forgot password | SmartBet" };

export default function Page() {
 return <ContentPage title="Forgot password"><PasswordPage mode="forgot" /></ContentPage>;
}
