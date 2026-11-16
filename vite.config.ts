// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { Readable } from "node:stream";
import type { IncomingMessage, ServerResponse } from "node:http";
import { handleApiProxy } from "./src/lib/server-api-proxy";
import { loadEnv, type Plugin } from "vite";

function smartBetDevelopmentProxy(): Plugin {
  return {
    name: "smartbet-development-api-proxy",
    enforce: "pre",
    configureServer(server) {
      const env = loadEnv(server.config.mode, server.config.envDir, "");
      const backendUrl = env["SMARTBET_BACKEND_URL"] || env["VITE_BACKEND_URL"];
      if (backendUrl) process.env["SMARTBET_BACKEND_URL"] = backendUrl;

      server.middlewares.use((incoming, outgoing, next) => {
        if (!incoming.url || !new URL(incoming.url, "http://localhost").pathname.startsWith("/api/")) {
          next();
          return;
        }

        void proxyDevelopmentRequest(incoming, outgoing).catch(() => {
          if (!outgoing.headersSent) {
            outgoing.writeHead(502, { "content-type": "application/json", "cache-control": "no-store" });
          }
          outgoing.end(JSON.stringify({ message: "SmartBet backend unavailable." }));
        });
      });
    },
  };
}

async function proxyDevelopmentRequest(
  incoming: IncomingMessage,
  outgoing: ServerResponse,
): Promise<void> {
  const requestHeaders = new Headers();
  for (const [name, value] of Object.entries(incoming.headers)) {
    if (value !== undefined) requestHeaders.set(name, Array.isArray(value) ? value.join(", ") : value);
  }

  const method = (incoming.method || "GET").toUpperCase();
  let body: Buffer | undefined;
  if (method !== "GET" && method !== "HEAD") {
    const chunks: Buffer[] = [];
    for await (const chunk of incoming) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    body = Buffer.concat(chunks);
  }

  const host = incoming.headers.host || "localhost:3000";
  const request = new Request(new URL(incoming.url || "/", `http://${host}`), {
    method,
    headers: requestHeaders,
    ...(body ? { body: body as unknown as BodyInit } : {}),
  });
  const response = await handleApiProxy(request);
  const responseHeaders: Record<string, string | string[]> = {};
  response.headers.forEach((value, name) => {
    if (name !== "set-cookie") responseHeaders[name] = value;
  });
  const cookies = response.headers.getSetCookie();
  if (cookies.length > 0) responseHeaders["set-cookie"] = cookies;

  outgoing.writeHead(response.status, response.statusText, responseHeaders);
  if (method === "HEAD" || !response.body) {
    outgoing.end();
    return;
  }
  const readable = Readable.fromWeb(response.body as never);
  readable.pipe(outgoing);
}

export default defineConfig({
  plugins: [smartBetDevelopmentProxy()],
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    server: {
      host: "0.0.0.0",
      port: 3000,
    },
  },
});
