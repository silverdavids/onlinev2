# API integration investigation and release 0.1.5

Investigated on 21 October 2026. Changes are local; no image was published and no Swarm service was updated. No real credentials, customer login, registration, SMS/OTP generation, deposits, or bets were submitted.

## Findings from the legacy applications

The relevant sources were available in sibling checkouts. Paths below are relative to `C:/Users/hp/source/repos`; they are not files copied into this repository.

| Evidence | Source | Finding |
| --- | --- | --- |
| MVC5 login | `Bet/Bet/WebUI/Views/Account/Login.cshtml:43`, `Controllers/AccountController.cs:80` | HTML form posts `UserName`, `Password`, `RememberMe` to same-origin `/Account/Login`. The view includes an antiforgery token. This is distinct from the JSON API route. |
| Embedded MVC sportsbook client | `Bet/Bet/WebUI/Scripts/app/src/api/index.js:1` | Relative `/api/...` Axios calls for account information, settings and tickets; matches are fetched separately. |
| Legacy online frontend environment | `thebet-online (2)/thebet-online/src/environment/index.js:19` | Production backend defaults to empty; development defaults to `http://localhost:49191`. Lines 35–43 force an empty backend origin on `smartbet.ug` and its subdomains, overriding remote build settings. |
| Legacy online production build | `thebet-online (2)/thebet-online/.env.production:1`, `Dockerfile:8`, `.gitlab-ci.yml:23` | Checked-in production backend is `https://shop.smbet.net`, not `shop.smartbet.net`. Docker/CI can override it through `backend_url` / `CI_SMBET_BACKEND_URL`; deployed CI variable values are unavailable. |
| Legacy online HTTP client | `thebet-online (2)/thebet-online/src/api/index.js:47` | Constructs `/api` or `<backend>/api`; JSON requests, 20-second timeout, `withCredentials: true`. Separate games service client. |
| Login/session/logout | Same file, lines 183–208 | JSON `POST /api/Account/Login` with `username`, `password`, `rememberMe`; `GET /api/Account/CheckLogin`; `POST /api/Account/LogOff`. Treats 200/204/401 session checks explicitly. No bearer token stored by these paths. |
| Register / OTP / recovery | Same file, lines 172, 211, 259–275 | `GET /api/Account/GetOTP?phoneNumber=...`, `POST /api/Account/Register`, `POST /api/Account/VerifyOtpAndSetPassword`, `/api/Account/validate-otp`; older reset helper also uses `/api/Account/SetNewPassWord`. |
| API contract | `Bet/Bet/WebUI/Controllers/Api/ApiAccountController.cs:59`, `:128`, `:257`, `:435`, `:519` | Matching API routes. Login returns success/message/user, validates OnlineClient role before issuing a cookie. CheckLogin returns authenticated/user/roles or anonymous 204; `strict401` can request 401. JSON binds to PascalCase C# models; v2 already sends these field names. |
| Cookie authentication | `Bet/Bet/WebUI/App_Start/Startup.Auth.cs:17`, `Infrastructure/IAuthenticationService.cs:73`, `Helpers/Environment.cs:13` | OWIN ApplicationCookie, persistent when RememberMe is set. Name derives from ClientName and Environment (plus `.dev` in development). Thirty-minute sliding expiry; validates the `sid` claim against database SessionVersion. Production sets Secure/ SameSite=None; development Never/Lax. The inspected options do not specify CookieDomain or CookiePath. |
| API authorization and CORS | `Bet/Bet/WebUI/App_Start/WebApiConfig.cs:17`, `:62` | API authorization uses the same ApplicationCookie identity. Credentialed CORS reads OnlineCorsOrigins. Cookie middleware suppresses login redirects for `/api`, preserving API status codes. |
| Environment differences | `Bet/Bet/WebUI/Web.config:35`, `:49`, `:53`; `Web.Release.config:22`; `Web.Release.SmBet.Net.config:25` | Base config has ClientName=SMBet, Environment=Development and allows `https://smartbet.ug`. Generic release config also says Development. The named SmBet.Net production transform instead allows `https://smbet.ug`. These are source settings, not proof of which transform was deployed. Matches use `https://api-games.smbet.net`; live socket is `https://socket.smbet.net`. |
| SPA deployment assumptions | `thebet-online (2)/thebet-online/nginx/spa.conf:8` | SPA fallback returns index.html. This file has no `/api` proxy: same-origin API routing must be supplied by the external reverse proxy. |

The backend authentication service accepts normalized Ugandan phone numbers and exact usernames (`Bet/Bet/WebUI/Infrastructure/IAuthenticationService.cs:146`). V2's login DTO, session confirmation and cookie transport already match this backend; no authentication rewrite is needed.

The legacy online client normalizes HTTP 400 validation errors, 401 authentication failures, 417 failures and network errors. V2 retains its existing typed error normalization, including ModelState/errors and server status.

## Live evidence and root cause

Unauthenticated HTTP checks made during this investigation:

| URL / check | Result |
| --- | --- |
| `https://shop.smartbet.net/api/Account/CheckLogin` and login OPTIONS | TLS negotiation failed with `ERR_SSL_TLSV1_UNRECOGNIZED_NAME`. No HTTP response, CORS headers or redirect could be inspected. |
| `https://shop.smbet.net/api/Account/CheckLogin` | 204, allowing Origin `https://smartbet.ug` with credentials. |
| `https://smartbet.ug/api/Account/CheckLogin` | 204, allowing the same origin with credentials; no redirect. |
| `http://149.28.35.92:8089/api/Account/CheckLogin` | Same anonymous-session response. |
| `https://smartbet.ug/api/Account/Login` OPTIONS | 200; allows Origin `https://smartbet.ug`, credentials, GET/POST, Accept/Content-Type. |
| Empty `{}` JSON POST to login through `smartbet.ug/api` and directly to `149.28.35.92:8089/api` | Both return 400 JSON with Message/ModelState, no redirect and no cookie. This only exercises missing-input validation. |
| `/api/CompanySettings/OnlineSettings` through `shop.smbet.net`, `smartbet.ug`, and backend IP | All return 200 JSON with identical SHA-256 `b3cc8170f552f2f3d89107483f3397917491db239917bbaa09272a90c9138783`. This supports routing to the expected application contract/settings, but does not prove database identity. |
| `http://108.61.179.217:9001` | Serves a React SPA, title Smart Sportsbetting, script `/static/js/main.02af43e4.js`, rather than the MVC login view. Its `/api/Account/CheckLogin` returns HTML via SPA fallback, not an API response. |
| That live legacy JS bundle | Embeds `REACT_APP_BACKEND_URL=https://testshop.smbet.info` and the separate games service. That backend hostname currently fails DNS resolution. This differs from the checked-in legacy production environment. Historical working deployment values cannot be reconstructed from the current site alone. |

The immediate v2 failure is the explicit `NEXT_PUBLIC_API_BASE_URL=https://shop.smartbet.net` in `.github/workflows/docker.yml`. It is baked into the browser bundle and bypasses the working `smartbet.ug/api/` proxy. The reported browser CORS/network failure is consistent with the observed TLS failure at that host. It is not evidence that the intended backend rejects `smartbet.ug`: the correct host and proxy explicitly allow it.

The existing Nginx stanza is appropriate:

```nginx
location /api/ {
    proxy_pass http://149.28.35.92:8089;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

Keep `proxy_pass` without a trailing URI slash, so `/api/Account/...` reaches the backend with `/api` intact. By default Nginx forwards request headers (including Cookie), and Set-Cookie is not among its default hidden response headers. Do not add cookie stripping, wildcard CORS, or disable TLS checks. See [Nginx proxy documentation](https://nginx.org/en/docs/http/ngx_http_proxy_module.html).

## Changes made

- `src/config/env.ts`: mirror the legacy production-domain guard, selecting same-origin account API requests on `smartbet.ug` and its subdomains while preserving explicit development origins.
- `.github/workflows/docker.yml`: empty API base, existing `/api` prefix and cookie credentials, unchanged matches/socket settings; run typecheck/lint/tests before publishing; prepare `0.1.5` and full `sha-<commit>` image tags with an OCI revision label. Serialize release jobs and fail if the version tag exists or cannot be checked.
- `Dockerfile`: document/default the API base to empty.
- `.env.example`: production versus local API guidance and the existing live socket URL.
- `package.json` / `package-lock.json`: version 0.1.5 and explicit test/typecheck scripts; no dependency changes.
- `tests/auth-api.test.cjs`: API URL construction, production hostname boundaries, development overrides, login DTO/headers, registration/OTP/password/logout routes, credential handling, session restoration/confirmation/logout, errors and the independent credential-free matches client. All requests use local adapters and synthetic identities.

The earlier mobile betslip and form-input fixes remain in place. No backend, database, page layout or navigation changes are required for this API routing fix.

## Required build and runtime settings

```dotenv
NEXT_PUBLIC_API_BASE_URL=
NEXT_PUBLIC_API_PATH_PREFIX=api
NEXT_PUBLIC_API_TIMEOUT_MS=20000
NEXT_PUBLIC_API_WITH_CREDENTIALS=true
NEXT_PUBLIC_API_DEBUG=false
NEXT_PUBLIC_MATCHES_API_BASE_URL=https://api-games.smbet.net
NEXT_PUBLIC_MATCHES_API_PATH=/
NEXT_PUBLIC_LIVE_SOCKET_URL=https://socket.smbet.net
```

These are build arguments, not runtime fixes for an already-published image: Next.js freezes NEXT_PUBLIC values at build time. See [Next.js 14 environment variables](https://nextjs.org/docs/14/app/building-your-application/configuring/environment-variables#bundling-environment-variables-for-the-browser). The Docker runtime remains `NODE_ENV=production`, `PORT=3000`, `HOSTNAME=0.0.0.0`. Keep the existing published port 9005 and proxy arrangement; no new runtime secret is introduced.

Local development still requires `NEXT_PUBLIC_API_BASE_URL=http://localhost:49191` or the actual local WebUI origin, with that backend allowing the local frontend origin and credentials. Next.js itself does not supply the production Nginx `/api` proxy.

## Validation

- TypeScript: passed.
- ESLint: passed with no warnings or errors.
- Unit/regression tests: 21 passed, including 10 new API/authentication tests.
- Production Next.js build: exit 0; compiled successfully and generated 71 pages in an isolated temporary checkout because the existing `.next/trace` is locked. Windows emitted an EPERM warning copying the temporary node_modules junction into the standalone output. The compiled app ran successfully through `next start`; Linux Docker standalone packaging remains for CI to verify.
- Generated browser assets: no `shop.smartbet.net`, `shop.smbet.net`, `testshop.smbet.info`, `localhost:49191` or backend-IP references in `.next/static` for the production configuration.
- Production-build mobile browser checks: passed touch focus, validation messages, login, an HttpOnly synthetic cookie round trip, session restoration on reload, cookie removal on logout, registration/OTP/automatic login, and password recovery. Account and OTP responses were intercepted locally; no page exceptions occurred. These mocks verify browser transport/UI behavior, not real production cookie attributes or backend business logic.
- Live authorized customer session, live OTP issuance and password updates: deliberately not tested. The production cookie's actual Domain/Path/Secure/SameSite and logout expiration require an authorized test account; source inspection and synthetic tests cannot establish these deployed values.
- GHCR tag availability: anonymous registry token request returned 401, but Docker's configured registry access successfully inspected existing release 0.1.4 and returned `ghcr.io/silverdavids/onlinev2:0.1.5: not found`. Thus 0.1.5 appears available at investigation time. The authenticated CI guard checks again before publication; if occupied, choose a new unused version consistently rather than overwriting it.

## Operator deployment commands after successful CI publication

Run only after reviewing the change and a successful workflow run. Nothing below was executed during this investigation. The actual Swarm service name and future commit SHA are not supplied by the repository and must not be invented.

```bash
# Identify the existing service publishing frontend port 9005.
docker service ls --format '{{.Name}}\t{{.Image}}\t{{.Ports}}'
SERVICE='<existing service publishing port 9005>'
COMMIT_SHA='<full commit SHA from the successful workflow run>'

# Authenticate to GHCR first if the package is private.
IMAGE="ghcr.io/silverdavids/onlinev2:sha-${COMMIT_SHA}"
docker pull "$IMAGE"
docker image inspect --format '{{index .Config.Labels "org.opencontainers.image.revision"}}' "$IMAGE"
# Confirm that the printed revision equals COMMIT_SHA.
docker pull ghcr.io/silverdavids/onlinev2:0.1.5
docker image inspect --format '{{index .RepoDigests 0}}' ghcr.io/silverdavids/onlinev2:0.1.5
docker image inspect --format '{{index .RepoDigests 0}}' "$IMAGE"
# Confirm that both release and SHA tags identify the same digest.

# Save the current image reference for rollback, then pin the update by digest.
docker service inspect --format '{{.Spec.TaskTemplate.ContainerSpec.Image}}' "$SERVICE"
DIGEST=$(docker image inspect --format '{{index .RepoDigests 0}}' "$IMAGE")
docker service update --with-registry-auth --image "$DIGEST" "$SERVICE"
docker service ps "$SERVICE" --no-trunc
curl --fail-with-body -i https://smartbet.ug/api/Account/CheckLogin
# An anonymous 204 is expected, not HTML or a redirect.

# If the release fails its operator checks:
# docker service rollback "$SERVICE"
```

## Remaining operational verification

No backend CORS or Nginx change is justified by the observed routing, preflight and validation responses. Do not switch to another API/database based only on a hostname resemblance.

After release, use an authorized test account to verify cookie issuance, session survival on reload, authenticated account/ticket requests, and server-side logout. The inspected configuration does not establish whether multiple authenticating backend replicas share ticket-protection keys, so session affinity/key consistency remains a deployment question if sessions vary by instance. The source cookie `sid` check must remain intact.

The legacy port-9001 deployment is currently stale (SPA API fallback and an unresolved embedded backend); this task does not repair or redeploy that separate application. Existing customers may need to authenticate again after moving from a backend-host cookie to a first-party smartbet.ug cookie.
