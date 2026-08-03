const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);
const DEFAULT_MATCHES_API_BASE_URL = "https://api-games.smbet.net";
const DEFAULT_MATCHES_API_PATH = "/";

const trimTrailingSlashes = (value: string) => value.replace(/\/+$/, "");
const trimSlashes = (value: string) => value.replace(/^\/+|\/+$/g, "");

const normalizeBaseUrl = (value: string | undefined): string => {
  const trimmed = value?.trim();
  return trimmed ? trimTrailingSlashes(trimmed) : "";
};

const normalizePathPrefix = (value: string | undefined): string => {
  const prefix = trimSlashes(value?.trim() || "api");
  return prefix ? `/${prefix}` : "";
};

const timeoutValue = Number(
  process.env.NEXT_PUBLIC_API_TIMEOUT_MS?.trim() || "20000"
);

export const apiConfig = {
  baseUrl: normalizeBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL),
  apiPathPrefix: normalizePathPrefix(
    process.env.NEXT_PUBLIC_API_PATH_PREFIX
  ),
  requestTimeoutMs:
    Number.isFinite(timeoutValue) && timeoutValue > 0
      ? timeoutValue
      : 20000,
  withCredentials:
    process.env.NEXT_PUBLIC_API_WITH_CREDENTIALS?.trim().toLowerCase() !==
    "false",
  debug: TRUE_VALUES.has(
    process.env.NEXT_PUBLIC_API_DEBUG?.trim().toLowerCase() || ""
  ),
};

export const matchesApiConfig = {
  baseUrl: normalizeBaseUrl(
    process.env.NEXT_PUBLIC_MATCHES_API_BASE_URL ||
      DEFAULT_MATCHES_API_BASE_URL
  ),
  activeMatchesPath:
    process.env.NEXT_PUBLIC_MATCHES_API_PATH?.trim() || DEFAULT_MATCHES_API_PATH,
  requestTimeoutMs: apiConfig.requestTimeoutMs,
  refreshIntervalMs: 5 * 60 * 1000,
};

export const getApiBaseUrl = (): string => apiConfig.baseUrl;

export const getMatchesApiBaseUrl = (): string => matchesApiConfig.baseUrl;

export const withApiPathPrefix = (url: string): string => {
  if (!apiConfig.apiPathPrefix) return url;
  if (/^https?:\/\//i.test(url)) return url;

  if (
    url === apiConfig.apiPathPrefix ||
    url.startsWith(`${apiConfig.apiPathPrefix}/`)
  ) {
    return url;
  }

  if (!url.startsWith("/")) return url;

  return `${apiConfig.apiPathPrefix}${url}`;
};
