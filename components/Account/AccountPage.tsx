import Link from "next/link";
import type { ReactNode } from "react";
import { ProtectedRoute } from "@/src/auth/ProtectedRoute";
import ContentPage from "@/components/Shared/ContentPage";
import { accountLinks } from "@/src/navigation/siteNavigation";

export default function AccountPage({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <ProtectedRoute>
      <ContentPage title={title} description={description}>
        <nav className="smartbet-account-nav" aria-label="Account navigation">
          {accountLinks.map((link) => <Link href={link.href} key={link.href}>{link.label}</Link>)}
        </nav>
        {children}
      </ContentPage>
    </ProtectedRoute>
  );
}
