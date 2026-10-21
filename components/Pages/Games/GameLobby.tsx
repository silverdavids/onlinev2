"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { IconFlame, IconSearch, IconSparkles, IconUsers, IconX } from "@tabler/icons-react";
import {
  casinoGames,
  filterAndSortGames,
  sortOptions,
  ugx,
  type CasinoCategory,
  type SortId,
} from "@/src/games/casino-data";

const unique = (values: string[]) => Array.from(new Set(values)).sort();

export default function GameLobby({ category, title, tagline }: {
  category: CasinoCategory;
  title: string;
  tagline: string;
}) {
  const games = useMemo(() => casinoGames.filter((game) => game.category === category), [category]);
  const [provider, setProvider] = useState("all");
  const [type, setType] = useState("all");
  const [volatility, setVolatility] = useState("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortId>("popular");
  const [launchMessage, setLaunchMessage] = useState("");
  const results = useMemo(
    () => filterAndSortGames(games, { provider, type, volatility, query, sort }),
    [games, provider, type, volatility, query, sort]
  );
  const totalPlayers = games.reduce((sum, game) => sum + game.players, 0);
  const reset = () => {
    setProvider("all");
    setType("all");
    setVolatility("all");
    setQuery("");
    setSort("popular");
  };

  return (
    <>
      <section className="game-lobby" aria-labelledby="game-lobby-title">
        <header className="game-lobby__header">
          <div>
            <h1 id="game-lobby-title">{title}</h1>
            <p>{tagline}</p>
          </div>
          <span className="game-lobby__players"><IconUsers size={16} aria-hidden="true" />{totalPlayers.toLocaleString("en-UG")} playing</span>
        </header>

        <div className="game-lobby__filters">
          <div className="game-lobby__search">
            <IconSearch size={20} aria-hidden="true" />
            <input type="search" aria-label="Search games" placeholder="Search games or providers" value={query} onChange={(event) => setQuery(event.target.value)} />
          </div>
          <div className="game-lobby__filter-grid">
            <select aria-label="Provider" value={provider} onChange={(event) => setProvider(event.target.value)}>
              <option value="all">All providers</option>
              {unique(games.map((game) => game.provider)).map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
            <select aria-label="Game type" value={type} onChange={(event) => setType(event.target.value)}>
              <option value="all">All game types</option>
              {unique(games.map((game) => game.type)).map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
            <select aria-label="Volatility" value={volatility} onChange={(event) => setVolatility(event.target.value)}>
              <option value="all">Any volatility</option>
              {["Low", "Medium", "High"].map((name) => <option key={name} value={name}>{name} volatility</option>)}
            </select>
            <select aria-label="Sort by" value={sort} onChange={(event) => setSort(event.target.value as SortId)}>
              {sortOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
            </select>
          </div>
          <div className="game-lobby__filter-summary">
            <span role="status" aria-live="polite">{results.length} {results.length === 1 ? "game" : "games"}</span>
            <button type="button" onClick={reset}>Reset filters</button>
          </div>
        </div>

        {results.length === 0 ? <p className="game-lobby__empty">No games match these filters.</p> : (
          <div className="game-lobby__grid">
            {results.map((game) => (
              <article className="game-lobby__card" key={game.id}>
                <div className="game-lobby__art" style={{ background: game.gradient }}>
                  <div className="game-lobby__badges">
                    {game.isNew && <span className="game-lobby__badge game-lobby__badge--new"><IconSparkles size={12} aria-hidden="true" />New</span>}
                    {game.popularity >= 95 && <span className="game-lobby__badge game-lobby__badge--hot"><IconFlame size={12} aria-hidden="true" />Hot</span>}
                  </div>
                  <span className="game-lobby__online">{game.players.toLocaleString("en-UG")} online</span>
                </div>
                <div className="game-lobby__card-content">
                  <h2 title={game.name}>{game.name}</h2>
                  <p className="game-lobby__provider" title={`${game.provider} · ${game.type}`}>{game.provider} · {game.type}</p>
                  <p>RTP {game.rtp}% · {game.volatility}</p>
                  <p className="game-lobby__min">Min {ugx(game.minBet)}</p>
                  {game.jackpot && <p className="game-lobby__jackpot">Jackpot {ugx(game.jackpot)}</p>}
                  <button type="button" aria-label={`Play ${game.name}`} onClick={() => setLaunchMessage(`${game.name} launches here once the game provider is connected.`)}>Play</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
      {launchMessage && createPortal(
        <div className="game-lobby-launch" role="status">
          <p>{launchMessage}</p>
          <button type="button" aria-label="Dismiss game notification" onClick={() => setLaunchMessage("")}><IconX size={20} aria-hidden="true" /></button>
        </div>,
        document.body
      )}
    </>
  );
}
