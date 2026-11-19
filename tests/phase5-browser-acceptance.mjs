/** Actual browser acceptance using native CDP. Never supplies successful mock API responses. */
import fs from "node:fs";
import path from "node:path";

const base = "http://127.0.0.1:3305";
const output = path.resolve("artifacts/phase5-acceptance");
fs.mkdirSync(output, { recursive: true });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let version;
for (let attempt = 0; attempt < 40; attempt++) {
  try {
    version = await (await fetch("http://127.0.0.1:9227/json/version")).json();
    break;
  } catch {
    await sleep(250);
  }
}
if (!version) throw new Error("Isolated browser debugging endpoint is unavailable.");
const socket = new WebSocket(version.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.onopen = resolve;
  socket.onerror = reject;
});
let next = 0;
const pending = new Map();
const sessions = new Set();
const network = [];
const denied = [];
const exceptions = [];
const sockets = [];
function send(method, params = {}, sessionId) {
  return new Promise((resolve, reject) => {
    const id = ++next;
    const timeout = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`CDP timeout: ${method}`));
    }, 15000);
    pending.set(id, { resolve, reject, timeout });
    socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
  });
}
const readRoutes = new Set([
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
    if (!url.pathname.startsWith("/api/")) return request.method === "GET";
    if (request.method === "GET" && readRoutes.has(url.pathname)) return true;
    // Empty model validation cannot contain a real identity/password or reach password validation.
    return (
      request.method === "POST" &&
      url.pathname === "/api/Account/Login" &&
      request.postData === "{}"
    );
  }
  return (
    request.method === "GET" &&
    url.protocol === "https:" &&
    ((url.hostname === "api-games.smbet.net" && url.pathname === "/") ||
      ["fonts.googleapis.com", "fonts.gstatic.com"].includes(url.hostname))
  );
}
async function prepare(sessionId) {
  sessions.add(sessionId);
  await send("Network.enable", {}, sessionId);
  await send("Network.setBypassServiceWorker", { bypass: true }, sessionId);
  // Block socket HTTP polling. Record WebSocket handshakes separately because CDP's
  // blocked-URL facility does not reliably stop ws/wss handshakes in every Chrome version.
  await send("Network.setBlockedURLs", { urls: ["*socket.smbet.net*"] }, sessionId);
  await send(
    "Fetch.enable",
    { patterns: [{ urlPattern: "*", requestStage: "Request" }] },
    sessionId,
  );
  await send("Runtime.enable", {}, sessionId);
  await send("Page.enable", {}, sessionId).catch(() => {});
}
socket.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.id) {
    const entry = pending.get(message.id);
    if (!entry) return;
    pending.delete(message.id);
    clearTimeout(entry.timeout);
    if (message.error) entry.reject(new Error(message.error.message));
    else entry.resolve(message.result);
    return;
  }
  const { method, params, sessionId } = message;
  if (method === "Fetch.requestPaused") {
    const permit = allowed(params.request);
    const url = new URL(params.request.url);
    if (!permit)
      denied.push({ method: params.request.method, origin: url.origin, path: url.pathname });
    void send(
      permit ? "Fetch.continueRequest" : "Fetch.failRequest",
      { requestId: params.requestId, ...(!permit ? { errorReason: "BlockedByClient" } : {}) },
      sessionId,
    ).catch(() => {});
  } else if (method === "Network.responseReceived") {
    const url = new URL(params.response.url);
    network.push({ origin: url.origin, path: url.pathname, status: params.response.status });
  } else if (method === "Runtime.exceptionThrown") {
    // Never collect request bodies, cookies, console arguments or exception payload objects.
    exceptions.push({
      category: "runtime-exception",
      line: params.exceptionDetails.lineNumber,
      description: (
        params.exceptionDetails.exception?.description ||
        params.exceptionDetails.text ||
        ""
      )
        .split("\n")[0]
        .slice(0, 180),
    });
  } else if (method === "Network.webSocketCreated") {
    const url = new URL(params.url);
    sockets.push({ origin: url.origin, path: url.pathname });
  }
};
const { targetId } = await send("Target.createTarget", { url: "about:blank" });
const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
await prepare(sessionId);
const evaluate = async (expression) => {
  const result = await send(
    "Runtime.evaluate",
    { expression, returnByValue: true, awaitPromise: true },
    sessionId,
  );
  if (result.exceptionDetails) throw new Error("Browser evaluation failed.");
  return result.result.value;
};
const results = {
  actualBrowser: true,
  browser: version.Browser,
  base,
  pages: [],
  safety: {
    successfulResponsesMocked: false,
    businessOperationsBlocked: true,
    loginPolicy: "empty-model validation only",
    socketPollingBlocked: true,
  },
};
try {
  await send("Emulation.setTimezoneOverride", { timezoneId: "Africa/Nairobi" }, sessionId);
  for (const viewport of [
    { name: "desktop", width: 1440, height: 1000, mobile: false },
    { name: "mobile", width: 390, height: 844, mobile: true },
  ]) {
    await send(
      "Emulation.setDeviceMetricsOverride",
      {
        width: viewport.width,
        height: viewport.height,
        deviceScaleFactor: 1,
        mobile: viewport.mobile,
      },
      sessionId,
    );
    for (const route of [
      "/",
      "/sports",
      "/auth",
      "/booking-code",
      "/my-bets",
      "/deposit",
      "/withdraw",
    ]) {
      await send("Page.navigate", { url: base + route }, sessionId);
      await sleep(route === "/" || route === "/sports" ? 3500 : 1400);
      if (route === "/" || route === "/sports") {
        for (let attempt = 0; attempt < 24; attempt++) {
          if (
            await evaluate(
              `Array.from(document.querySelectorAll('a[href^="/match/"]')).some(a => /^\\/match\\/\\d+$/.test(a.getAttribute('href')))`,
            )
          )
            break;
          await sleep(250);
        }
      }
      const page = await evaluate(`(() => ({
        title: document.title,
        heading: document.querySelector('h1')?.textContent?.trim() || '',
        readyState: document.readyState,
        width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
        hasMain: !!document.querySelector('main'),
        bodyLength: document.body.innerText.length,
        errorFallback: document.body.innerText.includes('Something went wrong'),
        buttons: document.querySelectorAll('button').length
      }))()`);
      const screenshot = `${viewport.name}-${route === "/" ? "home" : route.slice(1)}.png`;
      const capture = await send(
        "Page.captureScreenshot",
        { format: "png", captureBeyondViewport: false },
        sessionId,
      );
      fs.writeFileSync(path.join(output, screenshot), Buffer.from(capture.data, "base64"));
      results.pages.push({
        viewport: viewport.name,
        route,
        ...page,
        horizontalOverflow: page.scrollWidth > page.width + 1,
        screenshot,
      });
      if (route === "/sports") {
        const selected = await evaluate(`(() => {
          const selected = [];
          for (const article of document.querySelectorAll('article')) {
            const link = article.querySelector('a[href^="/match/"]');
            if (!link || !/^\\/match\\/\\d+$/.test(link.getAttribute('href'))) continue;
            const button = Array.from(article.querySelectorAll('button')).find(b => !b.disabled && /\\d+\\.\\d{2}\\s*$/.test(b.textContent));
            if (!button) continue;
            const odds = Number(button.querySelector('span:last-child').textContent.trim());
            selected.push({ fixtureId: link.getAttribute('href').split('/').at(-1), odds });
            button.click();
            if (selected.length === 2) break;
          }
          return selected;
        })()`);
        await sleep(200);
        if (viewport.mobile && selected.length) {
          await evaluate(
            `Array.from(document.querySelectorAll('button')).find(b => /selection[s]?/.test(b.innerText) && b.className.includes('fixed'))?.click()`,
          );
          await sleep(200);
        }
        const slip = await evaluate(`(() => {
          const root = Array.from(document.querySelectorAll('aside, div.fixed')).find(e => e.getBoundingClientRect().width > 0 && e.innerText.includes('Total odds'));
          if (!root) return { found: false };
          const value = label => { const node = Array.from(root.querySelectorAll('span')).find(s => s.textContent.trim() === label); return node?.parentElement?.querySelector('span:last-child')?.textContent.trim(); };
          return { found: true, stake: Number(root.querySelector('input[type="number"]')?.value), totalOdds: Number(value('Total odds')), potentialWin: Number((value('Potential win') || '').replace(/[^0-9.]/g,'')) };
        })()`);
        const expectedOdds = Number(
          selected.reduce((total, row) => total * row.odds, 1).toFixed(2),
        );
        const expectedWin = Math.round(
          selected.reduce((total, row) => total * row.odds, 1) * (slip.stake || 0),
        );
        results.pages.at(-1).betslip = {
          selected,
          ...slip,
          expectedOdds,
          expectedWin,
          calculationsMatch:
            selected.length === 2 &&
            slip.found &&
            slip.totalOdds === expectedOdds &&
            slip.potentialWin === expectedWin,
        };
        const selectedCapture = await send(
          "Page.captureScreenshot",
          { format: "png", captureBeyondViewport: false },
          sessionId,
        );
        fs.writeFileSync(
          path.join(output, `${viewport.name}-betslip.png`),
          Buffer.from(selectedCapture.data, "base64"),
        );
        await evaluate(`localStorage.removeItem('smartbet_draft_slip')`);
        if (selected[0]) {
          const marketRoute = `/match/${selected[0].fixtureId}`;
          await send("Page.navigate", { url: base + marketRoute }, sessionId);
          await sleep(3500);
          const marketPage = await evaluate(`(() => ({
            title: document.title, heading: document.querySelector('h1')?.textContent?.trim() || '',
            hasMain: !!document.querySelector('main'), width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
            numericPriceButtons: Array.from(document.querySelectorAll('button')).filter(b => /\\d+\\.\\d{2}\\s*$/.test(b.textContent)).length,
            hasTotalGoals: /total goals/i.test(document.querySelector('main')?.innerText || '')
          }))()`);
          const name = `${viewport.name}-markets.png`;
          const capture = await send(
            "Page.captureScreenshot",
            { format: "png", captureBeyondViewport: false },
            sessionId,
          );
          fs.writeFileSync(path.join(output, name), Buffer.from(capture.data, "base64"));
          results.pages.push({
            viewport: viewport.name,
            route: marketRoute,
            ...marketPage,
            horizontalOverflow: marketPage.scrollWidth > marketPage.width + 1,
            screenshot: name,
          });
        }
      }
      if (route === "/auth") {
        const before = network.filter((row) => row.path === "/api/Account/Login").length;
        const validation = await evaluate(`(() => {
          const username = document.querySelector('#login-identifier');
          const password = document.querySelector('#login-pass');
          const form = username?.form;
          if (!form || !password) return { found: false };
          const valid = form.checkValidity(); form.requestSubmit();
          return { found: true, emptyFormValid: valid, invalidFields: form.querySelectorAll(':invalid').length };
        })()`);
        await sleep(100);
        results.pages.at(-1).loginValidation = {
          ...validation,
          loginRequestsTriggered:
            network.filter((row) => row.path === "/api/Account/Login").length - before,
        };
      }
    }
  }
  // Actual proxy/session checks. Bodies and headers are deliberately not serialized.
  results.anonymousHttp = await evaluate(`(async () => {
    const checks = [];
    for (const route of ['/api/Account/CheckLogin','/api/Account/CheckLogin?strict401=true']) {
      const response = await fetch(route, { credentials: 'include', cache: 'no-store' });
      checks.push({ route, status: response.status, noStore: /no-store/.test(response.headers.get('cache-control') || '') });
    }
    const response = await fetch('/api/Account/Login', { method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' }, body: '{}' });
    checks.push({ route: '/api/Account/Login', operation: 'empty-model-validation-only', status: response.status });
    return checks;
  })()`);
  results.authenticated = {
    status: "not-executed-by-this-runner",
    reason:
      "Read-only browser run. Review actual login status and the separate secure-account/target prerequisites before authenticated acceptance.",
  };
} finally {
  results.networkSummary = [...new Map(network.map((row) => [JSON.stringify(row), row])).values()];
  results.blockedRequests = [...new Map(denied.map((row) => [JSON.stringify(row), row])).values()];
  results.runtimeExceptions = exceptions;
  results.observedSockets = [...new Map(sockets.map((row) => [JSON.stringify(row), row])).values()];
  fs.writeFileSync(path.join(output, "browser-results.json"), JSON.stringify(results, null, 2));
  await send("Target.closeTarget", { targetId }).catch(() => {});
  await send("Browser.close").catch(() => {});
  socket.close();
}
console.log(
  JSON.stringify(
    {
      pageChecks: results.pages.length,
      horizontalOverflow: results.pages.filter((p) => p.horizontalOverflow).length,
      renderedMains: results.pages.filter((p) => p.hasMain).length,
      runtimeExceptions: exceptions.length,
      actualAnonymousHttp: results.anonymousHttp,
      blockedRequests: results.blockedRequests.length,
    },
    null,
    2,
  ),
);
