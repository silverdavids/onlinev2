export const RECOVERY_PURPOSE = "password-reset";
export const OTP_LIFETIME_MS = 5 * 60_000;
export const RESEND_COOLDOWN_MS = 60_000;

export function normalizeRecoveryPhone(input: string): string | null {
  if (input.length > 32 || /[^0-9+ ()-]/.test(input)) return null;
  let digits = input.trim().replace(/[ ()-]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);
  if (/^07\d{8}$/.test(digits)) digits = `256${digits.slice(1)}`;
  if (/^7\d{8}$/.test(digits)) digits = `256${digits}`;
  return /^2567\d{8}$/.test(digits) ? `+${digits}` : null;
}

export interface RecoveryState {
  stage: "phone" | "reset" | "success";
  phone: string;
  busy: boolean;
  expiresAt: number;
  cooldownUntil: number;
  error: string;
}
export const initialRecoveryState: RecoveryState = {
  stage: "phone",
  phone: "",
  busy: false,
  expiresAt: 0,
  cooldownUntil: 0,
  error: "",
};
interface RecoveryApi {
  getOtp(phone: string): Promise<boolean>;
  verifyOtpAndSetPassword(payload: {
    phoneNumber: string;
    otpCode: string;
    newPassword: string;
    confirmPassword: string;
  }): Promise<{ success: boolean }>;
}
function failureMessage(error: unknown): string {
  const status = error && typeof error === "object" && "status" in error ? error.status : undefined;
  switch (status) {
    case 400:
      return "Check your phone number, code and password requirements.";
    case 403:
      return "This password reset request is not authorized.";
    case 417:
      return "The reset code is invalid or expired. Check it or request another code.";
    case 429:
      return "Too many requests. Wait before trying again; an hourly limit may also apply.";
    case 502:
    case 503:
    case 504:
      return "Password recovery is temporarily unavailable. Wait before requesting another code.";
    default:
      return "The request could not be confirmed. Please try again.";
  }
}

function retryDeadline(error: unknown, now: number): number {
  const delay =
    error && typeof error === "object" && "retryAfterMs" in error ? error.retryAfterMs : undefined;
  return typeof delay === "number" && Number.isSafeInteger(delay) && delay > 0 ? now + delay : 0;
}

/** Shared UI state machine. No secrets are stored, logged or persisted here. */
export function createRecoveryFlow(options: {
  api: RecoveryApi;
  onChange: (state: RecoveryState) => void;
  now?: () => number;
}) {
  let state = { ...initialRecoveryState };
  let revision = 0;
  const now = options.now ?? Date.now;
  const publish = (patch: Partial<RecoveryState>) => {
    state = { ...state, ...patch };
    options.onChange(state);
  };
  return {
    snapshot: () => state,
    cancel: () => {
      revision++;
    },
    async request(rawPhone: string) {
      if (state.busy || state.stage === "success") return;
      const phone = normalizeRecoveryPhone(rawPhone);
      if (!phone) {
        publish({ error: "Enter a registered Ugandan mobile number, for example 0772 000 000." });
        return;
      }
      if (now() < state.cooldownUntil) {
        publish({ error: "Wait for the resend countdown before requesting another code." });
        return;
      }
      const attempt = ++revision;
      const started = now();
      // A resend can leave the previous proof unusable even if the response is lost.
      publish({
        phone,
        busy: true,
        error: "",
        expiresAt: 0,
      });
      try {
        const accepted = await options.api.getOtp(phone);
        if (attempt !== revision) return;
        if (accepted !== true) throw new Error("Unconfirmed request");
        publish({
          stage: "reset",
          expiresAt: started + OTP_LIFETIME_MS,
          cooldownUntil: started + RESEND_COOLDOWN_MS,
        });
      } catch (error) {
        if (attempt === revision) {
          publish({ error: failureMessage(error), cooldownUntil: retryDeadline(error, now()) });
        }
      } finally {
        if (attempt === revision) publish({ busy: false });
      }
    },
    async complete(code: string, password: string, confirmation: string) {
      if (state.busy || state.stage !== "reset") return;
      if (now() >= state.expiresAt) {
        publish({ error: "The reset code has expired. Request another code." });
        return;
      }
      if (!/^\d{6}$/.test(code)) {
        publish({ error: "Enter the six-digit reset code." });
        return;
      }
      if (password.length < 8 || password.length > 128) {
        publish({ error: "Use a password containing 8 to 128 characters." });
        return;
      }
      if (password !== confirmation) {
        publish({ error: "Passwords do not match." });
        return;
      }
      const attempt = ++revision;
      publish({ busy: true, error: "" });
      try {
        const result = await options.api.verifyOtpAndSetPassword({
          phoneNumber: state.phone,
          otpCode: code,
          newPassword: password,
          confirmPassword: confirmation,
        });
        if (attempt !== revision) return;
        if (result?.success !== true) throw new Error("Unconfirmed reset");
        publish({ stage: "success", expiresAt: 0 });
      } catch (error) {
        if (attempt === revision) {
          publish({
            error: failureMessage(error),
            cooldownUntil: Math.max(state.cooldownUntil, retryDeadline(error, now())),
          });
        }
      } finally {
        if (attempt === revision) publish({ busy: false });
      }
    },
  };
}
