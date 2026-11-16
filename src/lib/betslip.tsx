/**
 * betslip.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * GLOBAL BET SLIP STATE (React context).
 *
 * This is the heart of the betting flow:
 *   MatchCard / detail page  →  toggle(Selection)  →  BetSlip UI  →  placeBet() / createBooking()
 *
 * Integrated with:
 * - SmartBet Online Ticket API (POST /api/Ticket)
 * - SmartBet Online Booking API (POST /api/Ticket/Booking)
 * - SmartBet for bookings, ticket placement, and ticket history
 * ─────────────────────────────────────────────────────────────────────────────
 */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { ApiError, smartBetApi, type TicketPayload, type OnlineSettings } from "./api-smartbet";
import { formatUgx } from "./betting-data";
import { useWalletContext } from "./wallet-context";

/** One leg on the slip. `id` must be unique per match+market+outcome. */
export type Selection = {
  id: string;
  matchId: string;
  match: string; // display name, e.g. "Arsenal v Liverpool"
  market: string; // display name, e.g. "1X2"
  pick: string; // display label, e.g. "1"
  odds: number;
  betCategory?: string;
  matchOddId?: number;
  bookMakerId?: number;
  isLive?: boolean;
};

/** A submitted bet ("receipt") shown on the My Bets pages. */
export type PlacedBet = {
  id: string;
  code: string; // booking-style reference shown to the user
  placedAt: string;
  stake: number; // UGX
  totalOdds: number; // combined accumulator odds
  potential: number; // potential payout in UGX
  status: "open" | "won" | "lost";
  selections: Selection[];
};

/** Everything the context exposes to consumers via useBetSlip(). */
type BetSlipContextValue = {
  selections: Selection[];
  stake: number;
  setStake: (v: number) => void;
  toggle: (s: Selection) => void;
  remove: (id: string) => void;
  clear: () => void;
  has: (id: string) => boolean;
  totalOdds: number;
  potentialWin: number;
  bonusPercent: number;
  bonusAmount: number;
  totalReturnWithBonus: number;
  open: boolean; // mobile fullscreen slip visibility
  setOpen: (v: boolean) => void;
  bets: PlacedBet[];
  placeBet: () => PlacedBet | null;
  placeBetAsync: () => Promise<PlacedBet>;
  createBookingAsync: () => Promise<string>;
  loadBookingCode: (code: string) => Promise<{ count: number; totalOdds: number }>;
  loading: boolean;
  settings: OnlineSettings;
};

const BetSlipContext = createContext<BetSlipContextValue | null>(null);

const STORAGE_KEY_SLIP = "smartbet_draft_slip";

/** Provider mounted once in src/routes/__root.tsx around the whole app. */
export function BetSlipProvider({ children }: { children: ReactNode }) {
  const { balance, syncBalance, refresh: refreshWallet } = useWalletContext();
  const [selections, setSelections] = useState<Selection[]>([]);
  const [stake, setStake] = useState(2000); // default stake in UGX
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [bets, setBets] = useState<PlacedBet[]>([]);
  const [settings, setSettings] = useState<OnlineSettings>({
    MinStake: 500,
    MaxStake: 50000000,
    MaxPayOut: 500000000,
  });

  // Load online settings on mount
  useEffect(() => {
    smartBetApi
      .getOnlineSettings()
      .then((cfg) => {
        if (cfg && typeof cfg.MinStake === "number") {
          setSettings(cfg);
        }
      })
      .catch(() => {});
  }, []);

  // Load from localStorage after mount to prevent SSR hydration mismatch
  useEffect(() => {
    try {
      const savedSlip = localStorage.getItem(STORAGE_KEY_SLIP);
      if (savedSlip) {
        const parsed = JSON.parse(savedSlip);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSelections(parsed);
        }
      }
    } catch {
      // Ignore
    }

    // Betting history must come from SmartBet, never a local or Supabase cache.
    smartBetApi.getMyBets().then(
      (myBets) => {
        const remoteTickets: PlacedBet[] = [];
        if (Array.isArray(myBets)) {
          myBets.forEach((value) => {
            if (!value || typeof value !== "object") return;
            const row = value as Record<string, unknown>;
            const idValue = row["ReceiptId"] || row["BookingCode"];
            const codeValue = row["BookingCode"] || row["ReceiptId"];
            const stakeValue = Number(row["Stake"]);
            const oddsValue = Number(row["Odds"]);
            const payoutValue = Number(row["Payout"]);
            const statusValue = String(row["Status"] || "").toLowerCase();
            if (
              !idValue ||
              !codeValue ||
              !Number.isFinite(stakeValue) ||
              !Number.isFinite(oddsValue) ||
              !Number.isFinite(payoutValue) ||
              !["open", "won", "lost"].includes(statusValue)
            )
              return;
            const id = String(idValue);
            const code = String(codeValue);
            const rawSelections = Array.isArray(row["selections"]) ? row["selections"] : [];
            const selections: Selection[] = rawSelections.map((leg: Record<string, unknown>) => ({
              id: String(leg["id"] || ""),
              matchId: String(leg["matchId"] || ""),
              match: String(leg["match"] || leg["MatchName"] || ""),
              market: String(leg["market"] || leg["betCategory"] || ""),
              pick: String(leg["pick"] || leg["betOption"] || ""),
              odds: Number(leg["odds"] ?? leg["odd"]),
            }));
            const dateValue = row["Date"];
            remoteTickets.push({
              id,
              code,
              placedAt: dateValue
                ? new Date(String(dateValue)).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "Recent",
              stake: stakeValue,
              totalOdds: oddsValue,
              potential: payoutValue,
              status: statusValue as "open" | "won" | "lost",
              selections,
            });
          });
        }
        setBets(remoteTickets);
      },
      () => setBets([]),
    );
  }, []);

  // Sync draft slip to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SLIP, JSON.stringify(selections));
    } catch {
      // Ignore storage errors
    }
  }, [selections]);

  /**
   * Add/remove a selection. Tapping the same odds button again removes it;
   * tapping a different outcome in the same market on the same match swaps it.
   */
  const toggle = useCallback((s: Selection) => {
    setSelections((prev) => {
      if (prev.some((p) => p.id === s.id)) return prev.filter((p) => p.id !== s.id);
      return [...prev.filter((p) => p.matchId !== s.matchId || p.market !== s.market), s];
    });
  }, []);

  const remove = useCallback((id: string) => {
    setSelections((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const clear = useCallback(() => setSelections([]), []);

  // Accumulator odds: multiply all leg odds (empty slip = 1).
  const totalOdds = useMemo(() => selections.reduce((acc, s) => acc * s.odds, 1), [selections]);

  const potentialWin = selections.length ? Math.round(stake * totalOdds) : 0;

  // Multi-bet bonus calculation based on selection count (3+ legs qualify for bonus)
  const bonusPercent = useMemo(() => {
    const count = selections.length;
    if (count < 3) return 0;
    if (count === 3) return 3;
    if (count === 4) return 5;
    if (count === 5) return 10;
    if (count <= 7) return 15;
    if (count <= 10) return 25;
    if (count <= 15) return 40;
    if (count <= 20) return 60;
    if (count <= 25) return 80;
    return 100; // 30+ legs = 100% bonus
  }, [selections.length]);

  const bonusAmount = useMemo(() => {
    if (!potentialWin || !bonusPercent) return 0;
    // Net profit = potentialWin - stake
    const netProfit = Math.max(0, potentialWin - stake);
    return Math.round(netProfit * (bonusPercent / 100));
  }, [potentialWin, stake, bonusPercent]);

  const totalReturnWithBonus = potentialWin + bonusAmount;

  /**
   * Build the official TicketPayload required by the SmartBet API.
   */
  const buildTicketPayload = useCallback((): TicketPayload => {
    const isAnyLive = selections.some((s) => s.isLive);
    if (
      selections.some(
        (selection) =>
          !Number.isInteger(Number(selection.matchId)) ||
          !Number.isInteger(selection.matchOddId) ||
          !Number.isInteger(selection.bookMakerId),
      )
    ) {
      throw new Error(
        "A selection is missing SmartBet market identifiers. Refresh the odds and try again.",
      );
    }
    return {
      betData: selections.map((s) => ({
        match: s.match,
        market: s.market,
        betCategory: s.betCategory || (s.market.toLowerCase().includes("goal") ? "ou" : "1x2"),
        betOption: s.pick,
        bookMakerId: s.bookMakerId!,
        line: null,
        matchId: Number(s.matchId),
        matchOddId: s.matchOddId!,
        odd: s.odds,
        IsLive: Boolean(s.isLive),
      })),
      totalBonus: bonusAmount,
      totalOdds: Number(totalOdds.toFixed(2)),
      totalStake: stake,
      isLive: isAnyLive,
    };
  }, [selections, bonusAmount, totalOdds, stake]);

  /**
   * Requests a real booking code from SmartBet.
   */
  const createBookingAsync = useCallback(async (): Promise<string> => {
    if (!selections.length) throw new Error("Bet slip is empty");

    setLoading(true);
    const payload = buildTicketPayload();

    try {
      const res = await smartBetApi.createBooking(payload);
      const code = res.bookingCode || res.BookingCode || res.code || res.Code;
      if (!res.success || !code)
        throw new Error(res.message || "SmartBet did not confirm this booking.");
      return code;
    } finally {
      setLoading(false);
    }
  }, [selections, buildTicketPayload, totalOdds, stake]);

  /**
   * Submits the ticket to SmartBet and accepts only a complete backend receipt.
   */
  const placeBetAsync = useCallback(async (): Promise<PlacedBet> => {
    if (!selections.length) throw new Error("Bet slip is empty");
    if (stake < settings.MinStake) {
      throw new Error(`Minimum stake allowed is ${formatUgx(settings.MinStake)}`);
    }
    if (stake > settings.MaxStake) {
      throw new Error(`Maximum stake allowed is ${formatUgx(settings.MaxStake)}`);
    }
    if (totalReturnWithBonus > settings.MaxPayOut) {
      throw new Error(`Maximum payout limit is ${formatUgx(settings.MaxPayOut)}`);
    }
    if (balance !== null && stake > balance) {
      throw new Error(`Insufficient wallet balance (${formatUgx(balance)} available)`);
    }

    setLoading(true);
    const payload = buildTicketPayload();
    const currentSelections = [...selections];
    const odds = totalOdds;
    const computedPotential = Math.round(stake * odds);

    try {
      let ticketId = "";
      let code = "";

      try {
        const res = await smartBetApi.submitTicket(payload);
        const resObj = res as Record<string, unknown>;
        const id = res.receiptId || resObj["ReceiptId"];
        const bookingCode = res.bookingCode || resObj["BookingCode"];
        if (!res.success || !id || !bookingCode)
          throw new Error(res.message || "SmartBet did not confirm this ticket.");
        ticketId = String(id);
        code = String(bookingCode);
        const remoteBalance =
          typeof res.balance === "number"
            ? res.balance
            : typeof resObj["Balance"] === "number"
              ? (resObj["Balance"] as number)
              : null;
        if (remoteBalance !== null) {
          syncBalance(remoteBalance);
        }
      } catch (err) {
        if (err instanceof ApiError && err.status && err.status >= 400 && err.status < 500) {
          throw err;
        }
        throw err instanceof Error ? err : new Error("Failed to submit bet ticket");
      }

      const placed: PlacedBet = {
        id: ticketId,
        code,
        placedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        stake,
        totalOdds: Number(odds.toFixed(2)),
        potential: computedPotential,
        status: "open",
        selections: currentSelections,
      };

      setBets((prev) => {
        const updated = [
          placed,
          ...prev.filter((b) => b.id !== placed.id && b.code !== placed.code),
        ];
        return updated;
      });
      setSelections([]);
      setOpen(false);

      // Refresh wallet balance & statement
      await refreshWallet();

      return placed;
    } finally {
      setLoading(false);
    }
  }, [
    selections,
    buildTicketPayload,
    totalOdds,
    stake,
    balance,
    settings,
    totalReturnWithBonus,
    syncBalance,
    refreshWallet,
  ]);

  /**
   * Retrieves a booking code from SmartBet and restores selections to slip.
   */
  const loadBookingCode = useCallback(
    async (rawCode: string): Promise<{ count: number; totalOdds: number }> => {
      const clean = rawCode.trim().toUpperCase();
      if (!clean) throw new Error("Please enter a booking code");

      setLoading(true);
      try {
        // Resolve booking details only from SmartBet.
        try {
          const remote = (await smartBetApi.getTicketSelections(clean)) as Array<{
            MatchId: number;
            MatchName?: string;
            BetCategory?: string;
            BetOption?: string;
            Odd?: number;
            MatchOddId?: number;
            BookMakerId?: number;
          }>;

          if (Array.isArray(remote) && remote.length > 0) {
            if (remote.some((leg) => !Number.isFinite(leg.MatchId) || !Number.isFinite(leg.Odd)))
              throw new Error(`Booking code ${clean} returned incomplete selection data`);
            const loaded: Selection[] = remote.map((leg) => ({
              id: `${leg.MatchId}-${leg.BetCategory || ""}-${leg.BetOption || ""}`,
              matchId: String(leg.MatchId),
              match: leg.MatchName || "",
              market: leg.BetCategory || "",
              pick: leg.BetOption || "",
              odds: Number(leg.Odd),
              ...(leg.MatchOddId !== undefined ? { matchOddId: leg.MatchOddId } : {}),
              ...(leg.BookMakerId !== undefined ? { bookMakerId: leg.BookMakerId } : {}),
            }));
            setSelections(loaded);
            setOpen(true);
            const computedOdds = loaded.reduce((acc, s) => acc * s.odds, 1);
            return { count: loaded.length, totalOdds: Number(computedOdds.toFixed(2)) };
          }
        } catch {
          // Fall through
        }

        throw new Error(`Booking code ${clean} was not found`);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /**
   * Synchronous placeBet wrapper for backward compatibility.
   */
  const placeBet = useCallback((): PlacedBet | null => {
    return null;
  }, []);

  const value: BetSlipContextValue = {
    selections,
    stake,
    setStake,
    toggle,
    remove,
    clear,
    has: (id) => selections.some((s) => s.id === id),
    totalOdds,
    potentialWin,
    bonusPercent,
    bonusAmount,
    totalReturnWithBonus,
    open,
    setOpen,
    bets,
    placeBet,
    placeBetAsync,
    createBookingAsync,
    loadBookingCode,
    loading,
    settings,
  };

  return <BetSlipContext.Provider value={value}>{children}</BetSlipContext.Provider>;
}

/** Hook for all bet slip reads/writes. Must be used under BetSlipProvider. */
export function useBetSlip() {
  const ctx = useContext(BetSlipContext);
  if (!ctx) throw new Error("useBetSlip must be used inside BetSlipProvider");
  return ctx;
}
