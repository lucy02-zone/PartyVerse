import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  Clock3,
  Eye,
  EyeOff,
  ShieldCheck,
  Vote,
  RotateCcw,
} from "lucide-react";
import { createUndercoverRound, getRoundWinner, getVoteResult } from "./logic.js";
import { getPlayerColor } from "../../utils/playerSetup.js";

export default function UndercoverGame() {
  const location = useLocation();
  const players = Array.isArray(location.state?.players) ? location.state.players : [];

  const [round, setRound] = useState(() => {
    if (players.length < 3 || players.length > 12) return null;

    try {
      return createUndercoverRound(players);
    } catch {
      return null;
    }
  });

  const [phase, setPhase] = useState("reveal");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [votes, setVotes] = useState({});
  const [voteTarget, setVoteTarget] = useState("");
  const [voterIndex, setVoterIndex] = useState(0);
  const [result, setResult] = useState(null);
  const [seconds, setSeconds] = useState(60);
  const [timerRunning, setTimerRunning] = useState(true);

  useEffect(() => {
    if (phase !== "discussion" || !timerRunning || seconds <= 0) {
      return undefined;
    }

    const timerId = setInterval(() => {
      setSeconds((previous) => Math.max(previous - 1, 0));
    }, 1000);

    return () => clearInterval(timerId);
  }, [phase, timerRunning, seconds]);

  const formattedTime = `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;

  if (!round) {
    return (
      <main className="undercover-page">
        <div className="undercover-panel">
          <h1>Let’s get the team ready!</h1>
          <p>Undercover needs between 3 and 12 unique players.</p>
          <Link className="primary-button" to="/game/undercover">
            Set up players
          </Link>
        </div>
      </main>
    );
  }

  const currentPlayer = round.assignments[currentIndex];
  const alivePlayers = round.assignments.filter((player) => player.alive);

  function hideAndContinue() {
    setRevealed(false);

    if (currentIndex < round.assignments.length - 1) {
      setCurrentIndex((index) => index + 1);
    } else {
      setSeconds(60);
      setTimerRunning(true);
      setPhase("discussion");
    }
  }

  function submitVote(event) {
    event.preventDefault();

    if (!voteTarget || !round.assignments[voterIndex]) {
      return;
    }

    const currentVoter = round.assignments[voterIndex].name;
    const updatedVotes = {
      ...votes,
      [currentVoter]: voteTarget,
    };

    setVotes(updatedVotes);
    setVoteTarget("");

    if (voterIndex < round.assignments.length - 1) {
      setVoterIndex((index) => index + 1);
    } else {
      const voteOutcome = getVoteResult(updatedVotes, round.assignments);
      setResult(voteOutcome);
      setPhase("result");
    }
  }

  function restartRound() {
    setRound(createUndercoverRound(players));
    setPhase("reveal");
    setCurrentIndex(0);
    setRevealed(false);
    setVotes({});
    setVoteTarget("");
    setVoterIndex(0);
    setResult(null);
    setSeconds(60);
    setTimerRunning(true);
  }

  return (
    <main className="undercover-page">
      <header className="undercover-topbar">
        <Link to="/" className="back-link">
          <ArrowLeft size={17} />
          PartyVerse
        </Link>

        <span className="undercover-badge">Undercover</span>
      </header>

      <section className="undercover-panel">
        {phase === "reveal" && (
          <>
            <span className="section-kicker">
              SECRET ROLE · PLAYER {currentIndex + 1} OF {players.length}
            </span>

            <h1>Pass the device</h1>

            <p className="undercover-subtitle">
              Only the current player should see the role and secret word.
            </p>

            <div className="undercover-card">
              <span className="undercover-icon">
                {!revealed
                  ? "LOCK"
                  : currentPlayer.role === "undercover"
                    ? "IMP"
                    : "OK"}
              </span>

              {!revealed ? (
                <>
                  <h2 className="player-identity-label" style={{ "--player-color": getPlayerColor(players.indexOf(currentPlayer.name)).background, "--player-foreground": getPlayerColor(players.indexOf(currentPlayer.name)).foreground }}>{currentPlayer.name}</h2>
                  <p>Tap below to reveal your role and secret word.</p>

                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => setRevealed(true)}
                  >
                    <Eye size={18} />
                    Reveal my role
                  </button>
                </>
              ) : (
                <>
                  <h2>
                    {currentPlayer.role === "undercover"
                      ? "You are the UNDERCOVER!"
                      : "You are a CIVILIAN"}
                  </h2>

                  <p>
                    {currentPlayer.role === "undercover"
                      ? "Blend in, give clues, and avoid getting caught."
                      : "Use your word to blend in with the group."}
                  </p>

                  <div className="undercover-word-box">
                    {currentPlayer.word}
                  </div>

                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setRevealed(false)}
                  >
                    <EyeOff size={17} />
                    Hide my role
                  </button>

                  <button
                    type="button"
                    className="primary-button"
                    onClick={hideAndContinue}
                  >
                    {currentIndex === round.assignments.length - 1
                      ? "Start discussion"
                      : "Hide & pass device"}
                  </button>
                </>
              )}
            </div>

            <div className="phase-progress">
              {players.map((player, index) => (
                <span
                  key={player}
                  className={index <= currentIndex ? "progress-active" : ""}
                />
              ))}
            </div>
          </>
        )}

        {phase === "discussion" && (
          <>
            <span className="section-kicker">ROUND 1 · DISCUSSION</span>

            <h1>Read the room</h1>

            <p className="undercover-subtitle">
              Everyone gives clues, watches reactions, and tries to stay believable. When the timer is up, cast your votes.
            </p>

            <div className="undercover-card">
              <span className="discussion-emoji">CHAT</span>
              <h2>Clue time</h2>

              <div className="discussion-timer">
                <span className="timer-label">
                  <Clock3 size={14} />
                  DISCUSSION TIMER
                </span>
                <strong>{formattedTime}</strong>
                <div className="timer-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setSeconds(60)}
                  >
                    <RotateCcw size={16} />
                    Reset
                  </button>
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => {
                      setTimerRunning(false);
                      setPhase("vote");
                      setVoterIndex(0);
                    }}
                  >
                    <Vote size={17} />
                    Start voting
                  </button>
                </div>
              </div>

              <div className="player-chips">
                {players.map((player, index) => (
                  <span key={player} style={{ "--player-color": getPlayerColor(index).background, "--player-foreground": getPlayerColor(index).foreground }}><b>{index + 1}</b>{player}</span>
                ))}
              </div>
            </div>
          </>
        )}

        {phase === "vote" && (
          <>
            <span className="section-kicker">
              VOTING · PLAYER {voterIndex + 1} OF {players.length}
            </span>

            <h1>Cast your vote</h1>

            <p className="undercover-subtitle">
              Vote for the person you think is the undercover.
            </p>

            <form className="voting-form" onSubmit={submitVote}>
              {round.assignments
                .filter((player) => player.name !== round.assignments[voterIndex].name)
                .map((player) => {
                  const index = players.indexOf(player.name);
                  const color = getPlayerColor(index);
                  return <label key={player.id} style={{ "--player-color": color.background, "--player-foreground": color.foreground }} className={`vote-option ${voteTarget === player.name ? "vote-selected" : ""}`}>
                    <input type="radio" name="voteTarget" value={player.name} checked={voteTarget === player.name} onChange={() => setVoteTarget(player.name)} />
                    <span className="vote-player-number">{index + 1}</span><span className="vote-player-name">{player.name}</span>
                  </label>;
                })}

              <button
                type="submit"
                className="primary-button full-button"
                disabled={!voteTarget}
              >
                <Vote size={18} />
                {voterIndex === players.length - 1 ? "Reveal result" : "Next vote"}
              </button>
            </form>
          </>
        )}

        {phase === "result" && result && (
          <>
            <span className="section-kicker">ROUND RESULT</span>

            <h1>
              {result.winner === "civilian" && "Civilians win!"}
              {result.winner === "undercover" && "Undercover wins!"}
              {result.winner === "tie" && "Nobody was eliminated!"}
              {result.winner === "inconclusive" && "Round complete"}
            </h1>

            <div className="undercover-card result-card">
              <span className="discussion-emoji">
                {result.winner === "civilian" ? "WIN" : result.winner === "undercover" ? "IMP" : "TIE"}
              </span>

              <h2>
                {result.winner === "tie"
                  ? "The vote was tied, so no one was eliminated."
                  : result.winner === "inconclusive"
                    ? "The vote was decisive, but the round did not trigger a final winner state."
                    : result.eliminated
                      ? `${result.eliminated} was eliminated.`
                      : "The round ended with no one removed."}
              </h2>

              <p>
                {result.winner === "civilian"
                  ? "The group figured out the undercover and protected the town."
                  : result.winner === "undercover"
                    ? "The undercover players stayed hidden and won the round."
                    : result.winner === "inconclusive"
                      ? "The group kept questioning each other, but no final win state was reached in this round."
                      : "You were all too close to call. Try another round with fresh clues."}
              </p>

              <div className="result-role-grid">
                {round.assignments.map((player) => (
                  <div key={player.id} className="result-role-row" style={{ "--player-color": getPlayerColor(players.indexOf(player.name)).background, "--player-foreground": getPlayerColor(players.indexOf(player.name)).foreground }}>
                    <span>{player.name}</span>
                    <strong>{player.role}</strong>
                    <small>{player.word}</small>
                  </div>
                ))}
              </div>

              <button
                type="button"
                className="primary-button full-button"
                onClick={restartRound}
              >
                <RotateCcw size={17} />
                Play again
              </button>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
