import type { ReactNode } from "react";

type SportsbookShellProps = {
  children: ReactNode;
  betslip: ReactNode;
};

export default function SportsbookShell({
  children,
  betslip,
}: SportsbookShellProps) {
  return (
    <div className="sportsbook-shell">
      <div className="sportsbook-main">{children}</div>
      <aside className="sportsbook-betslip" aria-label="Prematch betslip">
        {betslip}
      </aside>
    </div>
  );
}
