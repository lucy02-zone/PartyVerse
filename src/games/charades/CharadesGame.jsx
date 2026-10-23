import { useEffect, useMemo, useRef, useState } from "react";
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
  Smartphone,
} from "lucide-react";
import {
  buildCharadesGame,
  buildScoreboard,
  getTurnDetails,
  getWinningTeams,
} from "./logic.js";
import { getPromptDeck } from "./prompts.js";

const TILT_THRESHOLD = 22;
const TILT_COOLDOWN_MS = 1100;

export default function CharadesGame() {
  const location = useLocation();
  const navigate = useNavigate();
  const initialConfig = location.state || {};

  const [game, setGame] = useState(() => {
    try {
      return buildCharadesGame({
        players: initialConfig.players || [],
        category: "Telugu Movies",
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
  const [timeLeft, setTimeLeft] = useState(
    game?.turnDuration || initialConfig.turnDuration || 60
  );
  const [isPaused, setIsPaused] = useState(false);
  const [privatePromptVisible, setPrivatePromptVisible] = useState(false);
  const [turnResolved, setTurnResolved] = useState(false);
  const [promptDeck, setPromptDeck] = useState(() =>
    game ? [...game.deck] : []
  );
  const [usedPrompts, setUsedPrompts] = useState([]);
  const [currentPrompt, setCurrentPrompt] = useState(null);
  const [tiltEnabled, setTiltEnabled] = useState(false);
  const [tiltStatus, setTiltStatus] = useState(
    typeof window !== "undefined" && "DeviceOrientationEvent" in window
      ? "Tilt controls are optional. Enable them on your phone."
      : "Motion sensors are unavailable here. Use the buttons below."
  );
  const neutralBetaRef = useRef(null);
  const lastTiltActionRef = useRef(0);
  const tiltArmedRef = useRef(true);
  const turnTimeoutRef = useRef(null);

  const totalTurns = useMemo(() => {
    if (!game || !game.teams?.length) return 0;
    return game.teams.length * game.roundCount;
  }, [game]);

  const currentTurn = useMemo(
    () => (game ? getTurnDetails(game, turnIndex) : null),
    [game, turnIndex]
  );

  useEffect(() => {
    if (!game || currentPrompt || phase !== "preparation") return;
    prepareNextTurn(turnIndex);
    // The turn is prepared only when the current prompt is empty.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game, currentPrompt, phase, turnIndex]);

  useEffect(() => {
    if (!game || !currentPrompt || phase !== "acting" || isPaused || turnResolved) {
      return undefined;
    }

    if (timeLeft <= 0) {
      endTurn("timeout");
      return undefined;
    }

    const timerId = window.setTimeout(() => {
      setTimeLeft((previous) => Math.max(0, previous - 1));
    }, 1000);

    return () => window.clearTimeout(timerId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game, currentPrompt, phase, isPaused, turnResolved, timeLeft]);

  useEffect(() => {
    return () => {
      if (turnTimeoutRef.current) window.clearTimeout(turnTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!tiltEnabled || phase !== "acting" || isPaused || turnResolved) {
      return undefined;
    }

    if (typeof window === "undefined" || !("DeviceOrientationEvent" in window)) {
      setTiltStatus("Motion sensors are unavailable. Use the buttons below.");
      return undefined;
    }

    const handleOrientation = (event) => {
      if (typeof event.beta !== "number") return;

      if (neutralBetaRef.current === null) {
        neutralBetaRef.current = event.beta;
        setTiltStatus("Tilt ready — tilt up for correct, down to skip.");
        return;
      }

      const delta = event.beta - neutralBetaRef.current;

      // Re-arm only after the phone returns close to its neutral position.
      if (Math.abs(delta) < 9) {
        tiltArmedRef.current = true;
        return;
      }

      const now = Date.now();
      if (!tiltArmedRef.current || now - lastTiltActionRef.current < TILT_COOLDOWN_MS) {
        return;
      }

      
if (delta <= -TILT_THRESHOLD) {
  tiltArmedRef.current = false;
  lastTiltActionRef.current = now;
  handleCorrect();
} else if (delta >= TILT_THRESHOLD) {
  tiltArmedRef.current = false;
  lastTiltActionRef.current = now;
  handleSkip();
}

    };

    window.addEventListener("deviceorientation", handleOrientation, true);
    return () => window.removeEventListener("deviceorientation", handleOrientation, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
}, [
  tiltEnabled,
  phase,
  isPaused,
  turnResolved,
  currentPrompt,
  promptDeck,
  usedPrompts,
  turnIndex,
]);
  async function enableTiltControls() {
    if (typeof window === "undefined" || !("DeviceOrientationEvent" in window)) {
      setTiltStatus("This device/browser does not support motion sensors. Use the buttons below.");
      return;
    }

    try {
      const orientationApi = window.DeviceOrientationEvent;
      if (typeof orientationApi.requestPermission === "function") {
        const permission = await orientationApi.requestPermission();
        if (permission !== "granted") {
          setTiltStatus("Motion permission was not granted. You can still use Correct and Skip.");
          setTiltEnabled(false);
          return;
        }
      }

      neutralBetaRef.current = null;
      lastTiltActionRef.current = 0;
      tiltArmedRef.current = true;
      setTiltEnabled(true);
      setTiltStatus("Tilt enabled. Tilt up for correct and tilt down to skip.");
    } catch {
      setTiltEnabled(false);
      setTiltStatus("Could not enable motion sensors. Use Correct and Skip instead.");
    }
  }

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
    const availablePrompt = promptDeck.find(
      (entry) => !usedPrompts.includes(entry.prompt)
    );

    if (availablePrompt) {
      setPromptDeck((previous) =>
        previous.filter((entry) => entry.prompt !== availablePrompt.prompt)
      );
      setUsedPrompts((previous) => [...previous, availablePrompt.prompt]);
      return availablePrompt;
    }

    const refreshedDeck = getPromptDeck("Telugu Movies", 200);
    const nextPrompt = refreshedDeck[0] || null;
    setPromptDeck(
      nextPrompt
        ? refreshedDeck.filter((entry) => entry.prompt !== nextPrompt.prompt)
        : []
    );
    setUsedPrompts(nextPrompt ? [nextPrompt.prompt] : []);
    return nextPrompt;
  }

  function prepareNextTurn(nextIndex) {
    if (!game || nextIndex >= totalTurns) {
      setCurrentPrompt(null);
      setPhase("results");
      return;
    }

    const nextPrompt = pickNextPrompt();
    setCurrentPrompt(nextPrompt);
    setPrivatePromptVisible(false);
    setTurnResolved(false);
    setTimeLeft(game.turnDuration);
    setIsPaused(false);
    setPhase("preparation");
    neutralBetaRef.current = null;
    tiltArmedRef.current = true;
  }

  function applyScore(teamId, result) {
    setTeamScores((previous) =>
      previous.map((team) => {
        if (team.teamId !== teamId) return team;
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
    if (!currentTeam || turnResolved) return;

    setTurnResolved(true);
    setIsPaused(true);
    setTiltStatus(
      result === "correct"
        ? "Correct! +1 point."
        : result === "skip"
          ? "Skipped — no point."
          : "Time is up."
    );

    if (result === "correct") applyScore(currentTeam.id, "correct");
    else if (result === "skip") applyScore(currentTeam.id, "skip");
    else applyScore(currentTeam.id, "timeout");

    setPhase("scoreboard");
    setPrivatePromptVisible(false);

    const nextTurnIndex = turnIndex + 1;
    if (turnTimeoutRef.current) window.clearTimeout(turnTimeoutRef.current);
    turnTimeoutRef.current = window.setTimeout(() => {
      if (nextTurnIndex >= totalTurns) {
        setCurrentPrompt(null);
        setPhase("results");
        return;
      }
      setTurnIndex(nextTurnIndex);
      prepareNextTurn(nextTurnIndex);
    }, 1300);
  }

  function handleStartActing() {
    if (!currentPrompt || turnResolved) return;
    setPrivatePromptVisible(true);
  }

  function beginActing() {
    if (!currentPrompt || turnResolved) return;
    setTimeLeft(game.turnDuration);
    setIsPaused(false);
    setPhase("acting");
    neutralBetaRef.current = null;
    tiltArmedRef.current = true;
  }

  
function handleCorrect() {
  if (!currentPrompt || turnResolved || isPaused) return;

  // Award 1 point without ending the current player's turn.
  if (currentTeam) {
    setTeamScores((previous) =>
      previous.map((team) =>
        team.teamId === currentTeam.id
          ? {
              ...team,
              score: team.score + 1,
              correctAnswers: team.correctAnswers + 1,
            }
          : team
      )
    );
  }

  // Show the next movie to the SAME player.
  const nextPrompt = pickNextPrompt();
  setCurrentPrompt(nextPrompt);
}

function handleSkip() {
  if (!currentPrompt || turnResolved || isPaused) return;

  // Skipping does not end the turn or award a point.
  if (currentTeam) {
    setTeamScores((previous) =>
      previous.map((team) =>
        team.teamId === currentTeam.id
          ? {
              ...team,
              skippedPrompts: team.skippedPrompts + 1,
            }
          : team
      )
    );
  }

  // Show the next movie to the SAME player.
  const nextPrompt = pickNextPrompt();
  setCurrentPrompt(nextPrompt);
}


  function handleEndTurn() {
    endTurn("timeout");
  }

  function restartGame() {
    if (turnTimeoutRef.current) window.clearTimeout(turnTimeoutRef.current);
    let freshGame;
    try {
      freshGame = buildCharadesGame({
        players: initialConfig.players || [],
        category: "Telugu Movies",
        roundCount: initialConfig.roundCount || 3,
        turnDuration: initialConfig.turnDuration || 60,
        teamMode: initialConfig.teamMode || "individual",
        teamCount: initialConfig.teamCount || 2,
      });
    } catch {
      navigate("/game/charades");
      return;
    }

    setGame(freshGame);
    setTeamScores(buildScoreboard(freshGame.teams));
    setTurnIndex(0);
    setPhase("preparation");
    setTimeLeft(freshGame.turnDuration);
    setIsPaused(false);
    setPrivatePromptVisible(false);
    setTurnResolved(false);
    setPromptDeck([...freshGame.deck]);
    setUsedPrompts([]);
    setCurrentPrompt(null);
    setTiltEnabled(false);
    setTiltStatus("Tilt controls are optional. Enable them on your phone.");
  }

  const winners = phase === "results" ? getWinningTeams(teamScores) : [];

  return (
    <main className="charades-page">
      <header className="charades-topbar">
        <Link to="/" className="back-link">
          <ArrowLeft size={17} />
          PartyVerse
        </Link>
        <span className="charades-badge">Telugu Movie Charades</span>
      </header>

      <section className="charades-panel">
        {phase !== "results" && currentTurn && (
          <>
            <span className="section-kicker">
              TELUGU MOVIES · ROUND {currentTurn.roundNumber} OF {game.roundCount}
            </span>

            <h1>
              {currentTurn.team.name} · {currentTurn.actingPlayer}
            </h1>

            <p className="charades-subtitle">
              Act without speaking. Only Telugu movie titles appear in this game.
            </p>

            <div className="charades-stats">
              <div className="charades-stat-box">
                <Clock3 size={16} />
                <span>{phase === "preparation" ? "Ready when you are" : `${timeLeft}s`}</span>
              </div>
              <div className="charades-stat-box">
                <Users size={16} />
                <span>{currentTurn.team.players.length} players</span>
              </div>
            </div>

            {phase === "preparation" && (
              <div className="charades-card">
                <div className="privacy-banner">
                  Pass the phone to {currentTurn.actingPlayer}. Keep the movie title hidden from the guessers.
                </div>

                {privatePromptVisible ? (
                  <>
                    <span className="charades-secret-label">Your Telugu movie</span>
                    <div className="charades-secret-prompt">{currentPrompt?.prompt}</div>

                    <button
                      type="button"
                      className="secondary-button full-button"
                      onClick={enableTiltControls}
                    >
                      <Smartphone size={17} />
                      {tiltEnabled ? "Tilt controls enabled" : "Enable phone tilt"}
                    </button>
                    <p className="charades-subtitle" role="status">{tiltStatus}</p>

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
                      Reveal my movie
                    </button>
                  </>
                )}
              </div>
            )}

            {phase === "acting" && (
              <>
                <div className="charades-card">
                  <span className="charades-secret-label">Acting now · Telugu movie</span>
                  <div className="charades-secret-prompt">{currentPrompt?.prompt}</div>
                  <p className="charades-subtitle">
                    Tilt up = Correct (+1 point) · Tilt down = Skip (0 points)
                  </p>

                  <div className="charades-controls">
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => setIsPaused((previous) => !previous)}
                    >
                      {isPaused ? <Play size={16} /> : <Pause size={16} />}
                      {isPaused ? "Resume" : "Pause"}
                    </button>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={enableTiltControls}
                    >
                      <Smartphone size={16} />
                      {tiltEnabled ? "Tilt on" : "Enable tilt"}
                    </button>
                  </div>

                  <p className="charades-subtitle" role="status">{tiltStatus}</p>
                  {isPaused && <p className="charades-subtitle">Timer paused.</p>}

                  <div className="charades-actions">
                    <button
                      type="button"
                      className="primary-button"
                      onClick={handleCorrect}
                      disabled={isPaused || turnResolved}
                    >
                      <CheckCircle2 size={16} />
                      Correct (+1)
                    </button>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={handleSkip}
                      disabled={isPaused || turnResolved}
                    >
                      <SkipForward size={16} />
                      Skip
                    </button>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={handleEndTurn}
                      disabled={isPaused || turnResolved}
                    >
                      End turn
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
                <p>The next team is up in a moment.</p>
              </div>
            )}
          </>
        )}

        {phase === "results" && (
          <>
            <span className="section-kicker">FINAL RESULTS · TELUGU MOVIES</span>
            <h1>
              {winners.length > 1
                ? "It’s a tie!"
                : `${winners[0]?.name || "No winner"} wins!`}
            </h1>

            <div className="results-card">
              <div className="winner-banner">
                <Trophy size={20} />
                <span>
                  {winners.length > 1
                    ? `Tied teams: ${winners.map((team) => team.name).join(", ")}`
                    : `Winner: ${winners[0]?.name || "No winner"}`}
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
