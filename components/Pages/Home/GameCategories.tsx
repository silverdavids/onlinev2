"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { PrematchSportId } from "@/src/domain/sports";

type GameCategory = {
  imgSrc: string;
  buttonName: string;
  href: string;
  sportId: PrematchSportId;
};

const referenceGameCategories: GameCategory[] = [
  {
    imgSrc: "/images/icon/soccer-icon.png",
    buttonName: "Soccer",
    href: "/soccer",
    sportId: "football",
  },
  {
    imgSrc: "/images/icon/tennis.png",
    buttonName: "Tennis",
    href: "/tennis",
    sportId: "tennis",
  },
  {
    imgSrc: "/images/icon/basketball.png",
    buttonName: "Basketball",
    href: "/basketball",
    sportId: "basketball",
  },
  {
    imgSrc: "/images/icon/cricket.png",
    buttonName: "Cricket",
    href: "/cricket",
    sportId: "cricket",
  },
  {
    imgSrc: "/images/icon/ecricket.png",
    buttonName: "eCricket",
    href: "/ecricket",
    sportId: "ecricket",
  },
  {
    imgSrc: "/images/icon/ice-hockey.png",
    buttonName: "Ice Hockey",
    href: "/ice-hockey",
    sportId: "ice-hockey",
  },
  {
    imgSrc: "/images/icon/nba2k.png",
    buttonName: "NBA 2K",
    href: "/nba-2k",
    sportId: "nba-2k",
  },
];

export { referenceGameCategories };

export default function GameCategories() {
  const [activeSport, setActiveSport] = useState<PrematchSportId>("football");

  return (
    <section className="game-categories">
      <div className="top_matches__title d-flex align-items-center gap-2 mb-4">
        <Image width={32} height={32} src="/images/icon/king.png" alt="Icon" />
        <h3>Game Categories</h3>
      </div>
      <div className="game-categories__list">
        {referenceGameCategories.map((category) => (
          <Link
            className="game-categories__link clickable-active2"
            data-active={activeSport === category.sportId ? "true" : undefined}
            href={category.href}
            key={category.buttonName}
            onClick={() => setActiveSport(category.sportId)}
          >
            <Image width={16} height={16} src={category.imgSrc} alt="" />
            <span>{category.buttonName}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
