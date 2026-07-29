"use client";

import Image from "next/image";
import { IconBallFootball } from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";
import { A11y, Autoplay, Navigation } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/navigation";
import {
  getMarketDisplayName,
  sortMarketsForDisplay,
} from "@/src/domain/prematchMarkets";
import type { PrematchMarket } from "@/src/domain/prematch";
import { usePrematchBetslip } from "@/src/betslip/usePrematchBetslip";
import { useActiveMatches } from "@/src/matches/useActiveMatches";
import type {
  ActiveMatchViewModel,
  ActiveOddViewModel,
} from "@/src/types/activeMatchesViewModels";

type FeaturedOdd = {
  label: string;
  odd: string;
  selection?: ActiveOddViewModel;
  market?: PrematchMarket;
  marketName?: string;
};

type FeaturedSliderEvent = {
  id: string;
  league: string;
  date: string;
  homeTeam: string;
  awayTeam: string;
  homeIcon: string;
  awayIcon: string;
  odds: FeaturedOdd[];
  match?: ActiveMatchViewModel;
};

const referenceDummyEvents: FeaturedSliderEvent[] = Array.from(
  { length: 6 },
  (_, index) => ({
    id: `reference-featured-${index + 1}`,
    league: "Premier league",
    date: "Feb 2, 00:00",
    homeTeam: "Chealsea",
    awayTeam: "Chealsea",
    homeIcon: "/images/icon/chealse.png",
    awayIcon: "/images/icon/liverpool.png",
    odds: [
      { label: "1", odd: "1.87" },
      { label: "X", odd: "1.87" },
      { label: "2", odd: "1.87" },
    ],
  })
);

const formatOdd = (value: number): string =>
  new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

const normalizeMarketCategory = (category: string): string =>
  category.trim().toUpperCase();

const isFullTimeOneXTwoMarket = (market: PrematchMarket): boolean =>
  normalizeMarketCategory(market.betCategory) === "1X2";

const getOneXTwoSelectionLabel = (selection: ActiveOddViewModel): string => {
  const option = selection.betOption.trim().toUpperCase();

  if (option === "1" || option === "HOME") return "1";
  if (option === "X" || option === "DRAW") return "X";
  if (option === "2" || option === "AWAY") return "2";

  return selection.betOption;
};

const oneXTwoLabelOrder = (label: string): number => {
  if (label === "1") return 1;
  if (label === "X") return 2;
  if (label === "2") return 3;
  return 100;
};

const getFeaturedMarket = (
  match: ActiveMatchViewModel
): PrematchMarket | null => {
  const market = sortMarketsForDisplay(match.markets).find(
    (candidate) =>
      candidate.selections.length > 0 && isFullTimeOneXTwoMarket(candidate)
  );

  return market ?? null;
};

const mapApiMatchToFeaturedEvent = (
  match: ActiveMatchViewModel
): FeaturedSliderEvent | null => {
  const market = getFeaturedMarket(match);
  if (!market) return null;

  const marketName = getMarketDisplayName(market);
  const odds = market.selections
    .map((selection) => ({
      label: getOneXTwoSelectionLabel(selection),
      odd: formatOdd(selection.odd),
      selection,
      market,
      marketName,
    }))
    .sort(
      (left, right) =>
        oneXTwoLabelOrder(left.label) - oneXTwoLabelOrder(right.label)
    )
    .slice(0, 3);

  return {
    id: match.originalMatchId,
    league: match.league,
    date: match.displayStartTime,
    homeTeam: match.homeTeamName,
    awayTeam: match.awayTeamName,
    homeIcon: "/images/icon/cmn-footbal.png",
    awayIcon: "/images/icon/cmn-footbal.png",
    odds,
    match,
  };
};

const usePrefersReducedMotion = (): boolean => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleChange = () => setPrefersReducedMotion(mediaQuery.matches);

    handleChange();
    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  return prefersReducedMotion;
};

export { referenceDummyEvents };

export default function FeaturedMatchesSlider() {
  const { matches } = useActiveMatches();
  const { isSelected, toggleSelection } = usePrematchBetslip();
  const prefersReducedMotion = usePrefersReducedMotion();

  const featuredEvents = useMemo(() => {
    const apiEvents = matches
      .filter((match) => match.sportId === "football")
      .map(mapApiMatchToFeaturedEvent)
      .filter((event): event is FeaturedSliderEvent => event !== null)
      .slice(0, 8)

    return apiEvents.length ? apiEvents : referenceDummyEvents;
  }, [matches]);
  const canScroll = featuredEvents.length > 3;

  return (
    <section
      className="featured-matches-slider featured-carousel"
      aria-label="Featured matches"
    >
      {canScroll && (
        <button
          type="button"
          className="featured-carousel__arrow featured-carousel__arrow--prev"
          aria-label="Previous featured matches"
        >
          ‹
        </button>
      )}

      <Swiper
        className="featured-carousel__viewport"
        modules={[A11y, Autoplay, Navigation]}
        slidesPerView="auto"
        spaceBetween={0}
        loop={canScroll}
        speed={450}
        grabCursor={canScroll}
        watchOverflow
        preventClicks
        preventClicksPropagation
        autoplay={
          canScroll && !prefersReducedMotion
            ? {
                delay: 4500,
                disableOnInteraction: false,
                pauseOnMouseEnter: true,
              }
            : false
        }
        navigation={
          canScroll
            ? {
                prevEl: ".featured-carousel__arrow--prev",
                nextEl: ".featured-carousel__arrow--next",
              }
            : false
        }
        breakpoints={{
          0: {
            spaceBetween: 0,
          },
          576: {
            spaceBetween: 0,
          },
          1024: {
            spaceBetween: 0,
          },
          1367: {
            spaceBetween: 0,
          },
        }}
      >
        {featuredEvents.map((event) => (
          <SwiperSlide className="featured-carousel__slide" key={event.id}>
            <article className="featured-match-card">
              <div className="featured-match-card__top">
                <div className="featured-match-card__league">
                  <IconBallFootball className="n5-color" />
                  <span title={event.league}>{event.league}</span>
                </div>
                <span className="featured-match-card__date">{event.date}</span>
              </div>

              <div className="featured-match-card__body">
                <div className="featured-match-card__team">
                  <span className="featured-match-card__crest">
                    <Image src={event.homeIcon} width={40} height={40} alt="" />
                  </span>
                  <h6 title={event.homeTeam}>{event.homeTeam}</h6>
                </div>

                <div className="featured-match-card__vs">
                  <span>VS</span>
                </div>

                <div className="featured-match-card__team featured-match-card__team--away">
                  <span className="featured-match-card__crest">
                    <Image src={event.awayIcon} width={40} height={40} alt="" />
                  </span>
                  <h6 title={event.awayTeam}>{event.awayTeam}</h6>
                </div>
              </div>

              <div className="featured-match-card__footer">
                {event.odds.slice(0, 3).map((odd, index) => {
                  const selected =
                    odd.selection !== undefined &&
                    isSelected(odd.selection.matchOddId);

                  return (
                    <button
                      className="featured-match-card__odd"
                      data-selected={selected ? "true" : undefined}
                      disabled={!event.match || !odd.market || !odd.selection}
                      key={`${event.id}-${odd.label}-${index}`}
                      type="button"
                      onClick={() => {
                        if (!event.match || !odd.market || !odd.selection) return;

                        toggleSelection(
                          event.match,
                          odd.market,
                          odd.selection,
                          odd.marketName ?? getMarketDisplayName(odd.market),
                          odd.label
                        );
                      }}
                    >
                      <span>{odd.label}</span>
                      <strong>{odd.odd}</strong>
                    </button>
                  );
                })}
              </div>
            </article>
          </SwiperSlide>
        ))}
      </Swiper>

      {canScroll && (
        <button
          type="button"
          className="featured-carousel__arrow featured-carousel__arrow--next"
          aria-label="Next featured matches"
        >
          ›
        </button>
      )}
    </section>
  );
}
