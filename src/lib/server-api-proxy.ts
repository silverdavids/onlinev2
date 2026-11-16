/** Same-origin, status-preserving proxy for the SmartBet backend. */

const DEFAULT_BACKEND_URL = "https://online.smartbet.ug";
const ALLOWED_METHODS = new Set(["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE"]);
const BODY_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function backendBaseUrl(): URL {
  const configured =
    import.meta.env?.["SMARTBET_BACKEND_URL"] ||
    import.meta.env?.["VITE_BACKEND_URL"] ||
    (typeof process !== "undefined"
      ? process.env["SMARTBET_BACKEND_URL"] || process.env["VITE_BACKEND_URL"]
      : undefined);
  return new URL(configured || DEFAULT_BACKEND_URL);
}

function sameOriginRequest(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

function secureBackendCookies(headers: Headers, secure: boolean): void {
  const cookies = headers.getSetCookie();
  if (cookies.length === 0) return;
  headers.delete("set-cookie");
  for (const cookie of cookies) {
    const [nameValue, ...attributes] = cookie.split(";");
    const safeAttributes = attributes.filter((attribute) => {
      const name = attribute.trim().split("=", 1)[0]?.toLowerCase();
      return name !== "domain" && name !== "samesite" && name !== "httponly" && name !== "secure";
    });
    safeAttributes.push("Path=/", "HttpOnly", "SameSite=Lax");
    if (secure) safeAttributes.push("Secure");
    headers.append("set-cookie", [nameValue, ...safeAttributes].join("; "));
  }
}

function stripSessionSecrets(body: unknown): unknown {
  if (Array.isArray(body)) return body.map(stripSessionSecrets);
  if (!body || typeof body !== "object") return body;
  return Object.fromEntries(
    Object.entries(body).flatMap(([key, value]) =>
      /^(sessionid|sessiontoken|token|accesstoken|refreshtoken|jwt)$/i.test(
        key.replace(/[_-]/g, ""),
      )
        ? []
        : [[key, stripSessionSecrets(value)]],
    ),
  );
}

export async function handleApiProxy(request: Request): Promise<Response> {
  const incomingUrl = new URL(request.url);
  const method = request.method.toUpperCase();

  if (method === "OPTIONS") {
    return new Response(null, { status: 405, headers: { Allow: [...ALLOWED_METHODS].join(", ") } });
  }
  if (!ALLOWED_METHODS.has(method)) {
    return new Response("Method not allowed", {
      status: 405,
      headers: { Allow: [...ALLOWED_METHODS].join(", ") },
    });
  }
  if ((BODY_METHODS.has(method) && !request.headers.get("origin")) || !sameOriginRequest(request)) {
    return Response.json({ message: "Cross-origin request rejected." }, { status: 403 });
  }

  const base = backendBaseUrl();
  const target = new URL(`${incomingUrl.pathname}${incomingUrl.search}`, base);
  const headers = new Headers(request.headers);
  for (const name of [
    "host",
    "connection",
    "content-length",
    "origin",
    "referer",
    "authorization",
    "x-smartbet-session",
  ])
    headers.delete(name);
  const cookieHeader = headers.get("cookie");
  if (cookieHeader) {
    const allowedCookies = cookieHeader.split(";").filter((part) => {
      const name = part.split("=", 1)[0]?.trim().toLowerCase() || "";
      return !name.startsWith("sb-") && !name.includes("supabase.auth");
    });
    if (allowedCookies.length) headers.set("cookie", allowedCookies.join("; "));
    else headers.delete("cookie");
  }
  headers.set("accept", request.headers.get("accept") || "application/json");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const upstream = await fetch(target, {
      method,
      headers,
      ...(BODY_METHODS.has(method) ? { body: await request.arrayBuffer() } : {}),
      redirect: "manual",
      signal: controller.signal,
    });

    const responseHeaders = new Headers(upstream.headers);
    for (const name of ["connection", "content-length", "content-encoding", "transfer-encoding"])
      responseHeaders.delete(name);
    responseHeaders.set("Cache-Control", "no-store");
    responseHeaders.delete("authorization");
    secureBackendCookies(
      responseHeaders,
      incomingUrl.protocol === "https:" || request.headers.get("x-forwarded-proto") === "https",
    );
    if (
      responseHeaders.get("content-type")?.includes("application/json") &&
      upstream.status !== 204 &&
      upstream.status !== 304
    ) {
      try {
        const payload = stripSessionSecrets(await upstream.clone().json());
        return Response.json(payload, {
          status: upstream.status,
          statusText: upstream.statusText,
          headers: responseHeaders,
        });
      } catch {
        // Preserve malformed/non-JSON upstream bodies and their actual status.
      }
    }
    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "AbortError";
    return Response.json(
      {
        message: timedOut ? "SmartBet backend request timed out." : "SmartBet backend unavailable.",
      },
      { status: timedOut ? 504 : 502, headers: { "Cache-Control": "no-store" } },
    );
  } finally {
    clearTimeout(timer);
  }
}
