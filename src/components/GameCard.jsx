
import { ArrowUpRight, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { getGamePath } from "../lib/gameDiscovery.js";

export default function GameCard({ game }) {
  return (
    <article className="game-card">
      <Link to={getGamePath(game)} className="game-card-link" aria-label={`Set up ${game.title}`}>
        <div className={`game-art ${game.color}`}>
          {game.image ? (
            <img className="game-illustration" src={game.image} alt="" loading="lazy" decoding="async" />
          ) : (
            <span className="game-emoji" aria-hidden="true">{game.icon}</span>
          )}
          <span className="game-category">{game.category}</span>
        </div>

      <div className="game-info">
        <h3>{game.title}</h3>
        <p>{game.description}</p>

        <div className="game-card-bottom">
          <span className="player-count">
            <Users size={15} />
            {game.players}
          </span>

          <span className="play-link" aria-hidden="true"><ArrowUpRight size={19} /></span>
        </div>
      </div>
      </Link>
    </article>
  );
}
