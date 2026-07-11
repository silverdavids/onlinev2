"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/src/auth/useAuth";

const buildReturnUrl = (pathname: string) => {
  const safePath = pathname.startsWith("/") ? pathname : "/";
  return encodeURIComponent(safePath);
};

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoadingSession, sessionChecked } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!sessionChecked || isLoadingSession || isAuthenticated) return;
    router.replace(`/login?returnUrl=${buildReturnUrl(pathname)}`);
  }, [isAuthenticated, isLoadingSession, pathname, router, sessionChecked]);

  if (!sessionChecked || isLoadingSession) {
    return (
      <section className="login_section pt-120 p3-bg">
        <div className="container py-12">
          <div className="alert alert-info mb-0" role="status">
            Checking your session...
          </div>
        </div>
      </section>
    );
  }

  if (!isAuthenticated) {
    return (
      <section className="login_section pt-120 p3-bg">
        <div className="container py-12">
          <div className="alert alert-warning mb-0" role="status">
            Redirecting to login...
          </div>
        </div>
      </section>
    );
  }

  return <>{children}</>;
};
