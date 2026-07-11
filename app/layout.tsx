import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/public/scss/style.scss";
import MainFooter from "@/components/Shared/MainFooter";
import FooterCard from "@/components/Shared/FooterCard";
import { AuthProvider } from "@/src/auth/AuthProvider";
import { AccountProvider } from "@/src/account/AccountProvider";
import { OnlineSettingsProvider } from "@/src/settings/OnlineSettingsProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SmartBet | Better Odds, Bigger Wins.",
  description: "Designed by William Ssenyondo - +256779610327, sseywilliam@hotmail.com",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <AccountProvider>
            <OnlineSettingsProvider>
              <main>
                {children}
                <FooterCard />
                <MainFooter />
              </main>
            </OnlineSettingsProvider>
          </AccountProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
