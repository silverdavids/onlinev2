/** Real local acceptance. Never prints credentials, cookies, balances or response bodies. */
import fs from "node:fs";
import path from "node:path";

const base = "http://localhost:3000";
const output = path.resolve("artifacts/login-recovery-browser-results.json");
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const version = await (await fetch("http://127.0.0.1:9231/json/version")).json();
const socket = new WebSocket(version.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.onopen = resolve;
  socket.onerror = reject;
});
const pending = new Map();
const responses = [];
const denied = [];
let next = 0;
let sessionId;
let authenticated = false;
let oldTicket;
const results = {
  actualBrowser: true,
  base,
  successfulResponsesMocked: false,
  steps: {},
  blocker: null,
};
function send(method, params = {}, sid = sessionId) {
  return new Promise((resolve, reject) => {
    const id = ++next;
    const timeout = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`CDP timeout: ${method}`));
    }, 25000);
    pending.set(id, { resolve, reject, timeout });
    socket.send(JSON.stringify({ id, method, params, ...(sid ? { sessionId: sid } : {}) }));
  });
}
const reads = new Set([
  "/api/Account/CheckLogin",
  "/api/Online/UserInfo",
  "/api/Account/Bonuses",
  "/api/Statement/Me",
  "/api/Online/MyBets",
  "/api/Online/OpenBetsCount",
  "/api/CompanySettings/OnlineSettings",
  "/api/Matches/GetCountriesWithLeagues",
  "/api/Matches/GetTopMatches",
  "/api/Matches/GetSetCount",
]);
function allowed(request) {
  const url = new URL(request.url);
  if (url.origin === base) {
    if (
      [...url.searchParams.keys()].some((key) => /login-identifier|login-pass|password/i.test(key))
    )
      return false;
    if (!url.pathname.startsWith("/api/")) return request.method === "GET";
    return (
      (request.method === "GET" && reads.has(url.pathname)) ||
      (request.method === "POST" &&
        ["/api/Account/Login", "/api/Account/LogOff"].includes(url.pathname))
    );
  }
  return (
    request.method === "GET" &&
    url.protocol === "https:" &&
    ((url.hostname === "api-games.smbet.net" && url.pathname === "/") ||
      ["fonts.googleapis.com", "fonts.gstatic.com"].includes(url.hostname))
  );
}
socket.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.id) {
    const entry = pending.get(message.id);
    if (!entry) return;
    pending.delete(message.id);
    clearTimeout(entry.timeout);
    if (message.error) entry.reject(new Error("CDP command rejected"));
    else entry.resolve(message.result);
    return;
  }
  if (message.method === "Fetch.requestPaused") {
    const request = message.params.request;
    const permit = allowed(request);
    if (!permit) {
      const url = new URL(request.url);
      denied.push({ method: request.method, origin: url.origin, path: url.pathname });
    }
    void send(
      permit ? "Fetch.continueRequest" : "Fetch.failRequest",
      {
        requestId: message.params.requestId,
        ...(!permit ? { errorReason: "BlockedByClient" } : {}),
      },
      message.sessionId,
    ).catch(() => {});
  }
  if (message.method === "Network.responseReceived") {
    const response = message.params.response;
    const url = new URL(response.url);
    if (url.origin === base && url.pathname.startsWith("/api/")) {
      responses.push({
        path: url.pathname,
        status: response.status,
        requestId: message.params.requestId,
      });
    }
  }
};
async function evaluate(expression) {
  const result = await send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (result.exceptionDetails) throw new Error("Browser evaluation failed; payload suppressed");
  return result.result.value;
}
async function waitFor(check, label, limit = 90) {
  for (let attempt = 0; attempt < limit; attempt++) {
    const value = await check();
    if (value) return value;
    await sleep(500);
  }
  throw new Error(`Timed out: ${label}`);
}
async function session() {
  return evaluate(
    `(async () => { const r=await fetch('/api/Account/CheckLogin?strict401=true',{credentials:'include'}); const p=await r.json().catch(()=>null); return {status:r.status,authenticated:p?.authenticated===true}; })()`,
  );
}
async function capturedBody(record) {
  const response = await send("Network.getResponseBody", { requestId: record.requestId });
  return JSON.parse(
    response.base64Encoded ? Buffer.from(response.body, "base64").toString() : response.body,
  );
}
try {
  const target = await send("Target.createTarget", { url: "about:blank" });
  ({ sessionId } = await send("Target.attachToTarget", {
    targetId: target.targetId,
    flatten: true,
  }));
  await send("Network.enable");
  await send("Network.setBypassServiceWorker", { bypass: true });
  await send("Network.setBlockedURLs", { urls: ["*socket.smbet.net*"] });
  await send("Fetch.enable", { patterns: [{ urlPattern: "*", requestStage: "Request" }] });
  await send("Runtime.enable");
  await send("Page.enable");
  await send("Page.navigate", { url: base + "/auth" });
  await waitFor(
    () =>
      evaluate(
        `!!document.getElementById('login-identifier') && !!document.getElementById('login-pass')`,
      ),
    "login form",
  );
  results.steps.anonymous = await session();
  if (results.steps.anonymous.authenticated)
    throw new Error("Unexpected authenticated isolated browser");
  await waitFor(
    () =>
      evaluate(
        `(() => { const f=document.getElementById('login-pass')?.form; const k=f&&Object.keys(f).find(k=>k.startsWith('__reactProps$')); return !!(k&&typeof f[k]?.onSubmit==='function'); })()`,
      ),
    "hydrated login handler",
  );
  const lines = fs.readFileSync("C:/Users/hp/Desktop/testlogins.txt", "utf8").split(/\r?\n/);
  const marker = lines.findIndex((line) => line.trim().toLowerCase() === "online");
  if (marker < 0) throw new Error("Authorized Online credential section unavailable");
  const block = [];
  for (const line of lines.slice(marker + 1)) {
    if (!line.trim()) break;
    block.push(line);
  }
  const entries = block.map((line) => {
    const split = line.indexOf(":");
    return split > 0
      ? [line.slice(0, split).trim().toLowerCase().replace(/\s/g, ""), line.slice(split + 1).trim()]
      : [];
  });
  const password = entries.find(([key]) => key === "password")?.[1];
  const identifiers = entries.filter(([key]) => key && key !== "password");
  if (!password || identifiers.length !== 1 || !identifiers[0][1])
    throw new Error("Ambiguous authorized credential format; contents suppressed");
  const credentials = { username: identifiers[0][1], password };
  const loginStart = responses.length;
  await evaluate(
    `(() => { document.getElementById('login-identifier').value=${JSON.stringify(credentials.username)}; document.getElementById('login-pass').value=${JSON.stringify(credentials.password)}; const f=document.getElementById('login-pass').form; f.addEventListener('submit',e=>e.preventDefault(),{once:true}); f.requestSubmit(); return true; })()`,
  );
  const login = await waitFor(
    () => responses.slice(loginStart).find((r) => r.path === "/api/Account/Login"),
    "login response",
  );
  results.steps.login = { status: login.status };
  if (login.status !== 200) throw new Error("Login rejected; stopped without retrying credentials");
  await sleep(700);
  const loginBody = await capturedBody(login);
  results.steps.login.success = loginBody?.success === true;
  if (!results.steps.login.success) throw new Error("Login success contract failed");
  authenticated = true;
  await waitFor(() => evaluate(`location.pathname === '/'`), "frontend login navigation");
  await send("Page.reload", { ignoreCache: true });
  await waitFor(
    () => evaluate(`document.readyState === 'complete' && !!document.querySelector('header')`),
    "refresh",
  );
  results.steps.restoration = await session();
  if (!results.steps.restoration.authenticated)
    throw new Error("Session restoration failed; stopped");
  const wallet = await waitFor(
    () => responses.findLast((r) => r.path === "/api/Online/UserInfo" && r.status === 200),
    "wallet response",
  );
  await sleep(700);
  const info = await capturedBody(wallet);
  const balance = info?.Balance ?? info?.balance;
  results.steps.wallet = {
    status: wallet.status,
    finiteBackendBalance: typeof balance === "number" && Number.isFinite(balance),
  };
  const expected =
    typeof balance === "number" ? Math.round(balance).toLocaleString("en-UG") : "unavailable";
  results.steps.wallet.headerMatchesBackend = await waitFor(
    () =>
      evaluate(
        `(() => { const text=document.querySelector('header a[href="/deposit"]')?.textContent||''; return text.replace(/[^0-9]/g,'') === ${JSON.stringify(expected.replace(/[^0-9]/g, ""))} && /[0-9]/.test(text); })()`,
      ),
    "wallet header",
  );
  if (!results.steps.wallet.finiteBackendBalance)
    throw new Error("Wallet response contract failed");
  const jar = await send("Network.getCookies", { urls: [base] });
  const cookies = jar.cookies.filter((cookie) => cookie.httpOnly && cookie.value);
  results.steps.cookies = {
    present: cookies.length > 0,
    httpOnly: cookies.every((cookie) => cookie.httpOnly),
    rootPath: cookies.every((cookie) => cookie.path === "/"),
    localLax: cookies.every((cookie) => cookie.sameSite === "Lax"),
    usableOnHttp: cookies.every((cookie) => !cookie.secure),
  };
  oldTicket = cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");
  if (!oldTicket) throw new Error("No authentication cookie captured for revocation check");
  const before = await fetch(base + "/api/Account/CheckLogin?strict401=true", {
    headers: { cookie: oldTicket },
  });
  results.steps.oldTicketBeforeLogout = {
    status: before.status,
    authenticated: (await before.json().catch(() => null))?.authenticated === true,
  };
  if (!results.steps.oldTicketBeforeLogout.authenticated)
    throw new Error("Old-ticket control check failed");
  await evaluate(`document.querySelector('button[aria-label="Account"]').click(); true`);
  await waitFor(
    () =>
      evaluate(
        `Array.from(document.querySelectorAll('button')).some(b=>b.textContent.trim()==='Sign out')`,
      ),
    "sign out control",
  );
  const logoutStart = responses.length;
  await evaluate(
    `Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim()==='Sign out').click(); true`,
  );
  const logout = await waitFor(
    () => responses.slice(logoutStart).find((r) => r.path === "/api/Account/LogOff"),
    "logout response",
  );
  results.steps.logout = { status: logout.status };
  if (logout.status !== 200) throw new Error("Logout failed; stopped");
  authenticated = false;
  await sleep(700);
  results.steps.afterLogout = await session();
  const replay = await fetch(base + "/api/Account/CheckLogin?strict401=true", {
    headers: { cookie: oldTicket },
  });
  results.steps.oldTicketAfterLogout = {
    status: replay.status,
    authenticated: (await replay.json().catch(() => null))?.authenticated === true,
  };
  oldTicket = undefined;
  if (
    results.steps.oldTicketAfterLogout.status !== 401 ||
    results.steps.oldTicketAfterLogout.authenticated ||
    results.steps.afterLogout.authenticated
  )
    throw new Error("SECURITY FAILURE: session accepted after logout");
  const cleared = await send("Network.getCookies", { urls: [base] });
  results.steps.logout.cookieCleared = !cleared.cookies.some(
    (cookie) => cookie.httpOnly && cookie.value,
  );
  await send("Page.reload", { ignoreCache: true });
  await waitFor(() => evaluate(`document.readyState==='complete'`), "anonymous refresh");
  results.steps.afterLogoutRefresh = await session();
  await send("Page.navigate", { url: base + "/sports" });
  results.steps.anonymousSportsbook = await waitFor(
    () =>
      evaluate(
        `(() => { const links=Array.from(document.querySelectorAll('a[href^="/match/"]')).filter(a=>/^\\/match\\/\\d+$/.test(a.getAttribute('href'))); return links.length ? {fixtureLinks:links.length, hasMain:!!document.querySelector('main'), errorFallback:document.body.innerText.includes('Something went wrong')} : null; })()`,
      ),
    "anonymous sportsbook fixtures",
  );
} catch (error) {
  results.blocker =
    error instanceof Error ? error.message : "Acceptance failed; details suppressed";
  process.exitCode = 1;
} finally {
  // If a later check failed after successful login, revoke only this test session.
  if (authenticated) {
    results.cleanupLogout = await evaluate(
      `(async()=>{const r=await fetch('/api/Account/LogOff',{method:'POST',credentials:'include'});return {status:r.status};})()`,
    ).catch(() => ({ unavailable: true }));
  }
  oldTicket = undefined;
  results.apiStatuses = responses.map(({ path: route, status }) => ({ path: route, status }));
  results.blockedRequests = denied;
  fs.writeFileSync(output, JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
  await send("Browser.close", {}, undefined).catch(() => {});
  socket.close();
}
