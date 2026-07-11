import axios, { type AxiosInstance, type AxiosRequestConfig } from "axios";
import { apiConfig, getApiBaseUrl, withApiPathPrefix } from "@/src/config/env";
import { normalizeApiError } from "@/src/api/apiError";

export type ApiRequestConfig = AxiosRequestConfig;

export const apiClient: AxiosInstance = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: apiConfig.withCredentials,
  timeout: apiConfig.requestTimeoutMs,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  if (config.url) {
    config.url = withApiPathPrefix(config.url);
  }

  if (apiConfig.debug) {
    console.debug("[api request]", {
      method: config.method?.toUpperCase(),
      url: `${config.baseURL || ""}${config.url || ""}`,
    });
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    if (apiConfig.debug) {
      console.debug("[api response]", {
        status: response.status,
        method: response.config.method?.toUpperCase(),
        url: `${response.config.baseURL || ""}${response.config.url || ""}`,
      });
    }
    return response;
  },
  (error: unknown) => Promise.reject(normalizeApiError(error))
);

export const apiGet = async <TResponse>(
  url: string,
  config?: ApiRequestConfig
): Promise<TResponse> => {
  const response = await apiClient.get<TResponse>(url, config);
  return response.data;
};

export const apiPost = async <TResponse, TBody = unknown>(
  url: string,
  body?: TBody,
  config?: ApiRequestConfig
): Promise<TResponse> => {
  const response = await apiClient.post<TResponse>(url, body, config);
  return response.data;
};

export default apiClient;
