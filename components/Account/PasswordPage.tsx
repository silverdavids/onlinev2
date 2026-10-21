"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useAuth } from "@/src/auth/useAuth";
import { authApi } from "@/src/api/authApi";
import { apiClient } from "@/src/api/apiClient";
import { normalizeApiError } from "@/src/api/apiError";

type Mode = "change" | "forgot" | "reset" | "verify";
export default function PasswordPage({ mode }: { mode: Mode }) {
  const { user } = useAuth();
  const [phone, setPhone] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState({ success: false, message: "" });
  const sendCode = mode === "forgot" && !codeSent;
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setFeedback({ success: false, message: "" });
    if (!sendCode && password !== confirm) { setFeedback({ success: false, message: "Passwords do not match." }); return; }
    setBusy(true);
    try {
      if (sendCode) {
        const response = await apiClient.get("/Account/GetOTP", { params: { phoneNumber: phone.trim() } });
        if (response.data === false || response.data?.success === false) throw new Error(response.data?.message || "Could not send a verification code.");
        setCodeSent(true);
        setFeedback({ success: true, message: "Check your phone for a verification code, then enter it below." });
      } else if (mode === "change") {
        const ok = await authApi.changePassword({ UserName: user?.username ?? "", OldPassword: oldPassword, NewPassword: password, ConfirmPassword: confirm });
        if (!ok) throw new Error("Password change failed. Check your current password.");
        setFeedback({ success: true, message: "Password changed successfully." });
        setPassword(""); setConfirm(""); setOldPassword("");
      } else {
        const result = await authApi.verifyOtpAndSetPassword({ PhoneNumber: phone.trim(), OtpCode: code.trim(), NewPassword: password, ConfirmPassword: confirm });
        if (!result.success) throw new Error(result.message || "Verification failed.");
        setFeedback({ success: true, message: result.message || "Password saved. You can now log in." });
        setPassword(""); setConfirm(""); setCode("");
      }
    } catch (error) { setFeedback({ success: false, message: normalizeApiError(error).message }); }
    finally { setBusy(false); }
  };
  return (
    <div className="smartbet-panel smartbet-form-panel">
      {feedback.message && <p className={`smartbet-feedback${feedback.success ? " is-success" : ""}`} role={feedback.success ? "status" : "alert"}>{feedback.message}</p>}
      <form className="smartbet-form" onSubmit={submit}>
        <fieldset disabled={busy}>
          {mode !== "change" && <label>Registered phone number<input type="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} required /></label>}
          {mode === "change" && <label>Current password<input type="password" autoComplete="current-password" value={oldPassword} onChange={(event) => setOldPassword(event.target.value)} required /></label>}
          {!sendCode && <>
            {mode !== "change" && <label>Verification code<input inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} required /></label>}
            <label>New password<input type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
            <label>Confirm new password<input type="password" autoComplete="new-password" value={confirm} onChange={(event) => setConfirm(event.target.value)} required /></label>
          </>}
          <button className="smartbet-button" type="submit">{busy ? "Please wait..." : sendCode ? "Send verification code" : mode === "verify" ? "Verify and set password" : "Save password"}</button>
        </fieldset>
      </form>
      <div className="smartbet-actions"><Link href="/login">Back to login</Link>{mode === "reset" && <Link href="/forgot-password">Request a new code</Link>}</div>
    </div>
  );
}
