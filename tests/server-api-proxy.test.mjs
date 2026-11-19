import test from "node:test";
import assert from "node:assert/strict";
import { handleApiProxy } from "../src/lib/server-api-proxy.ts";

const originalFetch = globalThis.fetch;
const originalBackend = process.env.SMARTBET_BACKEND_URL;
const localRequest = (path = "/api/Account/CheckLogin", options = {}) =>
  new Request(`http://localhost:3000${path}`, options);

test.afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalBackend === undefined) delete process.env.SMARTBET_BACKEND_URL;
  else process.env.SMARTBET_BACKEND_URL = originalBackend;
});

for (const action of ["Login", "LogOff"]) {
  test(`${action} forwards the original validated Origin without synthesizing it`, async () => {
    process.env.SMARTBET_BACKEND_URL = "http://localhost:49191";
    let forwarded = 0;
    globalThis.fetch = async (url, options) => {
      forwarded++;
      assert.equal(url.origin, "http://localhost:49191");
      assert.equal(options.headers.get("origin"), "http://localhost:3000");
      assert.equal(options.headers.get("referer"), null);
      return new Response(null, { status: 204 });
    };
    const response = await handleApiProxy(
      localRequest(`/api/Account/${action}`, {
        method: "POST",
        headers: { origin: "http://localhost:3000", referer: "http://localhost:3000/auth" },
        body: "{}",
      }),
    );
    assert.equal(response.status, 204);
    assert.equal(forwarded, 1);
  });

  test(`${action} rejects missing, malformed and foreign Origins without forwarding`, async () => {
    let forwarded = 0;
    globalThis.fetch = async () => {
      forwarded++;
      return new Response(null, { status: 204 });
    };
    for (const origin of [
      undefined,
      "null",
      "not-an-origin",
      "https://evil.example",
      "http://localhost:49191",
      "http://localhost:3000/path",
      "http://user@localhost:3000",
      "http://localhost:3000/",
      "http://localhost:3000, https://evil.example",
    ]) {
      const response = await handleApiProxy(
        localRequest(`/api/Account/${action}`, {
          method: "POST",
          headers: origin === undefined ? {} : { origin },
          body: "{}",
        }),
      );
      assert.equal(response.status, 403);
    }
    assert.equal(forwarded, 0);
  });
}

test("read-only originless requests do not acquire an Origin", async () => {
  globalThis.fetch = async (_url, options) => {
    assert.equal(options.headers.get("origin"), null);
    return new Response(null, { status: 204 });
  };
  assert.equal((await handleApiProxy(localRequest())).status, 204);
});

test("local recovery forwards a canonical encoded phone and purpose without a session", async () => {
  process.env.SMARTBET_BACKEND_URL = "http://localhost:49191";
  let forwarded = 0;
  globalThis.fetch = async (url, options) => {
    forwarded++;
    assert.equal(url.origin, "http://localhost:49191");
    assert.equal(url.pathname, "/api/Account/GetOTP");
    assert.equal(url.search, "?phoneNumber=%2B256772000000&purpose=password-reset");
    assert.equal(options.method, "POST");
    assert.equal(options.headers.get("origin"), "http://localhost:3000");
    assert.equal(options.headers.get("cookie"), null);
    assert.equal(options.headers.get("authorization"), null);
    return new Response(null, { status: 429 });
  };
  const path = "/api/Account/GetOTP?phoneNumber=+256772000000&purpose=password-reset";
  assert.equal((await handleApiProxy(localRequest(path, { method: "POST" }))).status, 403);
  assert.equal(forwarded, 0);
  const response = await handleApiProxy(localRequest(path, {
    method: "POST",
    headers: { origin: "http://localhost:3000" },
  }));
  assert.equal(response.status, 429);
  assert.equal(forwarded, 1);
});

test("preserves backend error status and protects localhost cookies", async () => {
  process.env.SMARTBET_BACKEND_URL = "http://localhost:49191";
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ message: "Rejected" }), {
      status: 401,
      headers: {
        "content-type": "application/json",
        "set-cookie": "Auth=opaque; Domain=backend.local; Path=/; SameSite=None",
      },
    });

  const response = await handleApiProxy(
    localRequest("/api/Account/Login", {
      method: "POST",
      headers: { origin: "http://localhost:3000", "content-type": "application/json" },
      body: JSON.stringify({ UserName: "test", Password: "incorrect", RememberMe: false }),
    }),
  );

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { message: "Rejected" });
  const cookie = response.headers.getSetCookie()[0];
  assert.match(cookie, /HttpOnly/i);
  assert.match(cookie, /SameSite=Lax/i);
  assert.match(cookie, /Path=\//i);
  assert.doesNotMatch(cookie, /Domain=/i);
  assert.doesNotMatch(cookie, /Secure/i); // Local HTTP must be usable; HTTPS responses add Secure.
});

test("rejects cross-origin and originless state-changing requests before forwarding", async () => {
  let forwarded = false;
  globalThis.fetch = async () => {
    forwarded = true;
    return new Response(null, { status: 200 });
  };

  const noOrigin = await handleApiProxy(
    localRequest("/api/Account/LogOff", { method: "POST", body: "{}" }),
  );
  const crossOrigin = await handleApiProxy(
    localRequest("/api/Account/LogOff", {
      method: "POST",
      headers: { origin: "https://evil.example" },
      body: "{}",
    }),
  );
  assert.equal(noOrigin.status, 403);
  assert.equal(crossOrigin.status, 403);
  assert.equal(forwarded, false);
});

test("backend connection failures return an error instead of success", async () => {
  globalThis.fetch = async () => {
    throw new TypeError("connection refused");
  };
  const response = await handleApiProxy(localRequest());
  assert.equal(response.status, 502);
  assert.deepEqual(await response.json(), { message: "SmartBet backend unavailable." });
});

test("opaque backend session cookie round trip and logout deletion survive the proxy", async () => {
  globalThis.fetch = async (_url, options) => {
    assert.equal(options.headers.get("cookie"), "Auth=opaque-test-ticket");
    assert.equal(options.redirect, "manual");
    return new Response(null, {
      status: 200,
      headers: {
        "set-cookie":
          "Auth=; Domain=backend.test; Path=/Account; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure; SameSite=None",
      },
    });
  };
  const response = await handleApiProxy(
    new Request("https://frontend.test/api/Account/LogOff", {
      method: "POST",
      headers: { origin: "https://frontend.test", cookie: "Auth=opaque-test-ticket" },
    }),
  );
  assert.equal(response.status, 200);
  const cookie = response.headers.getSetCookie()[0];
  assert.equal((cookie.match(/Path=/gi) || []).length, 1);
  assert.match(cookie, /Path=\//);
  assert.match(cookie, /Max-Age=0/);
  assert.match(cookie, /Expires=Thu, 01 Jan 1970/);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /Secure/);
  assert.doesNotMatch(cookie, /Domain=/);
});
