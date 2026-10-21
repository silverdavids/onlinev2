"use client";

import Link from "next/link";
import { useAuth } from "@/src/auth/useAuth";
import { useAccount } from "@/src/account/useAccount";
import { formatUgx } from "@/src/account/formatCurrency";

export default function ProfilePage() {
  const { user } = useAuth();
  const { account, balance, accountError, isLoadingAccount, refreshAccount } = useAccount();
  return (
    <article className="smartbet-panel">
      <div className="smartbet-panel__heading"><h2>Account details</h2><button type="button" disabled={isLoadingAccount} onClick={() => void refreshAccount().catch(() => undefined)}>{isLoadingAccount ? "Refreshing..." : "Refresh"}</button></div>
      {accountError && <p className="smartbet-feedback" role="alert">{accountError}</p>}
      <dl className="smartbet-detail-grid">
        <div><dt>Username</dt><dd>{user?.username ?? "Unavailable"}</dd></div>
        <div><dt>Phone number</dt><dd>{account?.phoneNumber ?? user?.phone ?? "Unavailable"}</dd></div>
        <div><dt>Account ID</dt><dd>{account?.accountId ?? "Unavailable"}</dd></div>
        <div><dt>Balance</dt><dd>{typeof balance === "number" ? formatUgx(balance) : "Unavailable"}</dd></div>
      </dl>
      <div className="smartbet-actions"><Link href="/change-password" className="smartbet-button">Change password</Link><Link href="/contact">Contact support to update your details</Link></div>
    </article>
  );
}
