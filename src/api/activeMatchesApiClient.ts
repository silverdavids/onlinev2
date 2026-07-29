import axios, { type AxiosInstance, type AxiosRequestConfig } from "axios";
import { apiConfig, getMatchesApiBaseUrl, matchesApiConfig } from "@/src/config/env";
import { normalizeApiError } from "@/src/api/apiError";

export type ActiveMatchesApiRequestConfig = AxiosRequestConfig;

export const activeMatchesApiClient: AxiosInstance = axios.create({
  baseURL: getMatchesApiBaseUrl(),
  withCredentials: false,
  timeout: matchesApiConfig.requestTimeoutMs,
  headers: {
    Accept: "application/json",
  },
});

activeMatchesApiClient.interceptors.request.use((config) => {
  config.withCredentials = false;

  if (apiConfig.debug) {
    console.debug("[active matches request]", {
      method: config.method?.toUpperCase(),
      url: `${config.baseURL || ""}${config.url || ""}`,
    });
  }

  return config;
});

activeMatchesApiClient.interceptors.response.use(
  (response) => {
    if (apiConfig.debug) {
      console.debug("[active matches response]", {
        status: response.status,
        method: response.config.method?.toUpperCase(),
        url: `${response.config.baseURL || ""}${response.config.url || ""}`,
      });
    }

    return response;
  },
  (error: unknown) => Promise.reject(normalizeApiError(error))
);

export const activeMatchesGet = async <TResponse>(
  url: string,
  config?: ActiveMatchesApiRequestConfig
): Promise<TResponse> => {
  const response = await activeMatchesApiClient.get<TResponse>(url, config);
  return response.data;
};

export default activeMatchesApiClient;
