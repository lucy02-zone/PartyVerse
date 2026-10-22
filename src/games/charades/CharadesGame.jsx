import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Pause,
  Play,
  RotateCcw,
  SkipForward,
  Trophy,
  Users,
} from "lucide-react";
import {
  buildCharadesGame,
  buildScoreboard,
  getTurnDetails,
  getWinningTeams,
} from "./logic.js";
import { getPromptDeck } from "./prompts.js";

const PREP_TIME = 3;

export default function CharadesGame() {
  const location = useLocation();
  const navigate = useNavigate();

  const initialConfig = location.state || {};
  const [game, setGame] = useState(() => {
    try {
      return buildCharadesGame({
        players: initialConfig.players || [],
        category: initialConfig.category || "Mixed",
        roundCount: initialConfig.roundCount || 3,
        turnDuration: initialConfig.turnDuration || 60,
        teamMode: initialConfig.teamMode || "individual",
        teamCount: initialConfig.teamCount || 2,
      });
    } catch {
      return null;
    }
  });

  const [teamScores, setTeamScores] = useState(() =>
    game ? buildScoreboard(game.teams) : []
  );
  const [turnIndex, setTurnIndex] = useState(0);
  const [phase, setPhase] = useState("preparation");
  const [timeLeft, setTimeLeft] = useState(PREP_TIME);
  const [isPaused, setIsPaused] = useState(false);
  const [privatePromptVisible, setPrivatePromptVisible] = useState(false);
  const [turnResolved, setTurnResolved] = useState(false);
  const [promptDeck, setPromptDeck] = useState(() =>
    game ? [...game.deck] : []
  );
  const [usedPrompts, setUsedPrompts] = useState([]);
  const [currentPrompt, setCurrentPrompt] = useState(null);

  const totalTurns = useMemo(() => {
    if (!game || !game.teams?.length) return 0;
    return game.teams.length * game.roundCount;
  }, [game]);

  const currentTurn = useMemo(() => {
    if (!game) return null;
    return getTurnDetails(game, turnIndex);
  }, [game, turnIndex]);

  useEffect(() => {
    if (!game) {
      return undefined;
    }

    if (!currentPrompt && phase === "preparation") {
      prepareNextTurn(turnIndex);
    }

    return undefined;
  }, [game, currentPrompt, phase, turnIndex]);

  useEffect(() => {
    if (!game || !currentPrompt || (phase !== "preparation" && phase !== "acting") || isPaused) {
      return undefined;
    }

    const timerLength = phase === "preparation" ? PREP_TIME : game.turnDuration;

    if (timeLeft <= 0) {
      if (phase === "preparation") {
        setPhase("acting");
        setTimeLeft(game.turnDuration);
        return undefined;
      }

      if (!turnResolved) {
        endTurn("timeout");
      }
      return undefined;
    }

    const timerId = setTimeout(() => {
      setTimeLeft((previous) => previous - 1);
    }, 1000);

    return () => clearTimeout(timerId);
  }, [game, phase, isPaused, timeLeft, currentPrompt, turnResolved]);

  if (!game) {
    return (
      <main className="charades-page">
        <div className="charades-panel">
          <h1>Unable to start Charades</h1>
          <p>Please return to setup with 3–16 unique players.</p>
          <button
            type="button"
            className="primary-button"
            onClick={() => navigate("/game/charades")}
          >
            Back to setup
          </button>
        </div>
      </main>
    );
  }

  const currentTeam = currentTurn?.team;
  const currentPlayerName = currentTurn?.actingPlayer;

  function pickNextPrompt() {
    if (!promptDeck.length) {
      const refreshedDeck = getPromptDeck(game.category, 200);
      setPromptDeck(refreshedDeck);
      return refreshedDeck[0] || null;
    }

    const availablePrompt = [...promptDeck].find(
      (entry) => !usedPrompts.includes(entry.prompt)
    );

    if (!availablePrompt) {
      setUsedPrompts([]);
      const refreshedDeck = getPromptDeck(game.category, 200);
      setPromptDeck(refreshedDeck);
      return refreshedDeck[0] || null;
    }

    const nextDeck = promptDeck.filter((entry) => entry.prompt !== availablePrompt.prompt);
    setPromptDeck(nextDeck);
    setUsedPrompts((previous) => [...previous, availablePrompt.prompt]);
    return availablePrompt;
  }

  function prepareNextTurn(nextIndex) {
    if (!game || nextIndex >= totalTurns) {
      setPhase("results");
      return;
    }

    const nextPrompt = pickNextPrompt();
    setCurrentPrompt(nextPrompt);
    setPrivatePromptVisible(false);
    setTurnResolved(false);
    setTimeLeft(PREP_TIME);
    setIsPaused(false);
    setPhase("preparation");
  }

  function applyScore(teamId, result) {
    setTeamScores((previous) =>
      previous.map((team) => {
        if (team.teamId !== teamId) {
          return team;
        }

        return {
          ...team,
          turnsPlayed: team.turnsPlayed + 1,
          score: result === "correct" ? team.score + 1 : team.score,
          correctAnswers:
            result === "correct" ? team.correctAnswers + 1 : team.correctAnswers,
          skippedPrompts:
            result === "skip" ? team.skippedPrompts + 1 : team.skippedPrompts,
        };
      })
    );
  }

  function endTurn(result) {
    if (!currentTeam || turnResolved) {
      return;
    }

    setTurnResolved(true);
    setIsPaused(true);

    if (result === "correct") {
      applyScore(currentTeam.id, "correct");
    } else if (result === "skip") {
      applyScore(currentTeam.id, "skip");
    } else {
      applyScore(currentTeam.id, "timeout");
    }

    setPhase("scoreboard");
    setPrivatePromptVisible(false);

    const nextTurnIndex = turnIndex + 1;
    setTimeout(() => {
      if (nextTurnIndex >= totalTurns) {
        setPhase("results");
        return;
      }

      setTurnIndex(nextTurnIndex);
      prepareNextTurn(nextTurnIndex);
    }, 1300);
  }

  function handleStartActing() {
    setPrivatePromptVisible(true);
  }

  function beginActing() {
    setPhase("acting");
    setTimeLeft(game.turnDuration);
    setIsPaused(false);
  }

  function handleCorrect() {
    endTurn("correct");
  }

  function handleSkip() {
    endTurn("skip");
  }

  function handleEndTurn() {
    endTurn("timeout");
  }

  function restartGame() {
    const freshGame = buildCharadesGame({
      players: initialConfig.players || [],
      category: initialConfig.category || "Mixed",
      roundCount: initialConfig.roundCount || 3,
      turnDuration: initialConfig.turnDuration || 60,
      teamMode: initialConfig.teamMode || "individual",
      teamCount: initialConfig.teamCount || 2,
    });

    setGame(freshGame);
    setTeamScores(buildScoreboard(freshGame.teams));
    setTurnIndex(0);
    setPhase("preparation");
    setTimeLeft(PREP_TIME);
    setIsPaused(false);
    setPrivatePromptVisible(false);
    setTurnResolved(false);
    setPromptDeck([...freshGame.deck]);
    setUsedPrompts([]);
    setCurrentPrompt(null);
  }

  const winners = phase === "results" ? getWinningTeams(teamScores) : [];

  return (
    <main className="charades-page">
      <header className="charades-topbar">
        <Link to="/" className="back-link">
          <ArrowLeft size={17} />
          PartyVerse
        </Link>

        <span className="charades-badge">🎬 Charades</span>
      </header>

      <section className="charades-panel">
        {phase !== "results" && currentTurn && (
          <>
            <span className="section-kicker">
              {game.category} · ROUND {currentTurn.roundNumber} OF {game.roundCount}
            </span>

            <h1>
              {currentTurn.team.name} · {currentTurn.actingPlayer}
            </h1>

            <p className="charades-subtitle">
              Keep the prompt secret from the guessers and act without speaking.
            </p>

            <div className="charades-stats">
              <div className="charades-stat-box">
                <Clock3 size={16} />
                <span>
                  {phase === "preparation"
                    ? `Prep ${timeLeft}s`
                    : `${timeLeft}s`}
                </span>
              </div>

              <div className="charades-stat-box">
                <Users size={16} />
                <span>
                  {currentTurn.team.players.length} players
                </span>
              </div>
            </div>

            {phase === "preparation" && (
              <div className="charades-card">
                <div className="privacy-banner">
                  🔒 Privacy reminder: keep the prompt hidden from the rest of the group.
                </div>

                {privatePromptVisible ? (
                  <>
                    <span className="charades-secret-label">Secret prompt</span>
                    <div className="charades-secret-prompt">{currentPrompt?.prompt}</div>
                    <button
                      type="button"
                      className="primary-button full-button"
                      onClick={beginActing}
                    >
                      <CheckCircle2 size={18} />
                      Start acting
                    </button>
                  </>
                ) : (
                  <>
                    <div className="charades-placeholder">
                      The prompt is only for {currentTurn.actingPlayer}.
                    </div>
                    <button
                      type="button"
                      className="primary-button full-button"
                      onClick={handleStartActing}
                    >
                      Reveal my prompt
                    </button>
                  </>
                )}
              </div>
            )}

            {phase === "acting" && (
              <>
                <div className="charades-card">
                  <span className="charades-secret-label">Acting now</span>
                  <h2>{currentPlayerName}</h2>

                  <div className="charades-controls">
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => setIsPaused((previous) => !previous)}
                    >
                      {isPaused ? <Play size={16} /> : <Pause size={16} />}
                      {isPaused ? "Resume" : "Pause"}
                    </button>
                  </div>

                  <div className="charades-actions">
                    <button type="button" className="primary-button" onClick={handleCorrect}>
                      Correct
                    </button>
                    <button type="button" className="secondary-button" onClick={handleSkip}>
                      <SkipForward size={16} />
                      Skip
                    </button>
                    <button type="button" className="secondary-button" onClick={handleEndTurn}>
                      End Turn
                    </button>
                  </div>
                </div>

                <div className="charades-scoreboard">
                  <div className="leaderboard-header">
                    <Trophy size={18} />
                    <span>Live Score</span>
                  </div>

                  {teamScores.map((team) => (
                    <div key={team.teamId} className="leaderboard-row">
                      <span className="leaderboard-rank">{team.name}</span>
                      <span>{team.score} pts</span>
                      <strong>{team.correctAnswers} correct</strong>
                    </div>
                  ))}
                </div>
              </>
            )}

            {phase === "scoreboard" && (
              <div className="charades-card">
                <h2>Turn complete</h2>
                <p>Nice work. The next team is up in a moment.</p>
              </div>
            )}
          </>
        )}

        {phase === "results" && (
          <>
            <span className="section-kicker">FINAL RESULTS</span>
            <h1>
              {winners.length > 1 ? "It’s a tie!" : `${winners[0]?.name || "No winner"} wins!`}
            </h1>

            <div className="results-card">
              <div className="winner-banner">
                <Trophy size={20} />
                <span>
                  {winners.length > 1
                    ? `Tied teams: ${winners.map((team) => team.name).join(", ")}`
                    : `Winner: ${winners[0]?.name || "Tied"}`}
                </span>
              </div>

              {teamScores
                .slice()
                .sort((a, b) => b.score - a.score || b.correctAnswers - a.correctAnswers)
                .map((team, index) => (
                  <div key={team.teamId} className="results-row">
                    <div className="result-name">
                      <span>#{index + 1}</span>
                      <strong>{team.name}</strong>
                    </div>

                    <div className="result-stats">
                      <span>{team.score} pts</span>
                      <span>{team.correctAnswers} correct</span>
                      <span>{team.skippedPrompts} skipped</span>
                      <span>{team.turnsPlayed} turns</span>
                    </div>
                  </div>
                ))}

              <div className="results-actions">
                <button type="button" className="primary-button" onClick={restartGame}>
                  <RotateCcw size={18} />
                  Play Again
                </button>

                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => navigate("/")}
                >
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
