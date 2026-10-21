"use client";

import Link from "next/link";
import { usePrematchBetslip } from "@/src/betslip/usePrematchBetslip";
import ContentPage from "@/components/Shared/ContentPage";

export default function BetslipPage() {
  const { selections, removeSelection, totalOdds, potentialWin, stakeInput, setStakeInput, validation, isSubmitting, isBooking, changedOdds, placeTicket, bookTicket } = usePrematchBetslip();
  const disabled = !validation.valid || isSubmitting || isBooking || changedOdds.length > 0;
  return <ContentPage title="Your bet slip" description="Review your selections, set a stake, and confirm your bet."><div className="smartbet-panel">
    {selections.length === 0 ? <div className="smartbet-empty"><h2>Your bet slip is empty</h2><Link href="/soccer">Browse sports</Link><Link href="/booking-code">Load a booking code</Link></div> : <>
      <div className="smartbet-notification-list">{selections.map((selection) => <article key={selection.key}><div className="smartbet-panel__heading"><h2>{selection.display.homeTeamName} v {selection.display.awayTeamName}</h2><strong>{selection.operational.odd.toFixed(2)}</strong></div><p>{selection.display.marketName} · {selection.display.selectionName}</p>{selection.status === "suspended" && <p className="smartbet-feedback">{selection.statusMessage || "Selection suspended"}</p>}<button type="button" onClick={() => removeSelection(selection.key)}>Remove selection</button></article>)}</div>
      <div className="smartbet-form"><label>Stake (UGX)<input type="number" min="0" value={stakeInput} onChange={(event) => setStakeInput(event.target.value)} /></label><div className="smartbet-actions">{[1000, 2000, 5000, 10000].map((amount) => <button type="button" key={amount} onClick={() => setStakeInput(String(amount))}>{amount / 1000}k</button>)}</div></div>
      <dl className="smartbet-detail-grid"><div><dt>Total odds</dt><dd>{totalOdds.toFixed(2)}</dd></div><div><dt>Potential win</dt><dd>USh {potentialWin.toLocaleString("en-UG")}</dd></div></dl>
      {!validation.valid && <p className="smartbet-feedback">{validation.messages.join(" ")}</p>}
      <div className="smartbet-actions"><button type="button" className="smartbet-button" disabled={disabled} onClick={() => void placeTicket()}>{isSubmitting ? "Placing..." : "Place bet"}</button><button type="button" disabled={disabled} onClick={() => void bookTicket()}>{isBooking ? "Creating..." : "Create booking code"}</button></div>
    </>}
  </div></ContentPage>;
}
