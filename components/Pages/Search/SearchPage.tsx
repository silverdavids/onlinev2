"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useActiveMatches } from "@/src/matches/useActiveMatches";
import ContentPage from "@/components/Shared/ContentPage";

export default function SearchPage() {
  const params = useSearchParams();
  const router = useRouter();
  const query = params.get("q") ?? params.get("search") ?? "";
  const [input, setInput] = useState(query);
  const { matches, isLoading, error, refresh } = useActiveMatches();
  useEffect(() => setInput(query), [query]);
  const normalized = query.trim().toLowerCase();
  const results = normalized ? matches.filter((match) => `${match.homeTeamName} ${match.awayTeamName} ${match.league} ${match.sportName}`.toLowerCase().includes(normalized)) : [];
  const submit = (event: FormEvent) => { event.preventDefault(); router.replace(`/search?q=${encodeURIComponent(input.trim())}`); };
  return <ContentPage title="Search" description="Find teams, leagues, and upcoming fixtures."><form className="smartbet-search-form smartbet-form" onSubmit={submit}><label htmlFor="fixture-search">Team or league<input id="fixture-search" type="search" value={input} onChange={(event) => setInput(event.target.value)} placeholder="Search teams or leagues" /></label><button className="smartbet-button" type="submit">Search</button></form>
    {error && <p className="smartbet-feedback" role="alert">{error} <button type="button" onClick={() => void refresh()}>Retry</button></p>}
    {isLoading ? <p role="status">Loading fixtures...</p> : !normalized ? <div className="smartbet-panel smartbet-empty"><h2>Find your next match</h2><p>Enter a team or league name to search the available fixtures.</p><Link href="/soccer">Browse sports</Link></div> : <><p role="status">{results.length} {results.length === 1 ? "result" : "results"} for &quot;{query}&quot;</p>{results.length === 0 && <div className="smartbet-panel smartbet-empty"><h2>No matching fixtures</h2><p>Try another team or league name.</p></div>}<div className="smartbet-card-grid">{results.map((match) => <Link key={match.originalMatchId} href={`/fixture/${encodeURIComponent(match.originalMatchId)}`} className="smartbet-panel smartbet-destination"><span className="smartbet-badge">{match.sportName}</span><h2>{match.homeTeamName} v {match.awayTeamName}</h2><p>{match.league}</p><time>{match.displayStartTime}</time><span>View markets &rarr;</span></Link>)}</div></>}
  </ContentPage>;
}
