import type {
  TicketDetailsDto,
  TicketHistoryItemDto,
  TicketSelectionDto,
} from "@/src/api/ticketHistoryApi";

export type TicketStatusTone = "pending" | "won" | "lost" | "paid" | "cancelled" | "neutral";

export type TicketStatusView = {
  label: string;
  tone: TicketStatusTone;
};

const numberValue = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const stringValue = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text ? text : null;
};

export const ticketValue = <T,>(
  item: TicketHistoryItemDto | TicketDetailsDto,
  pascalKey: keyof (TicketHistoryItemDto & TicketDetailsDto),
  camelKey: keyof (TicketHistoryItemDto & TicketDetailsDto)
): T | undefined => {
  const record = item as Record<string, unknown>;
  const pascal = record[String(pascalKey)];
  if (pascal !== undefined) return pascal as T;
  return record[String(camelKey)] as T | undefined;
};

export const selectionValue = <T,>(
  item: TicketSelectionDto,
  pascalKey: keyof TicketSelectionDto,
  camelKey: keyof TicketSelectionDto
): T | undefined => {
  const record = item as Record<string, unknown>;
  const pascal = record[String(pascalKey)];
  if (pascal !== undefined) return pascal as T;
  return record[String(camelKey)] as T | undefined;
};

export const statusView = (
  statusCode?: number | null,
  statusName?: string | null
): TicketStatusView => {
  const name = stringValue(statusName);
  switch (statusCode) {
    case -1:
      return { label: name ?? "Cancelled", tone: "cancelled" };
    case 1:
      return { label: name ?? "Pending", tone: "pending" };
    case 2:
      return { label: name ?? "Lost", tone: "lost" };
    case 3:
      return { label: name ?? "Won", tone: "won" };
    case 4:
    case 6:
    case 8:
      return { label: name ?? "Paid", tone: "paid" };
    case 5:
    case 7:
      return { label: name ?? "Refund", tone: "won" };
    default:
      return { label: name ?? "Unknown", tone: "neutral" };
  }
};

export const selectionStatusView = (
  statusCode?: number | null
): TicketStatusView => {
  switch (statusCode) {
    case -2:
      return { label: "Voided", tone: "neutral" };
    case -1:
      return { label: "Postponed", tone: "neutral" };
    case 0:
      return { label: "Pending", tone: "pending" };
    case 1:
      return { label: "Lost", tone: "lost" };
    case 2:
      return { label: "Won", tone: "won" };
    default:
      return { label: "Unknown", tone: "neutral" };
  }
};

export const statusClassName = (tone: TicketStatusTone): string => {
  if (tone === "won" || tone === "paid") return "g1-color";
  if (tone === "lost" || tone === "cancelled") return "r1-color";
  if (tone === "pending") return "text-warning";
  return "text-white-50";
};

export const formatMoney = (value: unknown): string => {
  const amount = numberValue(value);
  if (amount === null) return "-";
  return new Intl.NumberFormat("en-UG", {
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatOdd = (value: unknown): string => {
  const odd = numberValue(value);
  if (odd === null) return "-";
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(odd);
};

export const formatDateTime = (value: unknown): string => {
  const text = stringValue(value);
  if (!text) return "-";
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const possibleReturn = (stake: unknown, totalOdds: unknown): number => {
  const stakeValue = numberValue(stake) ?? 0;
  const oddsValue = numberValue(totalOdds) ?? 0;
  return Math.round(stakeValue * oddsValue * 100) / 100;
};

export const normalizeTicketId = (
  item: TicketHistoryItemDto | TicketDetailsDto
): number | null =>
  numberValue(ticketValue(item, "ReceiptId", "receiptId")) ?? null;

export const normalizeTicketStatus = (
  item: TicketHistoryItemDto | TicketDetailsDto
): TicketStatusView =>
  statusView(
    numberValue(ticketValue(item, "ReceiptStatus", "receiptStatus")),
    ticketValue<string | null>(item, "StatusName", "statusName") ?? null
  );
