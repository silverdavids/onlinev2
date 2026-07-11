const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);

const trimTrailingSlashes = (value: string) => value.replace(/\/+$/, "");
const trimSlashes = (value: string) => value.replace(/^\/+|\/+$/g, "");

const readPublicEnv = (key: string): string | undefined => {
  const value = process.env[key];
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed || undefined;
};

const normalizeBaseUrl = (value: string | undefined): string => {
  if (!value) return "";
  return trimTrailingSlashes(value);
};

const normalizePathPrefix = (value: string | undefined): string => {
  const prefix = trimSlashes(value || "api");
  return prefix ? `/${prefix}` : "";
};

export const apiConfig = {
  baseUrl: normalizeBaseUrl(readPublicEnv("NEXT_PUBLIC_API_BASE_URL")),
  apiPathPrefix: normalizePathPrefix(readPublicEnv("NEXT_PUBLIC_API_PATH_PREFIX")),
  requestTimeoutMs: Number(readPublicEnv("NEXT_PUBLIC_API_TIMEOUT_MS") || 20000),
  withCredentials: readPublicEnv("NEXT_PUBLIC_API_WITH_CREDENTIALS") !== "false",
  debug: TRUE_VALUES.has((readPublicEnv("NEXT_PUBLIC_API_DEBUG") || "").toLowerCase()),
};

export const getApiBaseUrl = (): string => apiConfig.baseUrl;

export const withApiPathPrefix = (url: string): string => {
  if (!apiConfig.apiPathPrefix) return url;
  if (/^https?:\/\//i.test(url)) return url;
  if (url === apiConfig.apiPathPrefix || url.startsWith(`${apiConfig.apiPathPrefix}/`)) {
    return url;
  }
  if (!url.startsWith("/")) return url;
  return `${apiConfig.apiPathPrefix}${url}`;
};
