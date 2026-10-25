
import { ArrowUpRight, Users } from "lucide-react";
import { Link } from "react-router-dom";

export default function GameCard({ game }) {
  return (
    <article className="game-card">
      <div className={`game-art ${game.color}`}>
        {game.image ? (
          <img
            className="game-illustration"
            src={game.image}
            alt={game.title}
          />
        ) : (
          <span className="game-emoji" aria-label={game.title}>
            {game.icon}
          </span>
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

          <Link
            to={game.id === "mafia" ? "/play/mafia/online" : `/game/${game.id}`}
            className="play-link"
            aria-label={`Play ${game.title}`}
          >
            <ArrowUpRight size={19} />
          </Link>
        </div>
      </div>
    </article>
  );
}
