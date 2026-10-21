import ContentPage from "@/components/Shared/ContentPage";
import PasswordPage from "@/components/Account/PasswordPage";

export const metadata = { title: "Reset password | SmartBet" };

export default function Page() {
 return <ContentPage title="Reset password"><PasswordPage mode="reset" /></ContentPage>;
}
