import { buildDevelopTicket } from "@/lib/backend-contracts";
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
  betOption?: string;
  line?: number | string | null;
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
  status: "open" | "won" | "lost" | "refunded" | "cancelled";
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
  placeBetAsync: () => Promise<PlacedBet | null>;
  createBookingAsync: () => Promise<string>;
  loadBookingCode: (code: string) => Promise<{ count: number; totalOdds: number }>;
  loading: boolean;
  settings: OnlineSettings;
  settingsReady: boolean;
  bookingCode: string | null;
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
  const [bookingCode, setBookingCode] = useState<string | null>(null);
  const [bets, setBets] = useState<PlacedBet[]>([]);
  const [settingsReady, setSettingsReady] = useState(false);
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
        if (
          cfg &&
          [cfg.MinStake, cfg.MaxStake, cfg.MaxPayOut].every(
            (value) => Number.isFinite(value) && value > 0,
          ) &&
          cfg.MinStake <= cfg.MaxStake
        ) {
          setSettings(cfg);
          setSettingsReady(true);
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
  }, []);

  // History is read by the authenticated My Bets page; never cache another account's receipts here.
  useEffect(() => {
    setBookingCode(null);
  }, [selections, stake]);

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
    return buildDevelopTicket(selections, stake);
  }, [selections, stake]);

  /**
   * Requests a real booking code from SmartBet.
   */
  const createBookingAsync = useCallback(async (): Promise<string> => {
    if (!selections.length) throw new Error("Bet slip is empty");

    setLoading(true);
    try {
      const payload = buildTicketPayload();
      const res = await smartBetApi.createBooking(payload);
      const code = res.bookingCode || res.BookingCode || res.code || res.Code;
      if (!res.success || !code)
        throw new Error(res.message || "SmartBet did not confirm this booking.");
      setBookingCode(code);
      return code;
    } finally {
      setLoading(false);
    }
  }, [selections, buildTicketPayload]);

  /**
   * Accept the baseline OnlineClient acknowledgment and read receipts through My Bets.
   */
  const placeBetAsync = useCallback(async (): Promise<PlacedBet | null> => {
    if (!selections.length) throw new Error("Bet slip is empty");
    if (!settingsReady)
      throw new Error(
        "SmartBet betting limits are unavailable. Please refresh before placing a bet.",
      );
    if (!Number.isSafeInteger(stake) || stake < settings.MinStake || stake > settings.MaxStake)
      throw new Error("Enter a whole stake within the SmartBet limits.");
    if (balance !== null && stake > balance) throw new Error("Insufficient wallet balance.");
    setLoading(true);
    try {
      const result = await smartBetApi.submitTicket(buildTicketPayload());
      if (result.success !== true) throw new Error("SmartBet did not confirm this ticket.");
      // OnlineClient success has no receipt ID. Clear the sold draft; do not fabricate a receipt.
      setSelections([]);
      setBookingCode(null);
      setOpen(false);
      setBets([]);
      await refreshWallet().catch(() => {});
      return null;
    } finally {
      setLoading(false);
    }
  }, [selections, stake, settings, settingsReady, balance, buildTicketPayload, refreshWallet]);

  /**
   * Retrieves a booking code from SmartBet and restores selections to slip.
   */
  const loadBookingCode = useCallback(
    async (rawCode: string): Promise<{ count: number; totalOdds: number }> => {
      const clean = rawCode.trim().toUpperCase();
      if (!clean) throw new Error("Please enter a booking code");

      setLoading(true);
      try {
        const loaded = await smartBetApi.getBookingSelections(clean);
        setSelections(loaded);
        setOpen(true);
        return {
          count: loaded.length,
          totalOdds: Number(loaded.reduce((acc, s) => acc * s.odds, 1).toFixed(2)),
        };
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
    settingsReady,
    bookingCode,
  };

  return <BetSlipContext.Provider value={value}>{children}</BetSlipContext.Provider>;
}

/** Hook for all bet slip reads/writes. Must be used under BetSlipProvider. */
export function useBetSlip() {
  const ctx = useContext(BetSlipContext);
  if (!ctx) throw new Error("useBetSlip must be used inside BetSlipProvider");
  return ctx;
}
