import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { smartBetApi } from "@/lib/api-smartbet";
import { createRecoveryFlow, initialRecoveryState } from "@/lib/password-recovery";

export function PasswordRecovery({ onSignIn }: { onSignIn: () => void }) {
  const [state, setState] = useState(initialRecoveryState);
  const [flow] = useState(() =>
    createRecoveryFlow({
      api: smartBetApi,
      onChange: setState,
    }),
  );
  const [hydrated, setHydrated] = useState(false);
  const [now, setNow] = useState(Date.now);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  useEffect(() => {
    setHydrated(true);
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearInterval(timer);
      flow.cancel();
    };
  }, [flow]);
  const cooldown = Math.max(0, Math.ceil((state.cooldownUntil - now) / 1000));
  const expiry = Math.max(0, Math.ceil((state.expiresAt - now) / 1000));
  const requestCode = async () => {
    setCode("");
    setPassword("");
    setConfirmation("");
    await flow.request(state.stage === "phone" ? phone : state.phone);
    setNow(Date.now());
  };
  const leave = () => {
    flow.cancel();
    setCode("");
    setPassword("");
    setConfirmation("");
    onSignIn();
  };

  if (state.stage === "success")
    return (
      <section className="space-y-4 rounded-lg border border-accent bg-accent/10 p-4">
        <h2 className="font-display text-sm font-bold uppercase">Password updated</h2>
        <p role="status" className="text-sm">
          Your password has been reset. Sign in with your new password.
        </p>
        <Button type="button" onClick={leave}>
          Return to sign-in
        </Button>
      </section>
    );
  return (
    <form
      method="post"
      onSubmit={(event) => {
        event.preventDefault();
        if (!hydrated) return;
        if (state.stage === "phone") {
          void requestCode();
          return;
        }
        void flow.complete(code, password, confirmation).then(() => {
          setPassword("");
          setConfirmation("");
        });
      }}
      className="space-y-4 rounded-lg border border-border bg-card p-4"
    >
      <h2 className="font-display text-sm font-bold uppercase">Reset Password</h2>
      {/* SSR disables all fields; POST and unnamed secrets also prevent native GET leakage. */}
      <fieldset disabled={!hydrated || state.busy} className="space-y-4">
        {state.stage === "phone" ? (
          <div className="space-y-1.5">
            <Label htmlFor="recovery-phone">Registered Ugandan phone number</Label>
            <Input
              id="recovery-phone"
              type="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0772 000 000"
              required
            />
          </div>
        ) : (
          <>
            <p role="status" className="text-sm text-muted-foreground">
              Request accepted. If this number is eligible, a reset code should arrive by SMS.
              Receipt is not confirmed.
            </p>
            <p className="text-xs text-muted-foreground">
              {expiry
                ? `Code expires in ${Math.floor(expiry / 60)}:${String(expiry % 60).padStart(2, "0")}.`
                : "Code expired or unavailable. Request another code."}
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="recovery-code">SMS reset code</Label>
              <Input
                id="recovery-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                pattern="[0-9]{6}"
                maxLength={6}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="recovery-password">New password</Label>
              <Input
                id="recovery-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                maxLength={128}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="recovery-confirmation">Confirm new password</Label>
              <Input
                id="recovery-confirmation"
                type="password"
                autoComplete="new-password"
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                minLength={8}
                maxLength={128}
                required
              />
            </div>
            <Button
              type="button"
              variant="outline"
              disabled={cooldown > 0}
              onClick={() => void requestCode()}
            >
              {cooldown ? `Resend available in ${cooldown}s` : "Request another code"}
            </Button>
          </>
        )}
        {state.error && (
          <p role="alert" className="text-sm text-destructive">
            {state.error}
          </p>
        )}
        {state.stage === "phone" && cooldown > 0 && (
          <p role="status" className="text-xs text-muted-foreground">
            Try again in {cooldown}s.
          </p>
        )}
        <Button
          type="submit"
          className="w-full"
          disabled={state.stage === "phone" ? cooldown > 0 : expiry === 0}
        >
          {state.busy
            ? "Please wait..."
            : state.stage === "phone"
              ? "Request SMS reset code"
              : "Set new password"}
        </Button>
      </fieldset>
      <Button type="button" variant="outline" disabled={state.busy} onClick={leave}>
        Back to sign-in
      </Button>
    </form>
  );
}
