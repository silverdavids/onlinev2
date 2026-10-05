"use client";

import type { ReactNode } from "react";
import { usePrematchBetslip } from "@/src/betslip/usePrematchBetslip";

type SportsbookShellProps = {
  children: ReactNode;
  betslip: ReactNode;
};

export default function SportsbookShell({
  children,
  betslip,
}: SportsbookShellProps) {
  const { selectionCount } = usePrematchBetslip();
  const hasSelections = selectionCount > 0;

  return (
    <div
      className={`sportsbook-shell ${
        hasSelections ? "sportsbook-shell--has-slip" : "sportsbook-shell--empty-slip"
      }`}
    >
      <div className="sportsbook-main">{children}</div>
      {hasSelections && (
        <aside className="sportsbook-betslip" aria-label="Prematch betslip">
          {betslip}
        </aside>
      )}
    </div>
  );
}
