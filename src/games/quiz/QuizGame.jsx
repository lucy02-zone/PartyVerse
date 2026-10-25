import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  RotateCcw,
  Trophy,
  Users,
  Vote,
} from "lucide-react";
import { applyPlayerAnswer, buildQuizGame, getAccuracy, getLeaderboard, getWinnerNames } from "./logic.js";
import { getPlayerColor } from "../../utils/playerSetup.js";

export default function QuizGame() {
  const location = useLocation();
  const navigate = useNavigate();

  const initialConfig = location.state || {};
  const [game, setGame] = useState(() => {
    try {
      return buildQuizGame({
        players: initialConfig.players || [],
        category: initialConfig.category || "All",
        difficulty: initialConfig.difficulty || "Mixed",
        questionCount: initialConfig.questionCount || 5,
        timeLimit: initialConfig.timeLimit || 15,
      });
    } catch {
      return null;
    }
  });

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [timeLeft, setTimeLeft] = useState(game?.timeLimit || 15);
  const [phase, setPhase] = useState("question");
  const [locked, setLocked] = useState(false);

  const currentPlayer = game?.players?.[currentPlayerIndex] || null;
  const currentQuestion = game?.questions?.[currentQuestionIndex] || null;
  const isPuzzleQuestion = currentQuestion?.type === "puzzle";
  const leaderboard = useMemo(() => getLeaderboard(game?.players || []), [game]);

  useEffect(() => {
    if (!game || !currentQuestion || phase !== "question") {
      return undefined;
    }

    if (timeLeft <= 0) {
      finalizeRound(null, true);
      return undefined;
    }

    const timerId = setTimeout(() => setTimeLeft((previous) => previous - 1), 1000);
    return () => clearTimeout(timerId);
  }, [phase, timeLeft, game, currentQuestion, currentQuestionIndex, currentPlayerIndex]);

  useEffect(() => {
    if (phase !== "pass") {
      return undefined;
    }

    const timerId = setTimeout(() => {
      if (currentPlayerIndex < game.players.length - 1) {
        setCurrentPlayerIndex((previous) => previous + 1);
        setSelectedAnswer("");
        setTimeLeft(game.timeLimit);
        setLocked(false);
        setPhase("question");
        return;
      }

      if (currentQuestionIndex < game.questions.length - 1) {
        setCurrentQuestionIndex((previous) => previous + 1);
        setCurrentPlayerIndex(0);
        setSelectedAnswer("");
        setTimeLeft(game.timeLimit);
        setLocked(false);
        setPhase("question");
        return;
      }

      setPhase("results");
    }, 1200);

    return () => clearTimeout(timerId);
  }, [phase, currentPlayerIndex, currentQuestionIndex, game]);

  if (!game) {
    return (
      <main className="quiz-page">
        <div className="quiz-panel">
          <h1>Unable to start Quiz Battle</h1>
          <p>Please return to setup and add between 2 and 10 unique players.</p>
          <button type="button" className="primary-button" onClick={() => navigate("/game/quiz")}>
            Return to setup
          </button>
        </div>
      </main>
    );
  }

  function finalizeRound(answer, timedOut = false) {
    if (!currentPlayer || !currentQuestion || locked) {
      return;
    }

    const isCorrect = !timedOut && answer === currentQuestion.answer;
    const updatedPlayers = applyPlayerAnswer(game.players, currentPlayer.name, isCorrect);

    setGame((previous) => ({
      ...previous,
      players: updatedPlayers,
    }));
    setLocked(true);
    setPhase("pass");
    setSelectedAnswer("");
    setTimeLeft(game.timeLimit);
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (!selectedAnswer || locked) {
      return;
    }

    finalizeRound(selectedAnswer, false);
  }

  function restartGame() {
    const freshGame = buildQuizGame({
      players: initialConfig.players || [],
      category: initialConfig.category || "All",
      difficulty: initialConfig.difficulty || "Mixed",
      questionCount: initialConfig.questionCount || 5,
      timeLimit: initialConfig.timeLimit || 15,
    });

    setGame(freshGame);
    setCurrentQuestionIndex(0);
    setCurrentPlayerIndex(0);
    setSelectedAnswer("");
    setTimeLeft(freshGame.timeLimit);
    setPhase("question");
    setLocked(false);
  }

  const winners = phase === "results" ? getWinnerNames(game.players) : [];

  return (
    <main className="quiz-page">
      <header className="quiz-topbar">
        <Link to="/" className="back-link">
          <ArrowLeft size={17} />
          PartyVerse
        </Link>

        <span className="quiz-badge">Quiz Battle</span>
      </header>

      <section className="quiz-panel">
        {phase !== "results" && currentQuestion && currentPlayer && (
          <>
            <span className="section-kicker">
              {game.category} · {game.difficulty} · QUESTION {currentQuestionIndex + 1} OF {game.questions.length}
            </span>

            <h1><span className="player-identity-label" style={{ "--player-color": getPlayerColor(currentPlayerIndex).background, "--player-foreground": getPlayerColor(currentPlayerIndex).foreground }}>{currentPlayer.name}</span>, you’re up</h1>

            <p className="quiz-subtitle">
              Answer before the timer expires. Each correct answer is worth 10 points.
            </p>

            <div className="quiz-stats">
              <div className="quiz-stat-box">
                <Clock3 size={16} />
                <span>{timeLeft}s</span>
              </div>

              <div className="quiz-stat-box">
                <Users size={16} />
                <span>{currentPlayerIndex + 1}/{game.players.length}</span>
              </div>
            </div>

            <div className="question-card">
              <div className="question-prompt-box">
                <span className="question-label">
                  {isPuzzleQuestion ? "Puzzle" : "Question"}
                </span>
                <h2>{currentQuestion.question}</h2>
              </div>

              <form onSubmit={handleSubmit} className="quiz-form">
                {currentQuestion.options.map((option) => (
                  <label
                    key={option}
                    className={`answer-option ${selectedAnswer === option ? "answer-selected" : ""}`}
                  >
                    <input
                      type="radio"
                      name="answer"
                      value={option}
                      checked={selectedAnswer === option}
                      onChange={() => setSelectedAnswer(option)}
                      disabled={locked}
                    />
                    <span>{option}</span>
                  </label>
                ))}

                <button
                  type="submit"
                  className="primary-button full-button"
                  disabled={!selectedAnswer || locked}
                >
                  <CheckCircle2 size={18} />
                  Lock in answer
                </button>
              </form>
            </div>

            <div className="leaderboard-card">
              <div className="leaderboard-header">
                <Trophy size={18} />
                <span>Leaderboard</span>
              </div>

              {leaderboard.map((player, index) => (
                <div key={player.name} className="leaderboard-row" style={{ "--player-color": getPlayerColor(game.players.findIndex((entry) => entry.name === player.name)).background, "--player-foreground": getPlayerColor(game.players.findIndex((entry) => entry.name === player.name)).foreground }}>
                  <span className="leaderboard-rank">#{index + 1}</span>
                  <span>{player.name}</span>
                  <strong>{player.score} pts</strong>
                </div>
              ))}
            </div>
          </>
        )}

        {phase === "pass" && currentPlayer && (
          <div className="transition-card">
            <span className="section-kicker">PASS THE DEVICE</span>
            <h1>Next up: {game.players[currentPlayerIndex]?.name || currentPlayer.name}</h1>
            <p>Great work. Pass the device to the next player and get ready for the next question.</p>
          </div>
        )}

        {phase === "results" && (
          <>
            <span className="section-kicker">FINAL RESULTS</span>
            <h1>
              {winners.length > 1 ? "It’s a tie!" : `${winners[0]} wins!`}
            </h1>

            <div className="results-card">
              <div className="winner-banner">
                <Trophy size={20} />
                <span>
                  {winners.length > 1
                    ? `Tied winners: ${winners.join(", ")}`
                    : `Winner: ${winners[0]}`}
                </span>
              </div>

              {getLeaderboard(game.players).map((player, index) => (
                <div key={player.name} className="results-row" style={{ "--player-color": getPlayerColor(game.players.findIndex((entry) => entry.name === player.name)).background, "--player-foreground": getPlayerColor(game.players.findIndex((entry) => entry.name === player.name)).foreground }}>
                  <div className="result-name">
                    <span>#{index + 1}</span>
                    <strong>{player.name}</strong>
                  </div>

                  <div className="result-stats">
                    <span>{player.score} pts</span>
                    <span>{player.correctAnswers} correct</span>
                    <span>{getAccuracy(player)}% accuracy</span>
                  </div>
                </div>
              ))}

              <div className="results-actions">
                <button type="button" className="primary-button" onClick={restartGame}>
                  <RotateCcw size={18} />
                  Play Again
                </button>

                <button type="button" className="secondary-button" onClick={() => navigate("/")}>
                  Return to Games
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
