
import { useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Users,
  Gamepad2,
} from "lucide-react";
import { games } from "../data/games.js";
import Navbar from "../components/Navbar.jsx";

const playerLimits = {
  imposter: { min: 3, max: 12 },
  mafia: { min: 5, max: 15 },
  undercover: { min: 3, max: 12 },
  quiz: { min: 2, max: 10 },
  charades: { min: 3, max: 16 },
};

export default function RoomSetup() {
  const { gameId } = useParams();
  const navigate = useNavigate();

  const game = games.find((item) => item.id === gameId);
  const limits = playerLimits[gameId] || { min: 2, max: 10 };

  const [players, setPlayers] = useState(["Player 1", "Player 2"]);
  const [newPlayer, setNewPlayer] = useState("");
  const [message, setMessage] = useState("");
  const [quizConfig, setQuizConfig] = useState({
    category: "All",
    difficulty: "Mixed",
    questionCount: 5,
    timeLimit: 15,
  });

  if (!game) {
    return (
      <main className="setup-error">
        <h1>Game not found</h1>
        <Link to="/">Return to PartyVerse</Link>
      </main>
    );
  }

  function addPlayer(event) {
    event.preventDefault();

    const name = newPlayer.trim();

    if (!name) {
      setMessage("Please enter a player name.");
      return;
    }

    if (players.length >= limits.max) {
      setMessage(`This game supports up to ${limits.max} players.`);
      return;
    }

    const alreadyExists = players.some(
      (player) => player.toLowerCase() === name.toLowerCase()
    );

    if (alreadyExists) {
      setMessage("Each player must have a unique name.");
      return;
    }

    setPlayers((current) => [...current, name]);
    setNewPlayer("");
    setMessage("");
  }

  function removePlayer(index) {
    setPlayers((current) =>
      current.filter((_, playerIndex) => playerIndex !== index)
    );
    setMessage("");
  }

  function prepareGame() {
    if (players.length < limits.min) {
      setMessage(
        `Add at least ${limits.min} players to play ${game.title}.`
      );
      return;
    }

    if (gameId === "imposter") {
      navigate("/play/imposter", {
        state: { players },
      });
      return;
    }

    if (gameId === "mafia") {
      navigate("/play/mafia", {
        state: { players },
      });
      return;
    }

    if (gameId === "undercover") {
      navigate("/play/undercover", {
        state: { players },
      });
      return;
    }

    if (gameId === "quiz") {
      if (!Number.isInteger(quizConfig.questionCount) || ![5, 10, 15].includes(quizConfig.questionCount)) {
        setMessage("Please choose 5, 10, or 15 questions.");
        return;
      }

      if (!Number.isFinite(quizConfig.timeLimit) || quizConfig.timeLimit <= 0) {
        setMessage("Please choose a positive timer value.");
        return;
      }

      navigate("/play/quiz", {
        state: {
          players,
          category: quizConfig.category,
          difficulty: quizConfig.difficulty,
          questionCount: quizConfig.questionCount,
          timeLimit: quizConfig.timeLimit,
        },
      });
      return;
    }

    setMessage(`${game.title} gameplay is coming soon.`);
  }

  return (
    <>
      <Navbar />

      <main className="setup-page">
        <Link to="/" className="back-link">
          <ArrowLeft size={17} />
          Back to games
        </Link>

        <section className="setup-header">
          <div className={`setup-game-icon ${game.color}`}>
            <span>{game.icon}</span>
          </div>

          <span className="section-kicker">
            LET'S GET THE PARTY STARTED
          </span>

          <h1>Set up your game</h1>

          <p>
            Gather your friends, add their names, and get ready to play.
          </p>
        </section>

        <section className="setup-card">
          <div className="selected-game">
            <div>
              <span className="setup-label">SELECTED GAME</span>
              <h2>{game.title}</h2>
              <p>{game.description}</p>
            </div>

            <span className="selected-game-emoji">{game.icon}</span>
          </div>

          <div className="player-heading">
            <div>
              <h2>
                <Users size={20} />
                Players
              </h2>
              <p>Add names for everyone joining the game.</p>
            </div>

            <span className="player-total">
              {players.length} / {limits.max}
            </span>
          </div>

          <form className="add-player-form" onSubmit={addPlayer}>
            <input
              type="text"
              value={newPlayer}
              onChange={(event) => setNewPlayer(event.target.value)}
              placeholder="Enter a player's name"
              maxLength={30}
              aria-label="Player name"
            />

            <button type="submit" className="add-player-button">
              <Plus size={18} />
              Add player
            </button>
          </form>

          <div className="player-list">
            {players.map((player, index) => (
              <div className="player-row" key={player}>
                <span className="player-avatar">
                  {player.charAt(0).toUpperCase()}
                </span>

                <span className="player-name">{player}</span>

                <span className="player-number">#{index + 1}</span>

                <button
                  type="button"
                  className="remove-player-button"
                  onClick={() => removePlayer(index)}
                  aria-label={`Remove ${player}`}
                  title={`Remove ${player}`}
                >
                  <Trash2 size={17} />
                </button>
              </div>
            ))}
          </div>

          {gameId === "quiz" && (
            <div className="quiz-config">
              <div className="quiz-config-grid">
                <label className="quiz-config-field">
                  <span>Category</span>
                  <select
                    value={quizConfig.category}
                    onChange={(event) =>
                      setQuizConfig((current) => ({
                        ...current,
                        category: event.target.value,
                      }))
                    }
                  >
                    <option value="All">All</option>
                    <option value="General Knowledge">General Knowledge</option>
                    <option value="Science">Science</option>
                    <option value="Technology">Technology</option>
                    <option value="Sports">Sports</option>
                    <option value="Programming">Programming</option>
                  </select>
                </label>

                <label className="quiz-config-field">
                  <span>Difficulty</span>
                  <select
                    value={quizConfig.difficulty}
                    onChange={(event) =>
                      setQuizConfig((current) => ({
                        ...current,
                        difficulty: event.target.value,
                      }))
                    }
                  >
                    <option value="Mixed">Mixed</option>
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </label>

                <label className="quiz-config-field">
                  <span>Questions</span>
                  <select
                    value={quizConfig.questionCount}
                    onChange={(event) =>
                      setQuizConfig((current) => ({
                        ...current,
                        questionCount: Number(event.target.value),
                      }))
                    }
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={15}>15</option>
                  </select>
                </label>

                <label className="quiz-config-field">
                  <span>Timer (sec)</span>
                  <select
                    value={quizConfig.timeLimit}
                    onChange={(event) =>
                      setQuizConfig((current) => ({
                        ...current,
                        timeLimit: Number(event.target.value),
                      }))
                    }
                  >
                    <option value={10}>10</option>
                    <option value={15}>15</option>
                    <option value={20}>20</option>
                    <option value={30}>30</option>
                  </select>
                </label>
              </div>
            </div>
          )}

          <div className="player-guidance">
            <Gamepad2 size={18} />
            <span>
              {limits.min}–{limits.max} players required for this game.
            </span>
          </div>

          {message && (
            <p
              className={`setup-message ${
                message.endsWith("gameplay is coming soon.")
                  ? "success"
                  : "error"
              }`}
              role="status"
            >
              {message}
            </p>
          )}

          <button
            type="button"
            className="start-game-button"
            onClick={prepareGame}
          >
            Prepare game <span>→</span>
          </button>

          <p className="setup-note">
            Add your players and prepare for game night!
          </p>
        </section>
      </main>
    </>
  );
}
