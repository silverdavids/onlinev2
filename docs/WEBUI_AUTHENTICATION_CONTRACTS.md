# WebUI Authentication Contracts

Issue: GitHub Issue #12A, Authentication Contracts

Created: 2026-07-11

## Authority

Confirmed source of truth: `C:\Users\hp\source\repos\Bet\Bet\WebUI`

`BetSoftware.WebCore` is not operational and is not used as an authority for routes, DTOs, authentication, or behavior.

Older frontend reference: `C:\Users\hp\source\repos\thebet-online (2)\thebet-online`

New UI files reviewed for compatibility only:

- `src/api/authApi.ts`
- `src/types/backendDtos.ts`
- `src/adapters/authAdapters.ts`
- `src/api/apiError.ts`
- `docs/API_FOUNDATION.md`

## Confirmed Endpoints

All `ApiAccountController` routes are under `[RoutePrefix("api/Account")]`; see `C:\Users\hp\source\repos\Bet\Bet\WebUI\Controllers\Api\ApiAccountController.cs:28-30`.

| Operation | Method | Relative route passed by frontend | WebUI route | Controller/action |
| --- | --- | --- | --- | --- |
| Login | POST | `/Account/Login` | `/api/Account/Login` | `ApiAccountController.Login`, `ApiAccountController.cs:123-159` |
| CheckLogin | GET | `/Account/CheckLogin` | `/api/Account/CheckLogin` | `ApiAccountController.CheckLogin`, `ApiAccountController.cs:55-120` |
| Logout | POST | `/Account/LogOff` | `/api/Account/LogOff` | `ApiAccountController.LogOff`, `ApiAccountController.cs:185-190` |
| Register | POST | `/Account/Register` | `/api/Account/Register` | `ApiAccountController.Register`, `ApiAccountController.cs:242-313` |
| CheckPhone | GET | `/Account/CheckPhone` | `/api/Account/CheckPhone` | `ApiAccountController.CheckPhone`, `ApiAccountController.cs:160-170` |
| CheckUsername | GET | `/Account/CheckUsername` | `/api/Account/CheckUsername` | `ApiAccountController.CheckUsername`, `ApiAccountController.cs:172-181` |
| CheckEmail | GET | `/Account/CheckEmail` | `/api/Account/CheckEmail` | `ApiAccountController.CheckEmail`, `ApiAccountController.cs:390-396` |
| GetOTP | GET | `/Account/GetOTP` | `/api/Account/GetOTP` | `ApiAccountController.GetOtp`, `ApiAccountController.cs:482-505` |
| validate-otp | POST | `/Account/validate-otp` | `/api/Account/validate-otp` | `ApiAccountController.ValidateOtp`, `ApiAccountController.cs:452-464` |
| VerifyOtpAndSetPassword | POST | `/Account/VerifyOtpAndSetPassword` | `/api/Account/VerifyOtpAndSetPassword` | `ApiAccountController.VerifyOtpAndSetPassword`, `ApiAccountController.cs:398-449` |
| ChangePassWord | POST | `/Account/ChangePassWord` | `/api/Account/ChangePassWord` | `ApiAccountController.ChangePassWord`, `ApiAccountController.cs:466-472` |
| SetNewPassWord | POST | `/Account/SetNewPassWord` | `/api/Account/SetNewPassWord` | `ApiAccountController.ResetPassWord`, `ApiAccountController.cs:474-480` |

## Login Contract

Confirmed route and method: `POST /api/Account/Login`.

Confirmed action: `ApiAccountController.Login(LoginViewModel model)`, `ApiAccountController.cs:123-159`.

Request DTO: `LoginViewModel`, `C:\Users\hp\source\repos\Bet\Bet\BetSoftware.Domain\Models\ViewModels\AccountViewModels.cs:49-61`.

| Field | Type | Required | Casing | Default |
| --- | --- | --- | --- | --- |
| `UserName` | string | yes, `[Required]` | PascalCase in WebUI model | none |
| `Password` | string | yes, `[Required]` | PascalCase in WebUI model | none |
| `RememberMe` | bool | no explicit `[Required]` | PascalCase in WebUI model | .NET bool default `false` if omitted |

ASP.NET Web API model binding is case-insensitive in normal JSON binding. The older frontend sends `{ username, password, rememberMe }`; see `C:\Users\hp\source\repos\thebet-online (2)\thebet-online\src\api\index.js:183-184`.

Accepted identifier behavior:

- Phone identifiers are normalized through `PhoneUtil.NormalizeUg`; see `IAuthenticationService.cs:151-185` and `PhoneUtil.cs:11-38`.
- Phone lookup checks `PhoneNumber` and `UserName` using `+2567...`, `2567...`, and `07...` forms; see `IAuthenticationService.cs:157-185`.
- If phone lookup fails, exact username lookup is used; see `IAuthenticationService.cs:189-193`.
- Email login is not confirmed. Email is not searched in `ValidateLoginAsync`; see `IAuthenticationService.cs:146-229`.

RememberMe behavior:

- API login passes `model.RememberMe` into `_authenticationService.SignInAsync`; see `ApiAccountController.cs:151`.
- `SignInAsync` sets `AuthenticationProperties { IsPersistent = isPersistent }`; see `IAuthenticationService.cs:71-76`.

Success response:

```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "Id": "string",
    "UserName": "submitted identifier",
    "Email": "string or null"
  }
}
```

Source: `ApiAccountController.cs:153-158`.

Failure responses:

| Condition | Status | Body | Source |
| --- | --- | --- | --- |
| Invalid model | 400 | `{ success: false, message: "Invalid input", errors: [...] }` | `ApiAccountController.cs:128-136` |
| Missing username/password | 400 | `{ success: false, message: "Username/phone and password are required." }` | `IAuthenticationService.cs:146-149`, returned by `ApiAccountController.cs:139-141` |
| Unknown user | 400 | `{ success: false, message: "Invalid login credentials." }` | `IAuthenticationService.cs:195-197` |
| Wrong password | 400 | `{ success: false, message: "Invalid login credentials." }` | `IAuthenticationService.cs:206-218` |
| Locked account | 400 | `{ success: false, message: "This account is locked." }` | `IAuthenticationService.cs:198-215` |
| User not in OnlineClient role | 403 | `{ success: false, message: "Your account is not enabled for online access." }` | `ApiAccountController.cs:143-150` |

Inactive account behavior: `ApplicationUser.IsActivated` exists; see `ApplicationUser.cs:92`. No `IsActivated` check is present in API login or `ValidateLoginAsync`; see `ApiAccountController.cs:123-159` and `IAuthenticationService.cs:146-229`.

Cookie issuance timing:

- Cookie is issued only after successful validation and OnlineClient role check; see `ApiAccountController.cs:139-152`.
- Cookie creation happens in `_authenticationService.SignInAsync`; see `IAuthenticationService.cs:71-76`.

Confirmed risk before UI wiring:

- MVC login rotates `SessionVersion` when missing before cookie creation; see `AccountController.cs:111-121`.
- API login does not rotate `SessionVersion`; see `ApiAccountController.cs:139-152`.
- Cookie validation rejects missing database `SessionVersion`, missing cookie `sid`, or mismatched values; see `Startup.Auth.cs:50-72`.
- Because `ApplicationUser.GenerateUserIdentityAsync` only adds `sid` when `SessionVersion` is non-empty, API login can issue a cookie without `sid` for users with no `SessionVersion`; see `ApplicationUser.cs:13-20`.
## Known Risks

### SessionVersion initialization

Observation:
MVC login initializes SessionVersion if missing.
API login may not.

Impact:
If API login does not initialize SessionVersion,
subsequent authenticated requests may fail SessionVersion validation.

Status:
Requires runtime verification during Authentication UI integration.

## CheckLogin Contract

Confirmed route and method: `GET /api/Account/CheckLogin`.

Action: `ApiAccountController.CheckLogin(bool strict401 = false, CancellationToken ct = default)`, `ApiAccountController.cs:55-120`.

Authentication attributes: `[AllowAnonymous]`; see `ApiAccountController.cs:55-58`.

Unauthenticated behavior:

- Default `strict401=false`: returns HTTP 204 No Content with no body; see `ApiAccountController.cs:63-72`.
- If `strict401=true`: returns HTTP 401 Unauthorized; see `ApiAccountController.cs:65-66`.

Authenticated behavior:

```json
{
  "authenticated": true,
  "user": {
    "id": "string",
    "username": "string",
    "email": "string or null",
    "phone": "string or null"
  },
  "roles": ["..."]
}
```

Source: `ApiAccountController.cs:108-119`.

Authenticated but not OnlineClient:

```json
{
  "authenticated": false,
  "reason": "not_in_online_role",
  "user": null,
  "roles": ["..."]
}
```

Source: `ApiAccountController.cs:88-105`.

Cookie/session validation:

- Web API is configured to use `DefaultAuthenticationTypes.ApplicationCookie`; see `WebApiConfig.cs:17-19`.
- OWIN cookie validation checks cookie `sid` against `ApplicationUser.SessionVersion`; see `Startup.Auth.cs:50-72`.
- Validation also refreshes Redis `online_users:{username}` last-seen state when Redis is connected; see `Startup.Auth.cs:73-89`.
- Built-in security stamp validation runs every 10 minutes; see `Startup.Auth.cs:96-101`.
- `CheckLogin` itself does not rotate `SessionVersion`; it reads the already-validated principal and role/user data; see `ApiAccountController.cs:60-119`.

Older frontend mapping:

- API wrapper: `revalidateLogin`, `src\api\index.js:188-204`.
- It accepts status `200`, `204`, and `401`, and maps `authenticated`, `isAuthenticated`, `loggedIn`, or boolean `true`; see `src\api\index.js:190-199`.

## Logout Contract

Confirmed route and method: `POST /api/Account/LogOff`.

Action: `ApiAccountController.LogOff()`, `ApiAccountController.cs:185-190`.

Request body: none required.

Anti-forgery: no `[ValidateAntiForgeryToken]` attribute is present on the Web API action; see `ApiAccountController.cs:185-190`.

Authentication: controller-level `[Authorize(Roles = Roles.OnlineClient)]` applies because `LogOff` is not `[AllowAnonymous]`; see `ApiAccountController.cs:28` and `ApiAccountController.cs:185-190`.

Server-side effects:

- Calls `_authenticationService.SignOut(User.Identity.GetUserName())`; see `ApiAccountController.cs:189`.
- Signs out `DefaultAuthenticationTypes.ApplicationCookie`; see `IAuthenticationService.cs:116-119`.
- Deletes Redis `online_users:{username}` when username is present; see `IAuthenticationService.cs:120-124`.
- Clears `HttpContext.Current.User`; see `IAuthenticationService.cs:126-127`.

Response: HTTP 200 OK with empty body; see `ApiAccountController.cs:189-190`.

Older frontend mapping:

- API wrapper: `logOff`, `src\api\index.js:186`.
- UI usage: `AuthenticatedUserFooter.js:18-34`.

## Registration Contract

Confirmed route and method: `POST /api/Account/Register`.

Action: `ApiAccountController.Register(RegisterOnlineViewModel model, CancellationToken ct)`, `ApiAccountController.cs:242-313`.

Request DTO: `RegisterOnlineViewModel`, `AccountViewModels.cs:63-83` and `AccountViewModels.cs:119-123`.

| Field | Type | Required by model | Required by action/service | Notes |
| --- | --- | --- | --- | --- |
| `PhoneNumber` | string | yes | yes | Normalized by `PhoneUtil.NormalizeUg`; see `ApiAccountController.cs:258-260` |
| `UserName` | string | no model attribute | yes in action | Action rejects blank username; see `ApiAccountController.cs:254-256` |
| `Email` | string | optional, `[EmailAddress]` | optional | Missing email gets generated fallback; see `ApiAccountController.cs:265-273` |
| `Password` | string | optional | server-generated | API overwrites with strong temporary password; see `ApiAccountController.cs:262-263` |
| `FirstName` | string | optional | no confirmed persistence in API path | Used only to build fallback email in controller; see `ApiAccountController.cs:265-273` |
| `SurName` | string | optional | no confirmed persistence in API path | Used only to build fallback email in controller; see `ApiAccountController.cs:265-273` |
| `NIN` | string | optional | no confirmed persistence in API path | Base DTO contains it; see `AccountViewModels.cs:81-83` |
| `DOB` | string | optional | no confirmed persistence in API path | Base DTO contains it; see `AccountViewModels.cs:81-83` |
| `PromoCode` | n/a | unsupported | unsupported | Not present on `RegisterOnlineViewModel`; promo code is only on `RegisterUserViewModel`, see `AccountViewModels.cs:86-110` |
| Terms acceptance | n/a | unsupported | unsupported | No WebUI API registration field confirmed |

Phone normalization:

- `PhoneUtil.NormalizeUg` accepts `+2567XXXXXXXX`, `2567XXXXXXXX`, `07XXXXXXXX`, and `7XXXXXXXXX`; see `PhoneUtil.cs:11-38`.

Username rules:

- Action requires non-empty `UserName`; see `ApiAccountController.cs:254-256`.
- Registration service trims username and uses phone only if username is blank, but action prevents blank username first; see `RegistrationService.cs:25-27`.
- Duplicate username check is exact `UserName == uname`; see `RegistrationService.cs:121-130`.
- Identity user validator allows non-alphanumeric usernames and requires unique email; see `IdentityConfig.cs:132-136`.

Password rules:

- Registration API ignores any client password and generates a 12-character temporary password with upper/lower/digit/special; see `ApiAccountController.cs:262-263` and `ApiAccountController.cs:512-538`.
- UserManager password policy for later password set/change requires length 5 and does not require digit, lowercase, uppercase, or symbol; see `IdentityConfig.cs:138-145`.

Success response:

```json
{
  "success": true,
  "message": "Registration successful. OTP sent to your phone.",
  "expiresAt": "UTC date string"
}
```

Source: `ApiAccountController.cs:306-312`.

Registration does not sign the user in automatically. It creates the user, issues OTP, and returns success; see `ApiAccountController.cs:275-312`.

Duplicate and validation responses:

| Condition | Status | Body/source |
| --- | --- | --- |
| Missing payload | 400 | `{ success: false, message: "Missing payload." }`, `ApiAccountController.cs:247-249` |
| Invalid model | 400 | `{ success: false, message: "Invalid form.", errors: ModelState }`, `ApiAccountController.cs:251-252` |
| Blank username | 400 | `{ success: false, message: "Username is required." }`, `ApiAccountController.cs:254-256` |
| Invalid phone | 400 | `{ success: false, message: "Invalid phone number." }`, `ApiAccountController.cs:258-260` |
| Duplicate phone | 417 | `{ success: false, message: "The phone number is already used by someone else" }`, `RegistrationService.cs:133-141`, returned by `ApiAccountController.cs:275-278` |
| Duplicate username | 417 | `{ success: false, message: "The username is already taken" }`, `RegistrationService.cs:121-130`, returned by `ApiAccountController.cs:275-278` |
| Duplicate email | 417 | `{ success: false, message: "The email address is already used by someone else" }`, `RegistrationService.cs:110-118`, returned by `ApiAccountController.cs:275-278` |
| Online branch missing | 417 | `{ success: false, message: "Online branch not configured." }`, `RegistrationService.cs:49-56`, returned by `ApiAccountController.cs:275-278` |
| OTP send failure | 500 | `{ success: false, message: "Failed to send OTP. Please try again." }`, `ApiAccountController.cs:293-303` |

Older frontend mapping:

- API wrapper sends `{ email, phoneNumber, userName, NIN, dob, FirstName, SurName, PromoCode }`; see `src\api\index.js:259-269`.
- Desktop registration validates username through `/Online/UserExists`, phone through `/Account/CheckPhone`, email through `/Account/CheckEmail`; see `RegistrationForm.js:83-100`, `RegistrationForm.js:118-135`, and `RegistrationForm.js:153-170`.
- Desktop registration submits at `RegistrationForm.js:193-210`.
- Mobile registration validates phone and sends `PromoCode`; see `MobileRegistration.js:67-72` and `MobileRegistration.js:108-124`.

Confirmed mismatch for future UI wiring: older frontend collects/sends `PromoCode`, terms, DOB, NIN, first name, and surname, but WebUI API registration only confirms use of phone, username, email fallback, and generated password. Do not assume registration promo support until WebUI is extended or another confirmed endpoint is identified.

## OTP And Password Flow Contracts

| Operation | WebUI contract | Request | Response | Auth | Older frontend activity |
| --- | --- | --- | --- | --- | --- |
| CheckPhone | GET `/api/Account/CheckPhone?value=...`; `ApiAccountController.cs:160-170` | query `value` string | `400` string `"Missing phone number."` or `200 { available: boolean }` | anonymous | API wrapper `src\api\index.js:166-167`; desktop registration `RegistrationForm.js:118-135`; mobile `MobileRegistration.js:67-72` |
| CheckUsername | GET `/api/Account/CheckUsername?value=...`; `ApiAccountController.cs:172-181` | query `value` string | `400` string `"Missing username."` or `200 { available: boolean }` | anonymous | API wrapper exists at `src\api\index.js:163-164`, but desktop registration uses `/Online/UserExists` instead at `RegistrationForm.js:83-91` |
| CheckEmail | GET `/api/Account/CheckEmail?value=...`; `ApiAccountController.cs:390-396` | query `value` string | `200 { available: boolean }` | anonymous | API wrapper `src\api\index.js:169-170`; desktop registration `RegistrationForm.js:153-170` |
| GetOTP | GET `/api/Account/GetOTP?phoneNumber=...`; `ApiAccountController.cs:482-505` | query `phoneNumber` string | `200 boolean` from `SendOtpStringAsync`, or `400` string exception message | anonymous | API wrapper `src\api\index.js:172-173`; resend after registration `OtpVerifyForm.js:74-80` |
| validate-otp | POST `/api/Account/validate-otp`; `ApiAccountController.cs:452-464` | `{ PhoneNumber, OtpCode }` | `200` string `"OTP is valid."`, `400` ModelState, or `400` string `"Invalid or expired OTP."` | anonymous | API wrapper `src\api\index.js:274-275`; OTP screen `OtpForm.js:20-28` |
| VerifyOtpAndSetPassword | POST `/api/Account/VerifyOtpAndSetPassword`; `ApiAccountController.cs:398-449` | `{ PhoneNumber, OtpCode, NewPassword, ConfirmPassword }` | `200 { success: true, message: "Password has been set successfully." }`; `400` strings; `404`; `417` strings | anonymous | API wrapper `src\api\index.js:271-272`; post-registration flow `OtpVerifyForm.js:19-43` |
| ChangePassWord | POST `/api/Account/ChangePassWord`; `ApiAccountController.cs:466-472` | `{ UserName, OldPassword, NewPassword, ConfirmPassword }` | `200 true` or `200 false` | OnlineClient cookie | Desktop component imports `changePassWord` but no active API wrapper was found in `src\api\index.js`; component payload uses lowercase `username`, see `ChangePassWord.js:23-32` and `ChangePassWord.js:61-99` |
| SetNewPassWord | POST `/api/Account/SetNewPassWord`; `ApiAccountController.cs:474-480` | `{ UserName, NewPassword, ConfirmPassword, Code?, PhoneNumber? }` | `200 { Item1: boolean, Item2: string }` | OnlineClient cookie by controller default | API wrapper `src\api\index.js:206-207`; reset screen checks `Item1`, `ResetPassWord.js:37-49` |

OTP conclusion:

- Registration API creates an account with a temporary password and issues a registration OTP; see `ApiAccountController.cs:262-312`.
- Older desktop flow treats OTP plus password setup as mandatory before sign-in: register, then `VerifyOtpAndSetPassword`, then login; see `RegistrationForm.js:206-210` and `OtpVerifyForm.js:19-43`.
- WebUI login itself does not require OTP. It only checks identifier/password/lockout/role; see `IAuthenticationService.cs:146-229` and `ApiAccountController.cs:139-152`.
- Therefore OTP is mandatory for a new self-registered user to establish their chosen password, but OTP is not part of the login endpoint contract.

## Cookie Authentication Contract

Cookie middleware source: `C:\Users\hp\source\repos\Bet\Bet\WebUI\App_Start\Startup.Auth.cs:17-111`.

| Setting | Confirmed value |
| --- | --- |
| Authentication type | `DefaultAuthenticationTypes.ApplicationCookie`, `Startup.Auth.cs:21-24` |
| Cookie name | `Environment.CookieName`, `Startup.Auth.cs:21-25`; computed as `ClientName + "." + Environment + ".dev when development"`, `Environment.cs:9-13`, `Environment.cs:25-35` |
| Expiration | 30 minutes, `Startup.Auth.cs:25` |
| Sliding expiration | `true`, `Startup.Auth.cs:105` |
| Secure | development: `Never`; non-development: `Always`, `Startup.Auth.cs:27` |
| SameSite | development: `Lax`; non-development: `None`, `Startup.Auth.cs:28` |
| Login path | `/Account/Login`, `Startup.Auth.cs:30` |
| API redirects | API paths do not redirect on auth failure; non-API paths do, `Startup.Auth.cs:33-37` |
| HttpOnly | Not explicitly set in source; OWIN cookie middleware default should be treated as effective server default |
| Domain | Not explicitly set in source; cookie is host scoped by default |
| Path | Not explicitly set in source; OWIN default path applies |

Claims and validation:

- `GenerateUserIdentityAsync` creates an ApplicationCookie identity; see `ApplicationUser.cs:13-17`.
- Adds `sid` claim only when `SessionVersion` is non-empty; see `ApplicationUser.cs:18-20`.
- Adds `IsOnline=true` claim for users in OnlineClient role; see `ApplicationUser.cs:22-24`.
- Cookie validation compares cookie `sid` against database `SessionVersion`; see `Startup.Auth.cs:50-72`.
- Redis heartbeat key is `online_users:{username}`, refreshed during validation and sign-in; see `Startup.Auth.cs:73-89` and `IAuthenticationService.cs:78-89`.
- Sign-out deletes that Redis key; see `IAuthenticationService.cs:116-124`.

Multiple-session invalidation:

- The mechanism exists through `SessionVersion`/`sid`; see `ApplicationUser.cs:105-110` and `Startup.Auth.cs:50-72`.
- API login does not rotate `SessionVersion`; see `ApiAccountController.cs:139-152`.
- MVC login rotates missing `SessionVersion`; see `AccountController.cs:111-121`.
- Existing multi-session blocking through `IsAlreadyOnlineAsync` is implemented but not used by API login; see `IAuthenticationService.cs:361-416` and `ApiAccountController.cs:139-152`.

## CORS And Browser Requirements

Web API CORS:

- `config.EnableCors(new EnableCorsAttribute(Environment.CorsOrigins, "*", "*") { PreflightMaxAge = 86400, SupportsCredentials = true })`; see `WebApiConfig.cs:53-59`.
- `OnlineCorsOrigins` includes `http://localhost:3000`, `https://localhost:3000`, `http://localhost:3001`, `https://localhost:3001`, and `https://smartbet.ug`; see `Web.config:48`.
- CORS origins are trimmed and trailing slashes removed; see `Environment.cs:17-23`.

Preflight handling:

- OPTIONS requests with an `Origin` header get `Access-Control-Allow-Credentials: true`, `Access-Control-Allow-Headers: Accept,Content-Type`, `Access-Control-Allow-Methods: GET,POST`, and reflected `Access-Control-Allow-Origin`; see `Global.asax.cs:28-40`.

Browser implications:

- Frontend requests must use credentials (`withCredentials: true`) for cookie auth. Older frontend does this; see `src\api\index.js:65-69`.
- Production cookies are `Secure` and `SameSite=None`, so production cross-site cookie auth requires HTTPS; see `Startup.Auth.cs:27-28`.
- Development cookies use `Secure=Never` and `SameSite=Lax`, so same-site or proxied localhost flows are easier than true cross-site iframe/subresource flows; see `Startup.Auth.cs:27-28`.
- Mixed content is a risk if an HTTPS Next.js origin calls an HTTP backend; browser cookie and request behavior may fail before reaching WebUI.

## Error Formats

| Case | Status | Body shape |
| --- | --- | --- |
| Login ModelState | 400 | `{ success: false, message: "Invalid input", errors: IEnumerable<string> }`; `ApiAccountController.cs:128-136` |
| Login invalid credentials | 400 | `{ success: false, message: "Invalid login credentials." }`; `IAuthenticationService.cs:195-218` |
| Login locked | 400 | `{ success: false, message: "This account is locked." }`; `IAuthenticationService.cs:198-215` |
| Login non-online role | 403 | `{ success: false, message: "Your account is not enabled for online access." }`; `ApiAccountController.cs:143-150` |
| CheckLogin unauthenticated default | 204 | empty body; `ApiAccountController.cs:63-72` |
| CheckLogin strict unauthenticated | 401 | default Unauthorized body; `ApiAccountController.cs:65-66` |
| Registration ModelState | 400 | `{ success: false, message: "Invalid form.", errors: ModelState }`; `ApiAccountController.cs:251-252` |
| Registration duplicate or service failure | 417 | `{ success: false, message: string }`; `ApiAccountController.cs:275-278` |
| Registration OTP send failure | 500 | `{ success: false, message: "Failed to send OTP. Please try again." }`; `ApiAccountController.cs:293-303` |
| VerifyOtpAndSetPassword invalid input | 400 | string `"Invalid input"`; `ApiAccountController.cs:403-407` |
| VerifyOtpAndSetPassword password mismatch | 400 | string `"Passwords do not match."`; `ApiAccountController.cs:409-412` |
| VerifyOtpAndSetPassword invalid/expired OTP | 417 | string `"OTP is invalid or expired."`; `ApiAccountController.cs:414-418` |
| VerifyOtpAndSetPassword incorrect OTP | 417 | string `"Incorrect OTP."`; `ApiAccountController.cs:420-423` |
| validate-otp invalid/expired | 400 | string `"Invalid or expired OTP."`; `ApiAccountController.cs:459-464` |
| SetNewPassWord | 200 | `{ Item1: boolean, Item2: string }`; `ApiAccountController.cs:474-480` |
| ChangePassWord | 200 | boolean; `ApiAccountController.cs:466-472` |

## New UI Readiness Review

No UI wiring was performed.

Issue #11 compatibility status:

- `authApi.login` uses `UserName`, `Password`, `RememberMe`, matching `LoginViewModel`.
- `authApi.checkLogin` accepts `200`, `204`, and `401`, matching WebUI.
- `authApi.register` sends `Email`, `PhoneNumber`, `UserName`, `FirstName`, `SurName`, `NIN`, and `DOB`; this is compatible with WebUI binding, though only some fields are confirmed as used.
- `authApi.register` correctly does not send `PromoCode`.
- `apiError` already supports `ModelState`, `errors` arrays/objects, string bodies through Axios fallback, 401, 403, and 417-class failures.

Corrections required before authentication UI wiring:

- No frontend API foundation code correction is required by Issue #12A.
- Confirm or fix WebUI API login `SessionVersion` handling before relying on API login in the new UI. API login should behave like MVC login by ensuring `SessionVersion` exists before `SignInAsync`, or the deployment data must guarantee every online user already has a `SessionVersion`.
- Do not implement registration promo code in the new UI until WebUI exposes a confirmed registration promo contract.
- Use the registration OTP/password setup flow if implementing self-registration: registration alone does not establish the user's chosen password or sign them in.

## Remaining Unknowns

- Effective cookie `HttpOnly`, domain, and path are not explicitly set in WebUI source; they rely on OWIN defaults.
- The exact deployed `Environment` and transformed `OnlineCorsOrigins` should be verified in deployment configuration without exposing secrets.
- API login behavior for users with null `SessionVersion` must be tested against a running WebUI instance or corrected in WebUI before UI wiring.
- Inactive account handling is not present in API login despite `ApplicationUser.IsActivated` existing.
