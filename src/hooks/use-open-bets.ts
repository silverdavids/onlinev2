/**
 * hooks/use-open-bets.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Tracks the count of active unsettled open bets.
 * Syncs with the SmartBet Online OpenBetsCount API (GET /api/Online/OpenBetsCount)
 * and active bet slips.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { useEffect, useState, useCallback, useRef } from "react";
import { smartBetApi } from "@/lib/api-smartbet";
import { createRequestEpoch } from "@/lib/request-epoch";
import { useAuth } from "@/hooks/use-auth";

export function useOpenBets() {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id;
  const requests = useRef(createRequestEpoch());
  const [openCount, setOpenCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const fetchCount = useCallback(async () => {
    const request = requests.current.next();
    if (authLoading || !userId) {
      setOpenCount(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const result = await smartBetApi.getOpenBetsCount();
      if (requests.current.isCurrent(request))
        setOpenCount(
          typeof result === "number" && Number.isSafeInteger(result) && result >= 0 ? result : 0,
        );
    } catch {
      if (requests.current.isCurrent(request)) setOpenCount(0);
    } finally {
      if (requests.current.isCurrent(request)) setLoading(false);
    }
  }, [authLoading, userId]);
  useEffect(() => {
    const epoch = requests.current;
    void fetchCount();
    const refresh = () => {
      void fetchCount();
    };
    window.addEventListener("smartbet:bet-accepted", refresh);
    return () => {
      epoch.invalidate();
      window.removeEventListener("smartbet:bet-accepted", refresh);
    };
  }, [fetchCount]);
  return { openCount, loading, refresh: fetchCount };
}
