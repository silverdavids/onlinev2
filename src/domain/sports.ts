export const ACTIVE_FEED_SPORT_ID = "football";
export const ACTIVE_FEED_SPORT_NAME = "Football";

export type PrematchSportId =
  | "football"
  | "american-football"
  | "aussie-rules"
  | "bandy"
  | "basketball"
  | "boxing"
  | "cricket"
  | "cycling"
  | "darts"
  | "ecricket"
  | "efighting"
  | "erocket-league"
  | "eshooter"
  | "fifa-volta"
  | "floorball"
  | "futsal"
  | "handball"
  | "ice-hockey"
  | "kabaddi"
  | "mma"
  | "nba-2k"
  | "penalty-shootout"
  | "rugby"
  | "specials"
  | "squash"
  | "table-tennis"
  | "tennis"
  | "volleyball"
  | "waterpolo"
  | "wrestling";

export type PrematchSportDefinition = {
  id: PrematchSportId;
  name: string;
};

export const PREMATCH_SPORTS: PrematchSportDefinition[] = [
  { id: "football", name: "Football" },
  { id: "tennis", name: "Tennis" },
  { id: "basketball", name: "Basketball" },
  { id: "cricket", name: "Cricket" },
  { id: "ecricket", name: "eCricket" },
  { id: "american-football", name: "American Football" },
  { id: "ice-hockey", name: "Ice Hockey" },
  { id: "nba-2k", name: "NBA 2K" },
  { id: "volleyball", name: "Volleyball" },
  { id: "fifa-volta", name: "FIFA: Volta" },
  { id: "penalty-shootout", name: "Penalty Shootout" },
  { id: "handball", name: "Handball" },
  { id: "table-tennis", name: "Table Tennis" },
  { id: "kabaddi", name: "Kabaddi" },
  { id: "efighting", name: "eFighting" },
  { id: "erocket-league", name: "eRocket League" },
  { id: "aussie-rules", name: "Aussie Rules" },
  { id: "rugby", name: "Rugby" },
  { id: "eshooter", name: "eShooter" },
  { id: "boxing", name: "Boxing" },
  { id: "mma", name: "MMA" },
  { id: "futsal", name: "Futsal" },
  { id: "bandy", name: "Bandy" },
  { id: "waterpolo", name: "Waterpolo" },
  { id: "floorball", name: "Floorball" },
  { id: "cycling", name: "Cycling" },
  { id: "specials", name: "Specials" },
  { id: "squash", name: "Squash" },
  { id: "darts", name: "Darts" },
  { id: "wrestling", name: "Wrestling" },
];

export const getPrematchSport = (
  id: PrematchSportId
): PrematchSportDefinition =>
  PREMATCH_SPORTS.find((sport) => sport.id === id) ?? PREMATCH_SPORTS[0];
