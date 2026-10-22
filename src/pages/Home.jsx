
import { ArrowRight, Sparkles, Users, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import GameCard from "../components/GameCard";
import { games } from "../data/games";

export default function Home() {
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
              Bring your people together with fun party games,
              unexpected twists, and unforgettable moments.
            </p>

            <div className="hero-actions">
              <a href="#games" className="primary-button">
                Explore games <ArrowRight size={18} />
              </a>
              <a href="#about" className="secondary-button">
                How it works
              </a>
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
                  <strong>Quick to start</strong>
                  <small>Easy game nights</small>
                </span>
              </div>
            </div>
          </div>

          <div className="hero-visual">
            <div className="visual-glow" />
            <div className="floating-card card-one">
              <span className="token-box token-imp">IMP</span>
              <div>
                <strong>Who's the imposter?</strong>
                <small>Trust nobody...</small>
              </div>
            </div>
            <div className="party-orbit">
              <span className="orbit-token token-one">UVC</span>
              <span className="orbit-token token-two">QZ</span>
              <span className="orbit-token token-three">RND</span>
              <span className="orbit-center">GO</span>
            </div>
            <div className="floating-card card-two">
              <span className="token-box token-win">WIN</span>
              <div>
                <strong>Game on!</strong>
                <small>Your crew is waiting</small>
              </div>
            </div>
          </div>
        </section>

        <section className="games-section" id="games">
          <div className="section-heading">
            <div>
              <span className="section-kicker">PICK YOUR VIBE</span>
              <h2>Find your next favorite</h2>
              <p>Five ways to turn an ordinary hangout into a party.</p>
            </div>
            <span className="game-count">{games.length} games</span>
          </div>

          <div className="games-grid">
            {games.map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
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
