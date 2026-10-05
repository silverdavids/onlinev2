"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import {
  IconChevronLeft,
  IconChevronRight,
  IconRadio,
  IconTicket,
  IconTrophy,
} from "@tabler/icons-react";
import PrematchBrowser, {
  PrematchFixtureCard,
} from "@/components/Prematch/PrematchBrowser";
import { filterUpcomingMatches } from "@/src/matches/activeMatchesSelectors";
import { useActiveMatches } from "@/src/matches/useActiveMatches";

const banners = [
  {
    kicker: "New player offer",
    title: "100% first deposit boost",
    copy: "Top up and double your first stake up to UGX 100,000.",
    cta: "Deposit now",
    href: "/deposit",
    background:
      "linear-gradient(120deg, #031627 0%, #10283d 55%, #0f766e 100%)",
  },
  {
    kicker: "Multibet",
    title: "Up to 200% multibet bonus",
    copy: "Add five or more selections and grow every winning slip.",
    cta: "Build a slip",
    href: "/soccer",
    background:
      "linear-gradient(120deg, #031627 0%, #1e3a8a 60%, #6edb73 130%)",
  },
  {
    kicker: "Aviator",
    title: "Cash out before it flies away",
    copy: "Fly with Aviator and Crash games from UGX 500 a round.",
    cta: "Play Aviator",
    href: "/promotions",
    background:
      "linear-gradient(120deg, #031627 0%, #0e7490 60%, #be123c 130%)",
  },
];

const topLeagues = [
  "UG Premier League",
  "Premier League",
  "La Liga",
  "Serie A",
  "Bundesliga",
  "Ligue 1",
  "CAF Champions League",
  "NBA",
];

function SectionHeader({
  title,
  href,
  icon,
}: {
  title: string;
  href?: string;
  icon: ReactNode;
}) {
  return (
    <div className="smartbet-section-head">
      <h2>
        {icon}
        <span>{title}</span>
      </h2>
      {href && <Link href={href}>See all</Link>}
    </div>
  );
}

function PromoBanner() {
  const [activeIndex, setActiveIndex] = useState(2);
  const banner = banners[activeIndex];

  return (
    <section className="smartbet-promo" style={{ background: banner.background }}>
      <p>{banner.kicker}</p>
      <h1>{banner.title}</h1>
      <span>{banner.copy}</span>
      <Link href={banner.href}>{banner.cta}</Link>
      <div className="smartbet-promo__controls">
        <button
          aria-label="Previous promotion"
          onClick={() =>
            setActiveIndex((index) => (index - 1 + banners.length) % banners.length)
          }
          type="button"
        >
          <IconChevronLeft />
        </button>
        <div>
          {banners.map((item, index) => (
            <button
              aria-label={`Show ${item.kicker}`}
              className={index === activeIndex ? "is-active" : ""}
              key={item.kicker}
              onClick={() => setActiveIndex(index)}
              type="button"
            />
          ))}
        </div>
        <button
          aria-label="Next promotion"
          onClick={() => setActiveIndex((index) => (index + 1) % banners.length)}
          type="button"
        >
          <IconChevronRight />
        </button>
      </div>
    </section>
  );
}

export default function SmartbetHome() {
  const { matches, isLoading, error } = useActiveMatches();
  const liveNow = useMemo(
    () => filterUpcomingMatches(matches.filter((match) => match.sportId === "football")).slice(0, 2),
    [matches]
  );

  return (
    <div className="smartbet-home smartbet-reference-home">
      <PromoBanner />

      <section className="smartbet-leagues">
        <SectionHeader title="Top leagues" href="/soccer" icon={<IconTrophy />} />
        <div className="smartbet-league-pills">
          {topLeagues.map((league) => (
            <Link href="/soccer" key={league}>
              {league}
            </Link>
          ))}
        </div>
      </section>

      <section className="smartbet-live-now">
        <SectionHeader title="Live now" href="/live-betting" icon={<IconRadio />} />
        {isLoading && <div className="smartbet-empty-card">Loading live games...</div>}
        {!isLoading && error && (
          <div className="smartbet-empty-card">Live games are temporarily unavailable.</div>
        )}
        {!isLoading && !error && liveNow.length === 0 && (
          <div className="smartbet-empty-card">
            <IconTicket />
            <strong>No games available yet</strong>
            <span>Upcoming fixtures will appear here.</span>
          </div>
        )}
        {!isLoading &&
          !error &&
          liveNow.map((match) => (
            <PrematchFixtureCard key={match.originalMatchId} match={match} />
          ))}
      </section>

      <PrematchBrowser title="Sports" compact />
    </div>
  );
}
