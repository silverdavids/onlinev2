// Reference app URLs resolve to a single responsive page for each destination.
const aliases: Record<string, string> = {
  register: "/create-acount",
  mobilelogin: "/login",
  mobileregistration: "/create-acount",
  mobileotpverification: "/verify-otp",
  soccerodds: "/soccer",
  "1x2-odds": "/soccer",
  mobiletiles: "/soccer",
  sports: "/soccer",
  live: "/live-betting",
  mobiledeposit: "/deposit",
  mobilebetslip: "/betslip",
  receipt: "/betslip",
  "my-bets": "/tickets",
  bethistory: "/tickets",
  statements: "/transactions",
  "account/bonuses": "/bonuses",
  mobilewithdraw: "/withdraw",
  "mobilewithdraw/branch": "/withdraw/branch",
  "mobilewithdraw/mtn": "/withdraw/mobile-money?method=mtn",
  "mobilewithdraw/airtel": "/withdraw/mobile-money?method=airtel",
  withdrawmm: "/withdraw/mobile-money",
  messages: "/notifications",
  mobileprivacypolicy: "/privacy-policy",
  mobileterms: "/terms",
  mobileresponsiblegaming: "/responsible-gaming",
  mobilegamingrules: "/gaming-rules",
  mobileforgotpassword: "/forgot-password",
  forgotpasswordform: "/forgot-password",
  otpform: "/verify-otp",
  resetpassword: "/reset-password",
  passresetform: "/reset-password",
  changepassword: "/change-password",
  authenticateduserfooter: "/logout",
  aviator: "/aviator",
};

export function resolveLegacyRoute(segments: string[], query: Record<string, string | string[] | undefined> = {}): string | null {
  const path = segments.join("/").toLowerCase();
  let target = Object.prototype.hasOwnProperty.call(aliases, path) ? aliases[path] : undefined;
  if (!target && segments.length === 2) {
    const prefix = segments[0].toLowerCase();
    if (["receipt-details", "mobilebetdetails"].includes(prefix)) target = `/tickets/${encodeURIComponent(segments[1])}`;
    if (["game-details", "eventdetails"].includes(prefix)) target = `/fixture/${encodeURIComponent(segments[1])}`;
    if (prefix === "live-game-details") target = `/live-betting/${encodeURIComponent(segments[1])}`;
  }
  if (!target) return null;
  const [pathname, preset] = target.split("?");
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (Array.isArray(value)) value.forEach((entry) => params.append(key, entry));
    else if (value !== undefined) params.set(key, value);
  }
  new URLSearchParams(preset).forEach((value, key) => params.set(key, value));
  const search = params.toString();
  return pathname + (search ? `?${search}` : "");
}
