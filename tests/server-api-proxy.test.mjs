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
