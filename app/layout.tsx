import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Suspense } from "react";
import "@/public/scss/style.scss";
import MainFooter from "@/components/Shared/MainFooter";
import FooterCard from "@/components/Shared/FooterCard";
import SportsbookShell from "@/components/Shared/SportsbookShell";
import { AuthProvider } from "@/src/auth/AuthProvider";
import { AccountProvider } from "@/src/account/AccountProvider";
import { OnlineSettingsProvider } from "@/src/settings/OnlineSettingsProvider";
import { ActiveMatchesProvider } from "@/src/matches/ActiveMatchesProvider";
import { PrematchBetslipProvider } from "@/src/betslip/PrematchBetslipProvider";

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
              <ActiveMatchesProvider>
                <PrematchBetslipProvider>
                  <main className="sportsbook-app">
                    <SportsbookShell betslip={<FooterCard />}>
                      <Suspense fallback={null}>{children}</Suspense>
                      <MainFooter />
                    </SportsbookShell>
                  </main>
                </PrematchBetslipProvider>
              </ActiveMatchesProvider>
            </OnlineSettingsProvider>
          </AccountProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
