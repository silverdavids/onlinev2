import axios, { AxiosError } from "axios";
import type { BackendErrorBody } from "@/src/types/backendDtos";

export type ApiErrorCode =
  | "NETWORK_ERROR"
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "EXPECTATION_FAILED"
  | "REQUEST_FAILED";

export class ApiError extends Error {
  code: ApiErrorCode;
  status?: number;
  details?: string[];
  raw?: unknown;
  silent401?: boolean;

  constructor(message: string, options: {
    code: ApiErrorCode;
    status?: number;
    details?: string[];
    raw?: unknown;
    silent401?: boolean;
  }) {
    super(message);
    this.name = "ApiError";
    this.code = options.code;
    this.status = options.status;
    this.details = options.details;
    this.raw = options.raw;
    this.silent401 = options.silent401;
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const collectValidationMessages = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  if (!isRecord(value)) return [];

  return Object.values(value).flatMap((entry) => {
    if (Array.isArray(entry)) {
      return entry.filter((item): item is string => typeof item === "string");
    }
    return [];
  });
};

const getMessageFromBody = (data: unknown): string | undefined => {
  if (typeof data === "string") return data;
  if (!isRecord(data)) return undefined;

  const body = data as BackendErrorBody;
  return body.Message || body.message || body.Error || body.error || body.detail;
};

const getDetailsFromBody = (data: unknown): string[] => {
  if (Array.isArray(data)) {
    return data.filter((item): item is string => typeof item === "string");
  }
  if (!isRecord(data)) return [];

  const body = data as BackendErrorBody;
  return [
    ...collectValidationMessages(body.ModelState),
    ...collectValidationMessages(body.errors),
  ];
};

const statusToCode = (status: number): ApiErrorCode => {
  if (status === 400) return "BAD_REQUEST";
  if (status === 401) return "UNAUTHORIZED";
  if (status === 417) return "EXPECTATION_FAILED";
  return "REQUEST_FAILED";
};

const messageForStatus = (error: AxiosError): string => {
  const status = error.response?.status;
  const data = error.response?.data;
  const details = getDetailsFromBody(data);
  const bodyMessage = getMessageFromBody(data);

  if (details.length > 0) return details[0];
  if (bodyMessage) return bodyMessage;
  if (status === 400) return "Bad request";
  if (status === 401) return "You need to sign in";
  if (status === 417) return "Request failed";
  return status ? `Request failed (${status})` : error.message || "Network error";
};

export const normalizeApiError = (error: unknown): ApiError => {
  if (error instanceof ApiError) return error;

  if (!axios.isAxiosError(error)) {
    return new ApiError(error instanceof Error ? error.message : "Request failed", {
      code: "REQUEST_FAILED",
      raw: error,
    });
  }

  if (!error.response) {
    return new ApiError(error.message || "Network error", {
      code: "NETWORK_ERROR",
      raw: error,
    });
  }

  const status = error.response.status;
  return new ApiError(messageForStatus(error), {
    code: statusToCode(status),
    status,
    details: getDetailsFromBody(error.response.data),
    raw: error.response.data,
    silent401: status === 401,
  });
};
