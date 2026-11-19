/** Adapters for backend develop 9259d012; these do not call or change the backend. */
export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Invalid SmartBet response.");
  return value as Record<string, unknown>;
}
export function finite(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value))
    throw new Error("Invalid SmartBet amount or odds.");
  return value;
}
export function reference(value: unknown): string {
  if (typeof value === "number" && !Number.isFinite(value))
    throw new Error("Invalid SmartBet reference.");
  if ((typeof value !== "string" && typeof value !== "number") || !String(value).trim())
    throw new Error("Missing SmartBet reference.");
  return String(value);
}
export function normalizeBooking(value: unknown) {
  const row = object(value);
  if (row["Succeeded"] !== true)
    throw new Error(
      typeof row["Message"] === "string"
        ? row["Message"]
        : "SmartBet did not confirm this booking.",
    );
  const code = object(row["JsonData"])["BookingCode"];
  if (!Number.isSafeInteger(code) || (code as number) <= 0)
    throw new Error("Missing SmartBet booking code.");
  return { success: true, bookingCode: String(code) };
}
export type BackendSelection = {
  id: string;
  matchId: string;
  match: string;
  market: string;
  pick: string;
  odds: number;
  betCategory?: string;
  betOption?: string;
  line?: string | number | null;
  matchOddId?: number;
  bookMakerId?: number;
  isLive?: boolean;
};
export type BackendBetStatus = "open" | "won" | "lost" | "refunded" | "cancelled";
export type BackendBet = {
  id: string;
  code: string;
  placedAt: string;
  stake: number;
  totalOdds: number;
  potential: number;
  status: BackendBetStatus;
  selections: BackendSelection[];
};
export function normalizeSelection(value: unknown): BackendSelection {
  const row = object(value);
  const matchId = reference(row["MatchId"]);
  const market = row["BetCategory"] ?? row["Market"];
  const option = row["BetOption"] ?? row["Option"];
  if (typeof market !== "string" || typeof option !== "string")
    throw new Error("Invalid SmartBet selection.");
  const line = row["Line"];
  const home = row["HomeTeam"] ?? row["HomeTeamName"];
  const away = row["AwayTeam"] ?? row["AwayTeamName"];
  return {
    id: String(row["BetId"] ?? row["MatchOddId"] ?? `${matchId}:${market}:${option}:${line ?? ""}`),
    matchId,
    match:
      typeof home === "string" && typeof away === "string"
        ? `${home} v ${away}`
        : String(row["MatchName"] ?? `Match ${matchId}`),
    market,
    pick: option,
    odds: finite(row["Odd"] ?? row["BetOdd"]),
    betCategory: market,
    betOption: option,
    ...(line === null || typeof line === "number" || typeof line === "string" ? { line } : {}),
    ...(Number.isSafeInteger(row["MatchOddId"]) ? { matchOddId: row["MatchOddId"] as number } : {}),
    ...(Number.isSafeInteger(row["BookMakerId"])
      ? { bookMakerId: row["BookMakerId"] as number }
      : {}),
    isLive: row["IsLive"] === true,
  };
}
export function normalizeBookingSelections(value: unknown): BackendSelection[] {
  const bets = object(value)["GameBets"];
  if (!Array.isArray(bets) || bets.length === 0)
    throw new Error("SmartBet returned no booking selections.");
  return bets.map(normalizeSelection);
}
export function normalizeBet(value: unknown): BackendBet {
  const row = object(value);
  const statuses: Record<number, BackendBetStatus> = {
    [-1]: "cancelled",
    1: "open",
    2: "lost",
    3: "won",
    4: "won",
    5: "refunded",
    6: "refunded",
    7: "refunded",
    8: "refunded",
  };
  const status = statuses[finite(row["ReceiptStatus"])];
  if (!status) throw new Error("Unknown SmartBet receipt status.");
  const stake = finite(row["Stake"]);
  const odds = finite(row["TotalOdds"]);
  const id = reference(row["ReceiptId"]);
  return {
    id,
    code: reference(row["BookingCode"] ?? row["SerialCode"] ?? row["ReceiptId"]),
    placedAt: typeof row["ReceiptDate"] === "string" ? row["ReceiptDate"] : "",
    stake,
    totalOdds: odds,
    // List DTO has no settlement payout; this is the UI's gross potential-return estimate.
    potential:
      row["PossibleReturn"] == null
        ? Math.round(stake * odds * 100) / 100
        : finite(row["PossibleReturn"]),
    status,
    selections: Array.isArray(row["Bets"]) ? row["Bets"].map(normalizeSelection) : [],
  };
}
export function normalizeDepositRequest(value: unknown) {
  const row = object(value);
  return {
    code: reference(row["code"]),
    amount: finite(row["amount"]),
    status: "PENDING",
    message: String(row["message"] ?? ""),
  };
}
export function normalizeDepositStatus(value: unknown) {
  const row = object(value);
  const code = reference(row["Code"]);
  // Numeric ledger state is authoritative. Labels can be customized and must not imply success.
  const status =
    row["Status"] === 2
      ? "SUCCESSFUL"
      : row["Status"] === -1
        ? "FAILED"
        : row["Status"] === 0
          ? "PENDING"
          : "UNKNOWN";
  return {
    code,
    status,
    amount: finite(row["Amount"]),
    ...(row["Balance"] == null ? {} : { balance: finite(row["Balance"]) }),
    ...(typeof row["UpdatedAt"] === "string" ? { updateTime: row["UpdatedAt"] } : {}),
  };
}
export function normalizeBranchWithdrawal(value: unknown) {
  const row = object(value);
  if (row["successful"] !== true) throw new Error("SmartBet did not confirm the branch voucher.");
  return {
    code: reference(row["code"]),
    balance: finite(row["balance"]),
    status: "APPROVED",
    message: String(row["message"] ?? ""),
  };
}
export function normalizeStatement(value: unknown) {
  if (!Array.isArray(value)) throw new Error("Invalid SmartBet statement response.");
  return value.map((item) => {
    const row = object(item);
    const amount = finite(row["Amount"]);
    const direction = row["TransactionType"];
    return {
      TransactionId: reference(row["StatementId"]),
      Date: String(row["StatetmentDate"] ?? ""),
      Type: String(row["Transcation"] ?? direction ?? ""),
      Amount:
        direction === "Debit"
          ? -Math.abs(amount)
          : direction === "Credit"
            ? Math.abs(amount)
            : amount,
      Balance: row["BalAfter"] == null ? null : finite(row["BalAfter"]),
      Description: String(row["Comment"] ?? row["Transcation"] ?? ""),
    };
  });
}
export function pagination(page = 1, itemsPerPage = 100): string {
  if (
    !Number.isSafeInteger(page) ||
    page < 1 ||
    !Number.isSafeInteger(itemsPerPage) ||
    itemsPerPage < 1 ||
    itemsPerPage > 100
  )
    throw new Error("Invalid SmartBet page.");
  return new URLSearchParams({ Page: String(page), ItemsPerPage: String(itemsPerPage) }).toString();
}
export function buildDevelopTicket(
  selections: ReadonlyArray<{
    matchId: string;
    odds: number;
    betCategory?: string;
    betOption?: string;
    bookMakerId?: number;
    matchOddId?: number;
    line?: string | number | null;
    isLive?: boolean;
  }>,
  stake: number,
) {
  if (
    !Number.isSafeInteger(stake) ||
    stake <= 0 ||
    stake > 2147483647 ||
    selections.length === 0 ||
    selections.length > 25
  )
    throw new Error("Enter a whole UGX stake and 1–25 selections.");
  const betData = selections.map((selection) => {
    if (
      !/^[1-9][0-9]*$/.test(selection.matchId) ||
      !Number.isSafeInteger(Number(selection.matchId)) ||
      Number(selection.matchId) > 2147483647 ||
      !Number.isSafeInteger(selection.matchOddId) ||
      !Number.isSafeInteger(selection.bookMakerId) ||
      !selection.betCategory ||
      !selection.betOption ||
      !Number.isFinite(selection.odds) ||
      selection.odds <= 1
    )
      throw new Error(
        "A selection is missing SmartBet market identifiers. Refresh the odds and try again.",
      );
    return {
      betCategory: selection.betCategory,
      betOption: selection.betOption,
      bookMakerId: selection.bookMakerId!,
      line: selection.line == null ? null : String(selection.line),
      matchId: Number(selection.matchId),
      matchOddId: selection.matchOddId!,
      odd: selection.odds,
      IsLive: selection.isLive === true,
    };
  });
  return {
    betData,
    totalBonus: 0,
    totalOdds: Number(
      selections.reduce((total, selection) => total * selection.odds, 1).toFixed(2),
    ),
    totalStake: stake,
    isLive: selections.some((selection) => selection.isLive),
  };
}
