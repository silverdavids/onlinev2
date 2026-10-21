"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { usePrematchBetslip } from "@/src/betslip/usePrematchBetslip";

type SportsbookShellProps = {
  children: ReactNode;
  betslip: ReactNode;
};

export default function SportsbookShell({
  children,
  betslip,
}: SportsbookShellProps) {
  const { selectionCount, receipt, bookingConfirmation, serverMessage } = usePrematchBetslip();
  const hasSelections = selectionCount > 0 || Boolean(receipt || bookingConfirmation || serverMessage);
  const pathname = usePathname();
  const isGameLobby = ["/aviator", "/crash", "/casino"].includes(pathname);

  return (
    <div
      className={`sportsbook-shell ${isGameLobby ? "sportsbook-shell--game-lobby" : ""} ${
        hasSelections ? "sportsbook-shell--has-slip" : "sportsbook-shell--empty-slip"
      }`}
    >
      <div className="sportsbook-main">{children}</div>
      <aside className="sportsbook-betslip" aria-label="Bet slip">
        {betslip}
      </aside>
    </div>
  );
}
