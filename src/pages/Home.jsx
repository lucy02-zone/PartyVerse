
import { ArrowRight, Gamepad2, Sparkles, Users, Zap, Shuffle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import Navbar from "../components/Navbar";
import GameCard from "../components/GameCard";
import { games } from "../data/games";
import { chooseRandomGame, filterGames, GAME_FILTERS, getGamePath } from "../lib/gameDiscovery.js";

export default function Home() {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState("all");
  const visibleGames = filterGames(games, activeFilter);

  function surpriseMe() {
    const game = chooseRandomGame(games);
    if (game) navigate(getGamePath(game));
  }

  return (
    <>
      <Navbar />

      <main>
        <section className="hero">
          <div className="hero-content">
            <div className="eyebrow">
              <Sparkles size={15} />
              YOUR NEXT GAME NIGHT STARTS HERE
            </div>

            <h1>
              Less scrolling.
              <br />
              <span>More playing.</span>
            </h1>

            <p className="hero-description">
              Pick a game, gather your people, and make an ordinary hangout a little more memorable.
            </p>

            <div className="hero-actions">
              <a href="#games" className="primary-button">Play with friends <ArrowRight size={18} /></a>
              <a href="#games" className="secondary-button">Explore games</a>
            </div>

            <div className="hero-stats">
              <div>
                <Users size={18} />
                <span>
                  <strong>Friends first</strong>
                  <small>Made for groups</small>
                </span>
              </div>
              <div>
                <Zap size={18} />
                <span>
                  <strong>Simple setup</strong>
                  <small>Simple player setup</small>
                </span>
              </div>
              <div>
                <Gamepad2 size={18} />
                <span><strong>Play your way</strong><small>Online Mafia or one device</small></span>
              </div>
            </div>
          </div>

          <div className="hero-visual" aria-label="A glimpse of games to play together">
            <div className="hero-art-backdrop" />
            <Link to="/game/charades" className="hero-art hero-art-main" aria-label="Set up Charades">
              <img src={games.find((game) => game.id === "charades").image} alt="" fetchPriority="high" />
              <span>Act it out</span>
            </Link>
            <Link to="/play/mafia/online" className="hero-art hero-art-small hero-art-mafia" aria-label="Play Online Mafia">
              <img src={games.find((game) => game.id === "mafia").image} alt="" loading="lazy" />
              <span>Read the room</span>
            </Link>
            <Link to="/game/quiz" className="hero-art hero-art-small hero-art-quiz" aria-label="Set up Quiz Battle">
              <img src={games.find((game) => game.id === "quiz").image} alt="" loading="lazy" />
              <span>Bring your best guess</span>
            </Link>
            <div className="hero-note"><Sparkles size={16} /> Your next favorite is here</div>
          </div>

        </section>

        <section className="games-section" id="games">
          <div className="section-heading">
            <div>
              <span className="section-kicker">PICK YOUR VIBE</span>
              <h2>Find your next favorite</h2>
              <p>Five ways to turn an ordinary hangout into a party.</p>
            </div>
            <button className="surprise-button" type="button" onClick={surpriseMe}><Shuffle size={17} /> Surprise me</button>
          </div>

          <div className="game-filters" role="group" aria-label="Filter games">
            {GAME_FILTERS.map((filter) => <button key={filter.id} type="button" className={`game-filter${activeFilter === filter.id ? " is-active" : ""}`} aria-pressed={activeFilter === filter.id} onClick={() => setActiveFilter(filter.id)}>{filter.label}</button>)}
            <span className="game-count" aria-live="polite">{visibleGames.length} {visibleGames.length === 1 ? "game" : "games"}</span>
          </div>

          <div className="games-grid">
            {visibleGames.map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
          {visibleGames.length === 0 && <p className="games-empty" role="status">No games match that filter yet. Try another category.</p>}
        </section>

        <section className="how-section" id="how-it-works">
          <div className="how-heading"><span className="section-kicker">GOOD GAMES, EASY START</span><h2>How game night comes together</h2><p>Choose a game, bring your group in, and get to the fun.</p></div>
          <div className="how-steps">
            <article><span className="how-step-number">01</span><h3>Choose a game</h3><p>Pick the kind of chaos your group is in the mood for.</p></article>
            <article><span className="how-step-number">02</span><h3>Gather everyone</h3><p>Set up players for a shared-device game, or open an Online Mafia room for separate devices.</p></article>
            <article><span className="how-step-number">03</span><h3>Start playing</h3><p>Follow the in-game prompts, pass the phone when asked, and enjoy the surprises.</p></article>
          </div>
          <a href="#games" className="how-link">Find a game <ArrowRight size={17} /></a>
        </section>

        <section className="about-section" id="about">
          <div className="about-icon">FUN</div>
          <div>
            <span className="section-kicker">BUILT FOR TOGETHERNESS</span>
            <h2>Good games. Great company.</h2>
            <p>
              Choose a game, gather your friends, and let the chaos begin.
              PartyVerse is your home for memorable game nights.
            </p>
          </div>
          <Link to="/game/imposter" className="about-link">
            Let's play <ArrowRight size={17} />
          </Link>
        </section>
      </main>

      <footer className="footer">
        <Link to="/" className="brand">
          <span className="brand-icon">
            <Sparkles size={19} />
          </span>
          PartyVerse
        </Link>
        <span>Made for friends, built for fun.</span>
      </footer>
    </>
  );
}
