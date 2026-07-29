import type { PrematchFixture, PrematchMarket, PrematchSelection } from "@/src/domain/prematch";

type MarketDefinition = {
  label: string;
  order: number;
  collapsedByDefault?: boolean;
};

const MARKET_DEFINITIONS: Record<string, MarketDefinition> = {
  "1x2": { label: "1x2", order: 10 },
  DC: { label: "Double Chance", order: 20 },
  DNB: { label: "Draw No Bet", order: 30 },
  BTS: { label: "Both Teams To Score", order: 40 },
  OU: { label: "Over / Under", order: 50 },
  EH: { label: "European Handicap", order: 60 },
  HTFT: { label: "Half Time / Full Time", order: 70 },
  HSH: { label: "Highest Scoring Half", order: 80 },
  OE: { label: "Odd / Even", order: 90 },
  CS: { label: "Correct Score", order: 100, collapsedByDefault: true },
  RTG: { label: "Race To Goals", order: 110 },
  TGBTS: { label: "Team Goals Both Teams To Score", order: 120 },
  RBTS: { label: "Result & Both Teams To Score", order: 130 },
};

const normalizeCategory = (category: string): string =>
  category.trim().toUpperCase();

const baseCategory = (category: string): string =>
  normalizeCategory(category).replace(/_H[12]$/, "");

const periodSuffix = (category: string): string => {
  const normalized = normalizeCategory(category);
  if (normalized.endsWith("_H1")) return " - 1st Half";
  if (normalized.endsWith("_H2")) return " - 2nd Half";
  return "";
};

const marketDefinition = (category: string): MarketDefinition | undefined =>
  MARKET_DEFINITIONS[baseCategory(category)];

export const getMarketOrder = (market: PrematchMarket): number =>
  marketDefinition(market.betCategory)?.order ?? 1000;

export const isMarketCollapsedByDefault = (market: PrematchMarket): boolean =>
  marketDefinition(market.betCategory)?.collapsedByDefault === true;

export const getMarketDisplayName = (market: PrematchMarket): string => {
  const definition = marketDefinition(market.betCategory);
  const baseLabel = definition?.label ?? market.betCategory;
  const line = market.line ? ` ${market.line}` : "";

  return `${baseLabel}${line}${periodSuffix(market.betCategory)}`;
};

const selectionOrderValue = (
  selection: PrematchSelection,
  market: PrematchMarket
): number => {
  const option = selection.betOption.trim().toUpperCase();
  const category = baseCategory(market.betCategory);

  if (selection.row !== null) return selection.row;

  if (["1X2", "EH"].includes(category)) {
    if (option === "1") return 1;
    if (option === "X") return 2;
    if (option === "2") return 3;
  }

  if (category === "DC") {
    if (option === "1X") return 1;
    if (option === "12") return 2;
    if (option === "X2") return 3;
  }

  if (category === "OU") {
    if (option.startsWith("O")) return 1;
    if (option.startsWith("U")) return 2;
  }

  return 100;
};

export const sortSelectionsForMarket = (
  market: PrematchMarket
): PrematchSelection[] =>
  market.selections
    .slice()
    .sort(
      (left, right) =>
        selectionOrderValue(left, market) - selectionOrderValue(right, market) ||
        left.betOption.localeCompare(right.betOption)
    );

export const sortMarketsForDisplay = (
  markets: PrematchMarket[]
): PrematchMarket[] =>
  markets
    .filter((market) => market.selections.length > 0)
    .slice()
    .sort(
      (left, right) =>
        getMarketOrder(left) - getMarketOrder(right) ||
        getMarketDisplayName(left).localeCompare(getMarketDisplayName(right))
    )
    .map((market) => ({
      ...market,
      selections: sortSelectionsForMarket(market),
    }));

export const getSelectionDisplayName = (
  selection: PrematchSelection,
  market: PrematchMarket,
  fixture: PrematchFixture
): string => {
  const option = selection.betOption.trim().toUpperCase();
  const category = baseCategory(market.betCategory);

  if (["1X2", "EH"].includes(category)) {
    if (option === "1") return "Home";
    if (option === "X") return "Draw";
    if (option === "2") return "Away";
  }

  if (category === "DC") {
    if (option === "1X") return "Home or Draw";
    if (option === "12") return "Home or Away";
    if (option === "X2") return "Draw or Away";
  }

  if (category === "OU") {
    if (option.startsWith("O")) return "Over";
    if (option.startsWith("U")) return "Under";
  }

  if (category === "DNB") {
    if (option === "1") return fixture.homeTeamName;
    if (option === "2") return fixture.awayTeamName;
  }

  return selection.betOption;
};
