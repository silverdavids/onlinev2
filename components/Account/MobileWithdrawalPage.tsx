"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { apiClient } from "@/src/api/apiClient";
import { normalizeApiError } from "@/src/api/apiError";
import { useAuth } from "@/src/auth/useAuth";
import { useAccount } from "@/src/account/useAccount";
import { formatUgx } from "@/src/account/formatCurrency";

type Result = {
  requiresOtp?: boolean;
  successful?: boolean;
  Successful?: boolean;
  success?: boolean;
  message?: string;
  Message?: string;
  otpDestination?: string;
};

export default function MobileWithdrawalPage() {
  const params = useSearchParams();
  const method = params.get("method") === "mtn" ? "MTN Mobile Money" : "Airtel Money";
  const { user } = useAuth();
  const { account, balance, refreshAccount } = useAccount();
  const [amount, setAmount] = useState("");
  const [altPhone, setAltPhone] = useState("");
  const [alternate, setAlternate] = useState(false);
  const [pending, setPending] = useState<{ amount: number; altPhone?: string } | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState({ success: false, message: "" });
  const phone = account?.phoneNumber ?? user?.phone ?? "Unavailable";
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    const value = Number(amount);
    if (!pending && (!Number.isFinite(value) || value < 1000 || value > 50000)) { setFeedback({ success: false, message: "Enter an amount from UGX 1,000 to UGX 50,000." }); return; }
    if (!pending && typeof balance === "number" && value > balance) { setFeedback({ success: false, message: "Amount exceeds your current balance." }); return; }
    const request = pending ? { ...pending, otpCode: code.trim() } : { amount: value, ...(alternate ? { altPhone: altPhone.trim() } : {}) };
    setBusy(true);
    setFeedback({ success: false, message: "" });
    try {
      const response = await apiClient.post<Result>("/Online/WithdrawRequest", request);
      const result = response.data;
      if (result?.successful === false || result?.Successful === false || result?.success === false) throw new Error(result.message || result.Message || "Withdrawal request failed.");
      if (result?.requiresOtp || response.status === 202 && !pending) {
        setPending({ amount: value, ...(alternate ? { altPhone: altPhone.trim() } : {}) });
        setFeedback({ success: true, message: result?.message || `Enter the verification code sent to ${result?.otpDestination || "your registered phone"}.` });
      } else {
        setFeedback({ success: true, message: result?.message || result?.Message || "Withdrawal request submitted." });
        setAmount(""); setCode(""); setPending(null);
        await refreshAccount().catch(() => undefined);
      }
    } catch (error) { setFeedback({ success: false, message: normalizeApiError(error).message }); }
    finally { setBusy(false); }
  };
  return <div className="smartbet-panel smartbet-form-panel"><h2>{method}</h2><p>Available balance: {typeof balance === "number" ? formatUgx(balance) : "Unavailable"}</p>
    {feedback.message && <p className={`smartbet-feedback${feedback.success ? " is-success" : ""}`} role={feedback.success ? "status" : "alert"}>{feedback.message}</p>}
    <form className="smartbet-form" onSubmit={submit}><fieldset disabled={busy}>
      {!pending ? <><label>Amount (UGX)<input type="number" min="1000" max="50000" step="1" value={amount} onChange={(event) => setAmount(event.target.value)} required /></label><p>Registered phone: {phone}</p><label className="smartbet-checkbox"><input type="checkbox" checked={alternate} onChange={(event) => setAlternate(event.target.checked)} />Withdraw to another number</label>{alternate && <label>Destination phone number<input type="tel" value={altPhone} onChange={(event) => setAltPhone(event.target.value)} required /><small>A verification code will be sent to your registered phone.</small></label>}</> : <label>Verification code<input inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} required /></label>}
      <button className="smartbet-button" type="submit">{busy ? "Submitting..." : pending ? "Verify withdrawal" : "Request withdrawal"}</button>
      {pending && <button type="button" onClick={() => { setPending(null); setCode(""); setFeedback({ success: false, message: "" }); }}>Cancel verification</button>}
    </fieldset></form><Link href="/transactions">View account statement</Link>
  </div>;
}
