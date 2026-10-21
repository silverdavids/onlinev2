"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { apiClient } from "@/src/api/apiClient";
import { normalizeApiError } from "@/src/api/apiError";
import { useAccount } from "@/src/account/useAccount";

type DepositStatus = { status?: number; Status?: number; label?: string; Label?: string; amount?: number; Amount?: number };

export default function MobileDepositPage() {
  const params = useSearchParams();
  const router = useRouter();
  const { refreshAccount } = useAccount();
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("10000");
  const [promo, setPromo] = useState("");
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState(params.get("code") || "");
  const [status, setStatus] = useState<DepositStatus | null>(null);
  const [error, setError] = useState("");
  const [statusError, setStatusError] = useState("");
  const [checkVersion, setCheckVersion] = useState(0);
  useEffect(() => {
    if (!code) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    let attempts = 0;
    const check = async () => {
      try {
        const response = await apiClient.get<DepositStatus>(`/Online/DepositStatus/${encodeURIComponent(code)}`, { signal: controller.signal });
        if (controller.signal.aborted) return;
        setStatus(response.data);
        setStatusError("");
        const value = response.data.status ?? response.data.Status;
        if (value === 2) { await refreshAccount().catch(() => undefined); return; }
        if (value === -1) return;
        if (++attempts < 24) timer = setTimeout(check, 5000);
      } catch (err) { if (!controller.signal.aborted) setStatusError(normalizeApiError(err).message); }
    };
    void check();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [code, checkVersion, refreshAccount]);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy || code) return;
    const value = Number(amount);
    if (!Number.isFinite(value) || value < 1000) { setError("Minimum deposit is UGX 1,000."); return; }
    setBusy(true); setError("");
    try {
      const response = await apiClient.post<{ code?: string; Code?: string }>("/Online/MobileMoneyDepositRequest", { amount: value, phoneNumber: phone.trim(), PromoCode: promo.trim().toUpperCase() || null }, { timeout: 65000 });
      const depositCode = response.data?.code ?? response.data?.Code;
      if (!depositCode) throw new Error("The request did not return a deposit reference. Check your account statement before trying again.");
      setCode(depositCode);
      router.replace(`/deposit/mobile-money?code=${encodeURIComponent(depositCode)}`, { scroll: false });
    } catch (err) { setError(normalizeApiError(err).message); }
    finally { setBusy(false); }
  };
  const result = status?.status ?? status?.Status;
  return <div className="smartbet-panel smartbet-form-panel"><h2>MTN Mobile Money / Airtel Money</h2>
    {error && <p className="smartbet-feedback" role="alert">{error}</p>}
    {code ? <>
      <p className={`smartbet-feedback${result === 2 ? " is-success" : ""}`} role="status">{result === 2 ? "Deposit completed." : result === -1 ? "Deposit failed. Your wallet has not been credited by this request." : "Deposit requested. Approve the payment prompt on your phone and wait for confirmation."}</p>
      <dl className="smartbet-detail-grid"><div><dt>Reference</dt><dd>{code}</dd></div><div><dt>Status</dt><dd>{status?.label ?? status?.Label ?? "Checking..."}</dd></div></dl>
      {statusError && <p className="smartbet-feedback" role="alert">Could not check status: {statusError}</p>}
      <div className="smartbet-actions"><button type="button" onClick={() => setCheckVersion((value) => value + 1)}>Check status</button><Link href="/transactions">View account statement</Link>{(result === 2 || result === -1) && <button type="button" onClick={() => { setCode(""); setStatus(null); router.replace("/deposit/mobile-money"); }}>New deposit</button>}</div>
    </> : <form className="smartbet-form" onSubmit={submit}><fieldset disabled={busy}><label>Mobile money phone number<input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} autoComplete="tel" required /></label><label>Amount (UGX)<input type="number" min="1000" step="1" value={amount} onChange={(event) => setAmount(event.target.value)} required /></label><div className="smartbet-actions">{[5000, 10000, 20000, 50000].map((value) => <button type="button" key={value} onClick={() => setAmount(String(value))}>{value.toLocaleString("en-UG")}</button>)}</div><label>Promo code (optional)<input value={promo} onChange={(event) => setPromo(event.target.value)} /></label><button className="smartbet-button" type="submit">{busy ? "Requesting payment..." : "Request deposit"}</button><small>You will receive a prompt on your phone to approve the payment.</small></fieldset></form>}
    <Link href="/deposit?method=shop">Deposit using a branch code</Link>
  </div>;
}
