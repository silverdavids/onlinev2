"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useLiveFeed } from "@/src/live/useLiveFeed";
import { usePrematchBetslip } from "@/src/betslip/usePrematchBetslip";
import ContentPage from "@/components/Shared/ContentPage";
import { LiveOddButton } from "./LiveBettingBrowser";

export default function LiveFixtureDetails({ matchId }: { matchId: string }) {
  const { matches, isConnecting, error, refresh } = useLiveFeed();
  const { syncLiveSelections } = usePrematchBetslip();
  useEffect(() => { syncLiveSelections(matches); }, [matches, syncLiveSelections]);
  const match = matches.find((entry) => String(entry.matchId) === matchId);
  return <ContentPage title={match ? `${match.homeTeam} v ${match.awayTeam}` : "Live match"} description={match?.league}>
    <div className="smartbet-actions"><Link href="/live-betting">Back to live matches</Link><button type="button" onClick={refresh}>Refresh</button></div>
    {error && <p className="smartbet-feedback" role="alert">{error}</p>}
    {!match ? <div className="smartbet-panel smartbet-empty"><p role="status">{isConnecting ? "Connecting to live matches..." : "This match is no longer available in the live feed."}</p></div> : <>
      <div className="smartbet-panel smartbet-score"><span>{match.homeTeam}</span><strong>{match.homeScore} : {match.awayScore}</strong><span>{match.awayTeam}</span><p>{match.matchTime || `${match.minute}'`} {match.eventState}</p>{match.blocked && <p>Betting is suspended for this match.</p>}</div>
      {match.markets.length === 0 && <p>No markets are currently available.</p>}
      {match.markets.map((market) => <article className="smartbet-panel" key={market.key}><h2>{market.name} {market.line}</h2><div className="smartbet-live-options">{market.options.map((option) => <LiveOddButton key={`${option.matchOddId}-${option.name}`} match={match} market={market} option={option} />)}</div></article>)}
    </>}
  </ContentPage>;
}
