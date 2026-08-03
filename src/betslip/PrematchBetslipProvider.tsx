"use client";

import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ApiError, normalizeApiError } from "@/src/api/apiError";
import { prematchTicketApi } from "@/src/api/prematchTicketApi";
import { useAccount } from "@/src/account/useAccount";
import { useActiveMatches } from "@/src/matches/useActiveMatches";
import { useAuth } from "@/src/auth/useAuth";
import { useOnlineSettings } from "@/src/settings/useOnlineSettings";
import type {
  PrematchFixture,
  PrematchMarket,
  PrematchSelection,
} from "@/src/domain/prematch";
import type {
  BookingLookupDto,
  BookingSelectionDto,
  PrematchTicketRequest,
  TicketChangedOddDto,
  TicketReceiptDto,
  TicketResultDto,
  ReceiptListItemDto,
} from "@/src/api/prematchTicketApi";

const STORAGE_KEY = "smartbet.prematchBetslip.v1";
const BOOKING_EXPIRY_MINUTES = 30;

export type BetslipSelectionStatus = "active" | "suspended";

export type SelectedPrematchSelection = {
  key: string;
  display: {
    league: string;
    homeTeamName: string;
    awayTeamName: string;
    kickoff: string;
    marketName: string;
    selectionName: string;
    matchNo: string | null;
    matchOddId: string | null;
  };
  operational: {
    matchId: number | null;
    setNo?: number | null;
    betCategory: string;
    betOption: string;
    line: string | null;
    odd: number;
    bookmakerId: number;
    shortCode: number;
  };
  previousOdd: number | null;
  selectedAt: string;
  status: BetslipSelectionStatus;
  statusMessage: string | null;
};

export type BetslipValidationState = {
  valid: boolean;
  messages: string[];
};

export type BetslipReceiptState = {
  ticketNumber: number | null;
  receiptId: number | null;
  bookingCode: number | null;
  stake: number | null;
  totalOdds: number | null;
  potentialPayout: number | null;
  receiptTime: string | null;
  serial: string | null;
};

export type BetslipBookingConfirmation = {
  bookingCode: number;
  stake: number | null;
  totalOdds: number | null;
  expiresInMinutes: number;
};

export type BetslipChangedOdd = {
  key: string | null;
  matchId: number | null;
  matchOddId: number | null;
  market: string;
  option: string;
  line: string | null;
  oldOdd: number | null;
  newOdd: number | null;
  message: string | null;
};

type PrematchBetslipContextValue = {
  selections: SelectedPrematchSelection[];
  selectionCount: number;
  stakeInput: string;
  stake: number | null;
  totalOdds: number;
  potentialWin: number;
  validation: BetslipValidationState;
  serverMessage: string | null;
  isSubmitting: boolean;
  isBooking: boolean;
  isRetrievingBooking: boolean;
  changedOdds: BetslipChangedOdd[];
  receipt: BetslipReceiptState | null;
  bookingConfirmation: BetslipBookingConfirmation | null;
  loadedBookingCode: number | null;
  isSelected: (matchOddId: string) => boolean;
  toggleSelection: (
    fixture: PrematchFixture,
    market: PrematchMarket,
    selection: PrematchSelection,
    marketName: string,
    selectionName?: string
  ) => void;
  removeSelection: (key: string) => void;
  removeSuspendedSelections: () => void;
  clearSelections: () => void;
  setStakeInput: (value: string) => void;
  placeTicket: () => Promise<void>;
  bookTicket: () => Promise<void>;
  retrieveBooking: (bookingCode: string) => Promise<void>;
  acceptChangedOdds: () => void;
  cancelChangedOdds: () => void;
  clearReceipt: () => void;
};

type PersistedBetslip = {
  selectedByKey: Record<string, SelectedPrematchSelection>;
  stakeInput: string;
};

export const PrematchBetslipContext = createContext<
  PrematchBetslipContextValue | undefined
>(undefined);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const toNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const parsed = Number(value.trim());
  return Number.isFinite(parsed) ? parsed : null;
};

const toPositiveInteger = (value: unknown): number | null => {
  const parsed = toNumber(value);
  if (parsed === null || parsed <= 0) return null;
  return Math.trunc(parsed);
};

const normalizeStakeInput = (value: string): string =>
  value.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1");

const parseStake = (value: string): number | null => {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const roundMoney = (value: number): number => Math.round(value * 100) / 100;

const roundOdds = (value: number): number => Math.round(value * 100) / 100;

const buildSelectionKey = (selection: PrematchSelection): string =>
  selection.matchOddId ||
  [
    selection.betCategory,
    selection.betOption,
    selection.line ?? "",
    selection.bookmakerId ?? "",
  ].join("|");

const getFixtureMatchId = (fixture: PrematchFixture): number | null =>
  toPositiveInteger(fixture.originalMatchId) ??
  toPositiveInteger(fixture.betServiceMatchNo) ??
  toPositiveInteger(fixture.matchId);

const safeStoredSelection = (
  value: unknown
): SelectedPrematchSelection | null => {
  if (!isRecord(value) || !isRecord(value.display) || !isRecord(value.operational)) {
    return null;
  }

  const key = typeof value.key === "string" ? value.key : null;
  const odd = toNumber(value.operational.odd);
  if (!key || odd === null) return null;

  return value as SelectedPrematchSelection;
};

const normalizeSelectionsByFixture = (
  selections: Record<string, SelectedPrematchSelection>
): Record<string, SelectedPrematchSelection> => {
  const groupedByMatchId = new Map<string, [string, SelectedPrematchSelection]>();
  const next: Record<string, SelectedPrematchSelection> = {};

  Object.entries(selections).forEach(([key, selection]) => {
    const matchId = selection.operational.matchId;
    if (!matchId) {
      next[key] = selection;
      return;
    }

    const matchKey = String(matchId);
    const current = groupedByMatchId.get(matchKey);
    if (
      !current ||
      Date.parse(selection.selectedAt) >= Date.parse(current[1].selectedAt)
    ) {
      groupedByMatchId.set(matchKey, [key, selection]);
    }
  });

  groupedByMatchId.forEach(([key, selection]) => {
    next[key] = selection;
  });

  return next;
};

const loadPersistedBetslip = (): PersistedBetslip | null => {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed) || !isRecord(parsed.selectedByKey)) return null;

    const selectedByKey = Object.entries(parsed.selectedByKey).reduce<
      Record<string, SelectedPrematchSelection>
    >((next, [key, value]) => {
      const selection = safeStoredSelection(value);
      if (selection) next[key] = selection;
      return next;
    }, {});

    return {
      selectedByKey: normalizeSelectionsByFixture(selectedByKey),
      stakeInput:
        typeof parsed.stakeInput === "string"
          ? normalizeStakeInput(parsed.stakeInput)
          : "",
    };
  } catch {
    return null;
  }
};

const createSelection = (
  fixture: PrematchFixture,
  selection: PrematchSelection,
  marketName: string,
  selectionName?: string
): SelectedPrematchSelection => {
  const key = buildSelectionKey(selection);
  const matchId = getFixtureMatchId(fixture);
  const bookmakerId = toPositiveInteger(selection.bookmakerId) ?? 0;
  const shortCode =
    toPositiveInteger(fixture.shortCode) ??
    toPositiveInteger(fixture.matchNo) ??
    matchId ??
    0;

  return {
    key,
    display: {
      league: fixture.league,
      homeTeamName: fixture.homeTeamName,
      awayTeamName: fixture.awayTeamName,
      kickoff: fixture.displayStartTime,
      marketName,
      selectionName: selectionName ?? selection.betOption,
      matchNo: fixture.matchNo,
      matchOddId: selection.matchOddId,
    },
    operational: {
      matchId,
      setNo: toPositiveInteger(fixture.setNo),
      betCategory: selection.betCategory,
      betOption: selection.betOption,
      line: selection.line,
      odd: selection.odd,
      bookmakerId,
      shortCode,
    },
    previousOdd: null,
    selectedAt: new Date().toISOString(),
    status: "active",
    statusMessage: null,
  };
};

const buildActiveSelectionLookup = (
  matches: PrematchFixture[]
): Map<string, { fixture: PrematchFixture; selection: PrematchSelection }> => {
  const next = new Map<
    string,
    { fixture: PrematchFixture; selection: PrematchSelection }
  >();

  matches.forEach((fixture) => {
    fixture.odds.forEach((selection) => {
      next.set(buildSelectionKey(selection), { fixture, selection });
    });
  });

  return next;
};

const toNullablePositiveInteger = (value: unknown): number | null => {
  const parsed = toPositiveInteger(value);
  return parsed && parsed > 0 ? parsed : null;
};

const getChangedOddValue = <T,>(
  change: TicketChangedOddDto,
  pascalKey: keyof TicketChangedOddDto,
  camelKey: keyof TicketChangedOddDto
): T | undefined => {
  const pascal = change[pascalKey];
  if (pascal !== undefined) return pascal as T;
  return change[camelKey] as T | undefined;
};

const getTicketResultValue = <T,>(
  result: TicketResultDto,
  pascalKey: keyof TicketResultDto,
  camelKey: keyof TicketResultDto
): T | undefined => {
  const pascal = result[pascalKey];
  if (pascal !== undefined) return pascal as T;
  return result[camelKey] as T | undefined;
};

const getReceiptValue = <T,>(
  receipt: TicketReceiptDto,
  pascalKey: keyof TicketReceiptDto,
  camelKey: keyof TicketReceiptDto
): T | undefined => {
  const pascal = receipt[pascalKey];
  if (pascal !== undefined) return pascal as T;
  return receipt[camelKey] as T | undefined;
};

const createTicketRequest = (
  selections: SelectedPrematchSelection[],
  stake: number,
  totalOdds: number,
  bookingCode = 0
): PrematchTicketRequest => {
  const setNo =
    selections
      .map((selection) => selection.operational.setNo)
      .find((value): value is number => typeof value === "number" && value > 0) ?? 0;

  return {
    BetData: selections.map((selection) => ({
    BetCategory: selection.operational.betCategory,
    BetOption: selection.operational.betOption,
    BookMakerId: selection.operational.bookmakerId,
    Line: selection.operational.line,
    MatchId: selection.operational.matchId ?? 0,
    MatchOddId: toNullablePositiveInteger(selection.display.matchOddId),
    Odd: selection.operational.odd,
    OptionId: null,
    ShortCode: selection.operational.shortCode,
    IsLive: false,
    Period: 0,
    BetMinute: 0,
    Scores: null,
    HomeScore: 0,
    AwayScore: 0,
  })),
  SetNo: setNo,
  TotalBonus: 0,
  TotalOdd: totalOdds,
  TotalStake: Math.trunc(stake),
  BookingCode: bookingCode,
  IsLive: false,
  BonusId: 0,
  PaymentSource: null,
  PaymentReference: null,
  };
};

const findSelectionForChangedOdd = (
  selectedByKey: Record<string, SelectedPrematchSelection>,
  change: TicketChangedOddDto
): SelectedPrematchSelection | null => {
  const matchOddId = getChangedOddValue<number | null>(
    change,
    "MatchOddId",
    "matchOddId"
  );
  const matchId = getChangedOddValue<number>(change, "MatchId", "matchId");
  const market = getChangedOddValue<string>(
    change,
    "BetCategory",
    "betCategory"
  );
  const option = getChangedOddValue<string>(change, "BetOption", "betOption");
  const line = getChangedOddValue<string | null>(change, "Line", "line");

  return (
    Object.values(selectedByKey).find((selection) => {
      if (
        matchOddId &&
        selection.display.matchOddId &&
        String(matchOddId) === selection.display.matchOddId
      ) {
        return true;
      }

      return (
        matchId === selection.operational.matchId &&
        market === selection.operational.betCategory &&
        option === selection.operational.betOption &&
        String(line ?? "") === String(selection.operational.line ?? "")
      );
    }) ??
    (matchId
      ? Object.values(selectedByKey).find(
          (selection) => matchId === selection.operational.matchId
        )
      : null) ??
    null
  );
};

const mapChangedOdds = (
  selectedByKey: Record<string, SelectedPrematchSelection>,
  changes: TicketChangedOddDto[] | null | undefined
): BetslipChangedOdd[] =>
  (changes ?? []).map((change) => {
    const selection = findSelectionForChangedOdd(selectedByKey, change);
    const matchId =
      getChangedOddValue<number>(change, "MatchId", "matchId") ??
      selection?.operational.matchId ??
      null;
    const matchOddId =
      getChangedOddValue<number | null>(change, "MatchOddId", "matchOddId") ??
      null;
    const market =
      getChangedOddValue<string>(change, "BetCategory", "betCategory") ??
      selection?.operational.betCategory ??
      "";
    const option =
      getChangedOddValue<string>(change, "BetOption", "betOption") ??
      selection?.operational.betOption ??
      "";
    const newOdd =
      getChangedOddValue<number>(change, "Odd", "odd") ??
      selection?.operational.odd ??
      null;
    const oldOdd =
      getChangedOddValue<number | null>(change, "PostedOdd", "postedOdd") ??
      selection?.operational.odd ??
      null;

    return {
      key: selection?.key ?? null,
      matchId,
      matchOddId,
      market,
      option,
      line:
        getChangedOddValue<string | null>(change, "Line", "line") ??
        selection?.operational.line ??
        null,
      oldOdd,
      newOdd,
      message:
        getChangedOddValue<string | null>(
          change,
          "ValidationError",
          "validationError"
        ) ?? null,
    };
  });

const mapTicketReceipt = (
  receipt: TicketReceiptDto,
  fallbackStake: number,
  fallbackTotalOdds: number,
  fallbackPotentialWin: number
): BetslipReceiptState => ({
  ticketNumber:
    getReceiptValue<number>(receipt, "ReceiptNumber", "receiptNumber") ?? null,
  receiptId:
    getReceiptValue<number>(receipt, "ReceiptNumber", "receiptNumber") ?? null,
  bookingCode:
    getReceiptValue<number>(receipt, "BookingCode", "bookingCode") ?? null,
  stake:
    getReceiptValue<number>(receipt, "Stake", "stake") ?? fallbackStake,
  totalOdds:
    getReceiptValue<number>(receipt, "TotalOdds", "totalOdds") ??
    fallbackTotalOdds,
  potentialPayout: fallbackPotentialWin,
  receiptTime:
    getReceiptValue<string>(receipt, "ReceiptTime", "receiptTime") ?? null,
  serial: getReceiptValue<string>(receipt, "Serial", "serial") ?? null,
});

const mapReceiptListItem = (
  receipt: ReceiptListItemDto,
  fallbackStake: number,
  fallbackTotalOdds: number,
  fallbackPotentialWin: number
): BetslipReceiptState => ({
  ticketNumber: receipt.ReceiptId ?? receipt.receiptId ?? null,
  receiptId: receipt.ReceiptId ?? receipt.receiptId ?? null,
  bookingCode: null,
  stake: receipt.Stake ?? receipt.stake ?? fallbackStake,
  totalOdds: receipt.TotalOdds ?? receipt.totalOdds ?? fallbackTotalOdds,
  potentialPayout: fallbackPotentialWin,
  receiptTime: receipt.ReceiptDate ?? receipt.receiptDate ?? null,
  serial: receipt.SerialCode ?? receipt.serialCode ?? null,
});

const getBookingValue = <T,>(
  booking: BookingLookupDto,
  pascalKey: keyof BookingLookupDto,
  camelKey: keyof BookingLookupDto
): T | undefined => {
  const pascal = booking[pascalKey];
  if (pascal !== undefined) return pascal as T;
  return booking[camelKey] as T | undefined;
};

const getBookingSelectionValue = <T,>(
  selection: BookingSelectionDto,
  pascalKey: keyof BookingSelectionDto,
  camelKey: keyof BookingSelectionDto
): T | undefined => {
  const pascal = selection[pascalKey];
  if (pascal !== undefined) return pascal as T;
  return selection[camelKey] as T | undefined;
};

const normalizeLineValue = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  if (!text) return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? String(parsed) : text;
};

const findFixtureByMatchId = (
  matches: PrematchFixture[],
  matchId: number | null
): PrematchFixture | null => {
  if (!matchId) return null;
  return (
    matches.find((fixture) => getFixtureMatchId(fixture) === matchId) ?? null
  );
};

const findActiveSelectionForBooking = (
  matches: PrematchFixture[],
  bookingSelection: BookingSelectionDto
): { fixture: PrematchFixture; selection: PrematchSelection } | null => {
  const matchOddId = getBookingSelectionValue<number | null>(
    bookingSelection,
    "MatchOddId",
    "matchOddId"
  );
  const matchId =
    getBookingSelectionValue<number>(bookingSelection, "MatchId", "matchId") ??
    null;
  const market =
    getBookingSelectionValue<string>(bookingSelection, "BetCategory", "betCategory") ??
    getBookingSelectionValue<string>(bookingSelection, "Market", "market") ??
    "";
  const option =
    getBookingSelectionValue<string>(bookingSelection, "BetOption", "betOption") ??
    getBookingSelectionValue<string>(bookingSelection, "Option", "option") ??
    "";
  const line = normalizeLineValue(
    getBookingSelectionValue<string | null>(bookingSelection, "Line", "line")
  );
  const bookmakerId =
    getBookingSelectionValue<number>(bookingSelection, "BookMakerId", "bookMakerId") ??
    getBookingSelectionValue<number>(bookingSelection, "BookMakerId", "bookmakerId") ??
    null;

  for (const fixture of matches) {
    if (matchId && getFixtureMatchId(fixture) !== matchId) continue;

    const byId =
      matchOddId !== null && matchOddId !== undefined
        ? fixture.odds.find(
            (selection) => String(matchOddId) === selection.matchOddId
          )
        : null;
    if (byId) return { fixture, selection: byId };

    const byFields = fixture.odds.find(
      (selection) =>
        selection.betCategory === market &&
        selection.betOption === option &&
        normalizeLineValue(selection.line) === line &&
        (bookmakerId === null ||
          toPositiveInteger(selection.bookmakerId) === bookmakerId)
    );
    if (byFields) return { fixture, selection: byFields };
  }

  return null;
};

const createSuspendedBookingSelection = (
  bookingSelection: BookingSelectionDto,
  fixture: PrematchFixture | null,
  index: number
): SelectedPrematchSelection => {
  const matchId =
    getBookingSelectionValue<number>(bookingSelection, "MatchId", "matchId") ??
    null;
  const market =
    getBookingSelectionValue<string>(bookingSelection, "BetCategory", "betCategory") ??
    getBookingSelectionValue<string>(bookingSelection, "Market", "market") ??
    "";
  const option =
    getBookingSelectionValue<string>(bookingSelection, "BetOption", "betOption") ??
    getBookingSelectionValue<string>(bookingSelection, "Option", "option") ??
    "";
  const matchOddId =
    getBookingSelectionValue<number | null>(
      bookingSelection,
      "MatchOddId",
      "matchOddId"
    ) ?? null;
  const odd =
    getBookingSelectionValue<number>(bookingSelection, "Odd", "odd") ??
    getBookingSelectionValue<number>(bookingSelection, "BetOdd", "betOdd") ??
    0;
  const key =
    matchOddId !== null
      ? String(matchOddId)
      : `booking|${matchId ?? index}|${market}|${option}|${
          normalizeLineValue(
            getBookingSelectionValue<string | null>(
              bookingSelection,
              "Line",
              "line"
            )
          ) ?? ""
        }`;

  return {
    key,
    display: {
      league: fixture?.league ?? "",
      homeTeamName: fixture?.homeTeamName ?? `Match ${matchId ?? index + 1}`,
      awayTeamName: fixture?.awayTeamName ?? "Unavailable selection",
      kickoff: fixture?.displayStartTime ?? "",
      marketName: market,
      selectionName: option,
      matchNo: fixture?.matchNo ?? null,
      matchOddId: matchOddId !== null ? String(matchOddId) : null,
    },
    operational: {
      matchId,
      setNo:
        fixture?.setNo !== undefined
          ? toPositiveInteger(fixture.setNo)
          : getBookingSelectionValue<number | null>(
              bookingSelection,
              "SetNo",
              "setNo"
            ) ?? null,
      betCategory: market,
      betOption: option,
      line: getBookingSelectionValue<string | null>(bookingSelection, "Line", "line") ?? null,
      odd,
      bookmakerId:
        getBookingSelectionValue<number>(
          bookingSelection,
          "BookMakerId",
          "bookMakerId"
        ) ??
        getBookingSelectionValue<number>(
          bookingSelection,
          "BookMakerId",
          "bookmakerId"
        ) ??
        0,
      shortCode:
        getBookingSelectionValue<number | null>(
          bookingSelection,
          "ShortCode",
          "shortCode"
        ) ?? 0,
    },
    previousOdd: null,
    selectedAt: new Date().toISOString(),
    status: "suspended",
    statusMessage: "This booked selection is no longer available in the active feed.",
  };
};

const mapBookingSelectionsToBetslip = (
  booking: BookingLookupDto,
  matches: PrematchFixture[]
): Record<string, SelectedPrematchSelection> => {
  const gameBets =
    getBookingValue<BookingSelectionDto[]>(booking, "GameBets", "gameBets") ?? [];

  return normalizeSelectionsByFixture(
    gameBets.reduce<Record<string, SelectedPrematchSelection>>(
      (next, bookingSelection, index) => {
        const activeSelection = findActiveSelectionForBooking(matches, bookingSelection);
        const selected = activeSelection
          ? createSelection(
              activeSelection.fixture,
              activeSelection.selection,
              activeSelection.selection.betCategory,
              activeSelection.selection.betOption
            )
          : createSuspendedBookingSelection(
              bookingSelection,
              findFixtureByMatchId(
                matches,
                getBookingSelectionValue<number>(
                  bookingSelection,
                  "MatchId",
                  "matchId"
                ) ?? null
              ),
              index
            );

        next[selected.key] = selected;
        return next;
      },
      {}
    )
  );
};

const getFeedChangedOdds = (
  selectedByKey: Record<string, SelectedPrematchSelection>,
  activeSelectionsByKey: Map<
    string,
    { fixture: PrematchFixture; selection: PrematchSelection }
  >
): BetslipChangedOdd[] =>
  Object.entries(selectedByKey).reduce<BetslipChangedOdd[]>(
    (changes, [key, selected]) => {
      const activeSelection = activeSelectionsByKey.get(key);
      if (!activeSelection || activeSelection.selection.odd === selected.operational.odd) {
        return changes;
      }

      changes.push({
        key,
        matchId: selected.operational.matchId,
        matchOddId: toNullablePositiveInteger(selected.display.matchOddId),
        market: selected.operational.betCategory,
        option: selected.operational.betOption,
        line: selected.operational.line,
        oldOdd: selected.operational.odd,
        newOdd: activeSelection.selection.odd,
        message: null,
      });
      return changes;
    },
    []
  );

const markUnavailableSelections = (
  selectedByKey: Record<string, SelectedPrematchSelection>,
  activeSelectionsByKey: Map<
    string,
    { fixture: PrematchFixture; selection: PrematchSelection }
  >
): Record<string, SelectedPrematchSelection> => {
  let changed = false;
  const next = { ...selectedByKey };

  Object.entries(next).forEach(([key, selected]) => {
    if (activeSelectionsByKey.has(key)) return;

    next[key] = {
      ...selected,
      status: "suspended",
      statusMessage: "This selection is no longer available in the active feed.",
    };
    changed = true;
  });

  return changed ? next : selectedByKey;
};

export const PrematchBetslipProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { isAuthenticated, refreshSession, user } = useAuth();
  const { refreshAccount } = useAccount();
  const { matches, refresh } = useActiveMatches();
  const { minStake, maxStake, maxPayout } = useOnlineSettings();
  const restoredRef = useRef(false);
  const [selectedByKey, setSelectedByKey] = useState<
    Record<string, SelectedPrematchSelection>
  >({});
  const [stakeInput, setStakeInputState] = useState("");
  const [serverMessage, setServerMessage] = useState<string | null>(null);
  const [changedOdds, setChangedOdds] = useState<BetslipChangedOdd[]>([]);
  const [receipt, setReceipt] = useState<BetslipReceiptState | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [isRetrievingBooking, setIsRetrievingBooking] = useState(false);
  const [bookingConfirmation, setBookingConfirmation] =
    useState<BetslipBookingConfirmation | null>(null);
  const [loadedBookingCode, setLoadedBookingCode] = useState<number | null>(null);

  useEffect(() => {
    const persisted = loadPersistedBetslip();
    if (!persisted) {
      restoredRef.current = true;
      return;
    }

    setSelectedByKey(persisted.selectedByKey);
    setStakeInputState(persisted.stakeInput);
    restoredRef.current = true;
  }, []);

  useEffect(() => {
    if (!restoredRef.current || typeof window === "undefined") return;

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ selectedByKey, stakeInput })
    );
  }, [selectedByKey, stakeInput]);

  const activeSelectionsByKey = useMemo(() => {
    return buildActiveSelectionLookup(matches);
  }, [matches]);

  useEffect(() => {
    setSelectedByKey((current) => {
      let changed = false;
      const next = { ...current };

      Object.entries(next).forEach(([key, existing]) => {
        const activeSelection = activeSelectionsByKey.get(key);

        if (!activeSelection) {
          if (existing.status !== "suspended") {
            next[key] = {
              ...existing,
              status: "suspended",
              statusMessage:
                "This selection is no longer available in the active feed.",
            };
            changed = true;
          }
          return;
        }

        const { fixture, selection } = activeSelection;
        const nextMatchId = getFixtureMatchId(fixture);
        const nextSetNo = toPositiveInteger(fixture.setNo);
        const nextBookmakerId = toPositiveInteger(selection.bookmakerId) ?? 0;
        const nextShortCode =
          toPositiveInteger(fixture.shortCode) ??
          toPositiveInteger(fixture.matchNo) ??
          existing.operational.shortCode;

        if (
          existing.operational.odd !== selection.odd ||
          existing.operational.matchId !== nextMatchId ||
          existing.operational.setNo !== nextSetNo ||
          existing.operational.bookmakerId !== nextBookmakerId ||
          existing.operational.shortCode !== nextShortCode ||
          existing.status !== "active"
        ) {
          next[key] = {
            ...existing,
            display: {
              ...existing.display,
              league: fixture.league,
              homeTeamName: fixture.homeTeamName,
              awayTeamName: fixture.awayTeamName,
              kickoff: fixture.displayStartTime,
              matchNo: fixture.matchNo,
              matchOddId: selection.matchOddId,
            },
            operational: {
              ...existing.operational,
              matchId: nextMatchId,
              setNo: nextSetNo,
              bookmakerId: nextBookmakerId,
              odd: selection.odd,
              shortCode: nextShortCode,
            },
            previousOdd:
              existing.operational.odd !== selection.odd
                ? existing.operational.odd
                : existing.previousOdd,
            status: "active",
            statusMessage: null,
          };
          changed = true;
        }
      });

      return changed ? next : current;
    });
  }, [activeSelectionsByKey]);

  const selections = useMemo(
    () => Object.values(selectedByKey),
    [selectedByKey]
  );
  const stake = useMemo(() => parseStake(stakeInput), [stakeInput]);
  const totalOdds = useMemo(() => {
    if (selections.length === 0) return 0;
    return roundOdds(
      selections.reduce((total, selection) => total * selection.operational.odd, 1)
    );
  }, [selections]);
  const potentialWin = useMemo(() => {
    if (stake === null || stake <= 0 || totalOdds <= 0) return 0;
    const payout = stake * totalOdds;
    return roundMoney(maxPayout && payout > maxPayout ? maxPayout : payout);
  }, [maxPayout, stake, totalOdds]);

  const validation = useMemo<BetslipValidationState>(() => {
    const messages: string[] = [];

    if (selections.length === 0) {
      messages.push("Add at least one selection.");
    }

    if (selections.some((selection) => selection.status === "suspended")) {
      messages.push("Remove suspended selections before continuing.");
    }

    if (stake === null || stake <= 0) {
      messages.push("Enter a stake.");
    } else {
      if (minStake !== null && stake < minStake) {
        messages.push(`Minimum stake is ${minStake}.`);
      }
      if (maxStake !== null && stake > maxStake) {
        messages.push(`Maximum stake is ${maxStake}.`);
      }
    }

    selections.forEach((selection) => {
      if (!selection.operational.matchId) {
        messages.push(
          `${selection.display.homeTeamName} vs ${selection.display.awayTeamName} is missing MatchId.`
        );
      }
      if (!selection.operational.betCategory || !selection.operational.betOption) {
        messages.push(
          `${selection.display.homeTeamName} vs ${selection.display.awayTeamName} is missing market data.`
        );
      }
      if (!Number.isFinite(selection.operational.odd) || selection.operational.odd <= 0) {
        messages.push(
          `${selection.display.homeTeamName} vs ${selection.display.awayTeamName} has invalid odds.`
        );
      }
    });

    if (changedOdds.length > 0) {
      messages.push("Review changed odds before continuing.");
    }

    return {
      valid: messages.length === 0,
      messages,
    };
  }, [changedOdds.length, maxStake, minStake, selections, stake]);

  const setStakeInput = useCallback((value: string) => {
    setStakeInputState(normalizeStakeInput(value));
    setServerMessage(null);
    setReceipt(null);
    setBookingConfirmation(null);
    setLoadedBookingCode(null);
  }, []);

  const clearSelections = useCallback(() => {
    setSelectedByKey({});
    setChangedOdds([]);
    setServerMessage(null);
    setReceipt(null);
    setBookingConfirmation(null);
    setLoadedBookingCode(null);
  }, []);

  const clearReceipt = useCallback(() => {
    setReceipt(null);
    setBookingConfirmation(null);
    setServerMessage(null);
  }, []);

  const removeSelection = useCallback((key: string) => {
    setSelectedByKey((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
    setChangedOdds((current) => current.filter((change) => change.key !== key));
    setReceipt(null);
    setBookingConfirmation(null);
    setLoadedBookingCode(null);
  }, []);

  const removeSuspendedSelections = useCallback(() => {
    setSelectedByKey((current) => {
      const next = Object.entries(current).reduce<
        Record<string, SelectedPrematchSelection>
      >((result, [key, selection]) => {
        if (selection.status !== "suspended") {
          result[key] = selection;
        }
        return result;
      }, {});

      return next;
    });
    setChangedOdds((current) =>
      current.filter((change) => {
        if (!change.key) return true;
        return selectedByKey[change.key]?.status !== "suspended";
      })
    );
    setServerMessage(null);
    setBookingConfirmation(null);
  }, [selectedByKey]);

  const toggleSelection = useCallback(
    (
      fixture: PrematchFixture,
      market: PrematchMarket,
      selection: PrematchSelection,
      marketName: string,
      selectionName?: string
    ) => {
      const key = buildSelectionKey(selection);
      const fixtureMatchId = getFixtureMatchId(fixture);
      setServerMessage(null);
      setReceipt(null);
      setBookingConfirmation(null);
      setLoadedBookingCode(null);
      setChangedOdds((current) =>
        current.filter((change) => {
          if (change.key === key) return false;
          if (fixtureMatchId !== null && change.matchId === fixtureMatchId) {
            return false;
          }
          return true;
        })
      );
      setSelectedByKey((current) => {
        if (current[key]) {
          const next = { ...current };
          delete next[key];
          return next;
        }

        const next = Object.entries(current).reduce<
          Record<string, SelectedPrematchSelection>
        >((result, [existingKey, existing]) => {
          if (
            fixtureMatchId !== null &&
            existing.operational.matchId === fixtureMatchId
          ) {
            return result;
          }

          result[existingKey] = existing;
          return result;
        }, {});

        next[key] = createSelection(
          fixture,
          selection,
          marketName,
          selectionName
        );

        return {
          ...next,
        };
      });
    },
    []
  );

  const bookTicket = useCallback(async () => {
    if (isBooking) return;

    if (!validation.valid || stake === null || stake <= 0) {
      setServerMessage(validation.messages[0] ?? "Review the betslip before booking.");
      return;
    }

    setIsBooking(true);
    setServerMessage(null);
    setReceipt(null);
    setBookingConfirmation(null);

    try {
      const refreshedMatches = await refresh();
      const refreshedSelectionsByKey = buildActiveSelectionLookup(refreshedMatches);
      const unavailableSelections = Object.values(selectedByKey).filter(
        (selection) => !refreshedSelectionsByKey.has(selection.key)
      );
      if (unavailableSelections.length > 0) {
        setSelectedByKey((current) =>
          markUnavailableSelections(current, refreshedSelectionsByKey)
        );
        setServerMessage("Remove suspended selections before booking this slip.");
        return;
      }

      const feedChangedOdds = getFeedChangedOdds(
        selectedByKey,
        refreshedSelectionsByKey
      );
      if (feedChangedOdds.length > 0) {
        setChangedOdds(feedChangedOdds);
        setServerMessage("Odds changed. Review and accept the new odds before booking.");
        return;
      }

      const currentSelections = Object.values(selectedByKey);
      const request = createTicketRequest(currentSelections, stake, totalOdds);
      const result = await prematchTicketApi.createBooking(request);

      const resultChangedOdds = mapChangedOdds(
        selectedByKey,
        getTicketResultValue<TicketChangedOddDto[] | null>(
          result,
          "ChangedOdds",
          "changedOdds"
        )
      );

      if (resultChangedOdds.length > 0) {
        setChangedOdds(resultChangedOdds);
        setServerMessage("Odds changed. Review and accept the new odds before booking.");
        return;
      }

      if (getTicketResultValue<boolean>(result, "Succeeded", "succeeded") === false) {
        setServerMessage(
          getTicketResultValue<string | null>(result, "Message", "message") ??
            "Ticket booking failed."
        );
        return;
      }

      const jsonData = getTicketResultValue<TicketReceiptDto | null>(
        result,
        "JsonData",
        "jsonData"
      );
      const bookingCode = jsonData
        ? getReceiptValue<number>(jsonData, "BookingCode", "bookingCode")
        : null;

      if (!bookingCode) {
        setServerMessage("Ticket booking failed.");
        return;
      }

      setBookingConfirmation({
        bookingCode,
        stake,
        totalOdds,
        expiresInMinutes: BOOKING_EXPIRY_MINUTES,
      });
      setLoadedBookingCode(bookingCode);
      setServerMessage("Booking saved successfully.");
    } catch (error) {
      const apiError = normalizeApiError(error);
      if (apiError instanceof ApiError && apiError.status === 401) {
        await refreshSession().catch(() => undefined);
        setServerMessage("Your session has expired. Please log in again.");
        return;
      }

      const rawResult = isRecord(apiError.raw)
        ? (apiError.raw as TicketResultDto)
        : null;
      const resultChangedOdds = mapChangedOdds(
        selectedByKey,
        rawResult
          ? getTicketResultValue<TicketChangedOddDto[] | null>(
              rawResult,
              "ChangedOdds",
              "changedOdds"
            )
          : null
      );

      if (resultChangedOdds.length > 0) {
        setChangedOdds(resultChangedOdds);
        setServerMessage("Odds changed. Review and accept the new odds before booking.");
        return;
      }

      setServerMessage(
        rawResult
          ? getTicketResultValue<string | null>(rawResult, "Message", "message") ??
              apiError.message
          : apiError.message
      );
    } finally {
      setIsBooking(false);
    }
  }, [
    isBooking,
    refresh,
    refreshSession,
    selectedByKey,
    stake,
    totalOdds,
    validation.messages,
    validation.valid,
  ]);

  const retrieveBooking = useCallback(
    async (bookingCodeInput: string) => {
      if (isRetrievingBooking) return;

      const bookingCode = toPositiveInteger(bookingCodeInput);
      if (!bookingCode) {
        setServerMessage("Enter a valid booking code.");
        return;
      }

      setIsRetrievingBooking(true);
      setServerMessage(null);
      setReceipt(null);
      setBookingConfirmation(null);

      try {
        const [booking, refreshedMatches] = await Promise.all([
          prematchTicketApi.getBooking(bookingCode),
          refresh(),
        ]);
        const selected = mapBookingSelectionsToBetslip(booking, refreshedMatches);
        const bookingSelections = Object.values(selected);

        if (bookingSelections.length === 0) {
          setServerMessage("Booking not found, expired, or already used.");
          return;
        }

        const bookedStake =
          getBookingValue<number>(booking, "Stake", "stake") ??
          getBookingValue<number>(booking, "TotalStake", "totalStake") ??
          null;
        const totalOdd = roundOdds(
          bookingSelections.reduce(
            (total, selection) => total * selection.operational.odd,
            1
          )
        );
        const feedChangedOdds = getFeedChangedOdds(
          selected,
          buildActiveSelectionLookup(refreshedMatches)
        );

        setSelectedByKey(selected);
        setStakeInputState(
          bookedStake !== null && Number.isFinite(bookedStake) && bookedStake > 0
            ? String(Math.trunc(bookedStake))
            : ""
        );
        setLoadedBookingCode(bookingCode);
        setChangedOdds(feedChangedOdds);
        setServerMessage(
          feedChangedOdds.length > 0
            ? "Booking loaded. Review changed odds before placing."
            : "Booking loaded."
        );
        setBookingConfirmation({
          bookingCode,
          stake:
            bookedStake !== null && Number.isFinite(bookedStake)
              ? bookedStake
              : null,
          totalOdds: totalOdd,
          expiresInMinutes: BOOKING_EXPIRY_MINUTES,
        });
      } catch (error) {
        const apiError = normalizeApiError(error);
        if (apiError instanceof ApiError && apiError.status === 401) {
          await refreshSession().catch(() => undefined);
          setServerMessage("Your session has expired. Please log in again.");
          return;
        }

        setServerMessage(
          apiError.message || "Booking not found, expired, or already used."
        );
      } finally {
        setIsRetrievingBooking(false);
      }
    },
    [isRetrievingBooking, refresh, refreshSession]
  );

  const placeTicket = useCallback(async () => {
    if (isSubmitting) return;

    if (!isAuthenticated) {
      setServerMessage("You need to sign in before placing a ticket.");
      return;
    }

    if (!validation.valid || stake === null || stake <= 0) {
      setServerMessage(validation.messages[0] ?? "Review the betslip before placing.");
      return;
    }

    setIsSubmitting(true);
    setServerMessage(null);
    setReceipt(null);

    try {
      const refreshedMatches = await refresh();
      const refreshedSelectionsByKey = buildActiveSelectionLookup(refreshedMatches);
      const unavailableSelections = Object.values(selectedByKey).filter(
        (selection) => !refreshedSelectionsByKey.has(selection.key)
      );
      if (unavailableSelections.length > 0) {
        setSelectedByKey((current) =>
          markUnavailableSelections(current, refreshedSelectionsByKey)
        );
        setServerMessage("Remove suspended selections before placing this ticket.");
        return;
      }

      const feedChangedOdds = getFeedChangedOdds(
        selectedByKey,
        refreshedSelectionsByKey
      );
      if (feedChangedOdds.length > 0) {
        setChangedOdds(feedChangedOdds);
        setServerMessage("Odds changed. Review and accept the new odds before placing.");
        return;
      }

      const currentSelections = Object.values(selectedByKey);
      if (currentSelections.some((selection) => selection.status === "suspended")) {
        setServerMessage("Remove suspended selections before placing this ticket.");
        return;
      }

      const request = createTicketRequest(
        currentSelections,
        stake,
        totalOdds,
        loadedBookingCode ?? 0
      );
      const result = await prematchTicketApi.placeTicket(request);

      const resultChangedOdds = mapChangedOdds(
        selectedByKey,
        getTicketResultValue<TicketChangedOddDto[] | null>(
          result ?? {},
          "ChangedOdds",
          "changedOdds"
        )
      );

      if (resultChangedOdds.length > 0) {
        setChangedOdds(resultChangedOdds);
        setServerMessage("Odds changed. Review and accept the new odds before placing.");
        return;
      }

      if (result && getTicketResultValue<boolean>(result, "Succeeded", "succeeded") === false) {
        setServerMessage(
          getTicketResultValue<string | null>(result, "Message", "message") ??
            "Ticket placement failed."
        );
        return;
      }

      const jsonData = result
        ? getTicketResultValue<TicketReceiptDto | null>(
            result,
            "JsonData",
            "jsonData"
          )
        : null;
      let nextReceipt = jsonData
        ? mapTicketReceipt(jsonData, stake, totalOdds, potentialWin)
        : null;

      if (!nextReceipt) {
        const latestReceipt = await prematchTicketApi
          .getLatestReceipt(user?.id)
          .catch(() => null);
        if (latestReceipt) {
          nextReceipt = mapReceiptListItem(
            latestReceipt,
            stake,
            totalOdds,
            potentialWin
          );
        }
      }

      setReceipt(
        nextReceipt ?? {
          ticketNumber: null,
          receiptId: null,
          bookingCode: null,
          stake,
          totalOdds,
          potentialPayout: potentialWin,
          receiptTime: null,
          serial: null,
        }
      );
      setSelectedByKey({});
      setStakeInputState("");
      setChangedOdds([]);
      setBookingConfirmation(null);
      setLoadedBookingCode(null);
      setServerMessage("Ticket placed successfully.");
      void refreshAccount().catch(() => undefined);
    } catch (error) {
      const apiError = normalizeApiError(error);
      if (apiError instanceof ApiError && apiError.status === 401) {
        await refreshSession().catch(() => undefined);
        setServerMessage("Your session has expired. Please log in again.");
        return;
      }

      const rawResult = isRecord(apiError.raw)
        ? (apiError.raw as TicketResultDto)
        : null;
      const resultChangedOdds = mapChangedOdds(
        selectedByKey,
        rawResult
          ? getTicketResultValue<TicketChangedOddDto[] | null>(
              rawResult,
              "ChangedOdds",
              "changedOdds"
            )
          : null
      );

      if (resultChangedOdds.length > 0) {
        setChangedOdds(resultChangedOdds);
        setServerMessage("Odds changed. Review and accept the new odds before placing.");
        return;
      }

      setServerMessage(
        rawResult
          ? getTicketResultValue<string | null>(rawResult, "Message", "message") ??
              apiError.message
          : apiError.message
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [
    isAuthenticated,
    isSubmitting,
    potentialWin,
    refresh,
    refreshAccount,
    refreshSession,
    selectedByKey,
    stake,
    totalOdds,
    loadedBookingCode,
    user?.id,
    validation.messages,
    validation.valid,
  ]);

  const acceptChangedOdds = useCallback(() => {
    setSelectedByKey((current) => {
      let changed = false;
      const next = { ...current };
      changedOdds.forEach((change) => {
        if (!change.key || change.newOdd === null || !next[change.key]) return;
        const existing = next[change.key];
        next[change.key] = {
          ...existing,
          previousOdd: existing.operational.odd,
          operational: {
            ...existing.operational,
            odd: change.newOdd,
          },
          display: {
            ...existing.display,
            matchOddId:
              change.matchOddId !== null
                ? String(change.matchOddId)
                : existing.display.matchOddId,
          },
        };
        changed = true;
      });
      return changed ? next : current;
    });
    setChangedOdds([]);
    setServerMessage(null);
    setReceipt(null);
    setLoadedBookingCode(null);
  }, [changedOdds]);

  const cancelChangedOdds = useCallback(() => {
    setChangedOdds([]);
    setServerMessage(null);
  }, []);

  const value = useMemo<PrematchBetslipContextValue>(
    () => ({
      selections,
      selectionCount: selections.length,
      stakeInput,
      stake,
      totalOdds,
      potentialWin,
      validation,
      serverMessage,
      isSubmitting,
      isBooking,
      isRetrievingBooking,
      changedOdds,
      receipt,
      bookingConfirmation,
      loadedBookingCode,
      isSelected: (matchOddId: string) => Boolean(selectedByKey[matchOddId]),
      toggleSelection,
      removeSelection,
      removeSuspendedSelections,
      clearSelections,
      setStakeInput,
      placeTicket,
      bookTicket,
      retrieveBooking,
      acceptChangedOdds,
      cancelChangedOdds,
      clearReceipt,
    }),
    [
      acceptChangedOdds,
      cancelChangedOdds,
      changedOdds,
      clearReceipt,
      clearSelections,
      bookTicket,
      bookingConfirmation,
      isSubmitting,
      isBooking,
      isRetrievingBooking,
      loadedBookingCode,
      placeTicket,
      potentialWin,
      receipt,
      removeSelection,
      removeSuspendedSelections,
      retrieveBooking,
      selectedByKey,
      selections,
      serverMessage,
      setStakeInput,
      stake,
      stakeInput,
      toggleSelection,
      totalOdds,
      validation,
    ]
  );

  return (
    <PrematchBetslipContext.Provider value={value}>
      {children}
    </PrematchBetslipContext.Provider>
  );
};

export { BOOKING_EXPIRY_MINUTES };
