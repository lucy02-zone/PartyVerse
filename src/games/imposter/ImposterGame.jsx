
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Users,
  Vote,
  RotateCcw,
  Clock,
} from "lucide-react";
import { createImposterRound, getVoteResult } from "./logic.js";

export default function ImposterGame() {
  const location = useLocation();
  const navigate = useNavigate();
  const players = location.state?.players || [];

  const [round, setRound] = useState(() => {
    if (players.length < 3) return null;

    try {
      return createImposterRound(players);
    } catch {
      return null;
    }
  });

  const [phase, setPhase] = useState("reveal");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [votes, setVotes] = useState({});
  const [voterIndex, setVoterIndex] = useState(0);
  const [voteTarget, setVoteTarget] = useState("");
  const [result, setResult] = useState(null);

  // Discussion countdown timer
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
    .padStart(2, "0")}:${(seconds % 60)
    .toString()
    .padStart(2, "0")}`;

  if (!round) {
    return (
      <main className="imposter-page">
        <div className="imposter-panel">
          <h1>Let's get your team ready!</h1>
          <p>At least three players are needed to start this game.</p>
          <Link className="primary-button" to="/game/imposter">
            Set up players
          </Link>
        </div>
      </main>
    );
  }

  const currentPlayer = round.assignments[currentIndex];

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

    if (!voteTarget) return;

    const updatedVotes = {
      ...votes,
      [round.assignments[voterIndex].player]: voteTarget,
    };

    setVotes(updatedVotes);
    setVoteTarget("");

    if (voterIndex < round.assignments.length - 1) {
      setVoterIndex((index) => index + 1);
    } else {
      setResult(getVoteResult(updatedVotes, round.imposterId));
      setPhase("result");
    }
  }

  function restartRound() {
    setRound(createImposterRound(players));
    setPhase("reveal");
    setCurrentIndex(0);
    setRevealed(false);
    setVotes({});
    setVoterIndex(0);
    setVoteTarget("");
    setResult(null);
    setSeconds(60);
    setTimerRunning(true);
  }

  function resetTimer() {
    setSeconds(60);
    setTimerRunning(true);
  }

  return (
    <main className="imposter-page">
      <header className="imposter-topbar">
        <Link to="/" className="back-link">
          <ArrowLeft size={17} />
          PartyVerse
        </Link>

        <span className="imposter-badge">Find the Imposter</span>
      </header>

      <section className="imposter-panel">
        {/* PRIVATE ROLE REVEAL */}
        {phase === "reveal" && (
          <>
            <span className="section-kicker">
              SECRET IDENTITY · PLAYER {currentIndex + 1} OF{" "}
              {players.length}
            </span>

            <h1>Pass the device</h1>

            <p className="imposter-subtitle">
              Make sure only the current player can see the screen.
            </p>

            <div className="secret-card">
              <div className={`secret-card-inner ${revealed ? "revealed" : ""}`}>
                <div className="secret-card-face secret-card-front">
                  <span className="secret-icon">LOCK</span>
                  <h2>{currentPlayer.player}</h2>
                  <p>Tap below to reveal your secret role.</p>

                  <button
                    type="button"
                    className="primary-button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setRevealed(true);
                    }}
                  >
                    <Eye size={18} />
                    Reveal my role
                  </button>
                </div>

                <div className="secret-card-face secret-card-back">
                  <span className="secret-icon">
                    {currentPlayer.role === "imposter" ? "IMP" : "OK"}
                  </span>

                  <h2>
                    {currentPlayer.role === "imposter"
                      ? "You are the IMPOSTER!"
                      : "You are a regular player"}
                  </h2>

                  <p>
                    {currentPlayer.role === "imposter"
                      ? "You have a related secret word. Give clues that fit in, and avoid getting caught."
                      : "Your secret word is:"}
                  </p>

                  {currentPlayer.word && (
                    <div className="secret-word">
                      {currentPlayer.word}
                    </div>
                  )}

                  <button
                    type="button"
                    className="secondary-button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setRevealed(false);
                    }}
                  >
                    <EyeOff size={17} />
                    Hide my role
                  </button>

                  <button
                    type="button"
                    className="primary-button"
                    onClick={hideAndContinue}
                  >
                    {currentIndex === players.length - 1
                      ? "Start discussion"
                      : "Hide & pass device"}
                  </button>
                </div>
              </div>
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

        {/* DISCUSSION AND TIMER */}
        {phase === "discussion" && (
          <>
            <span className="section-kicker">ROUND 1 · DISCUSSION</span>

            <h1>Who seems suspicious?</h1>

            <p className="imposter-subtitle">
              Take turns giving clues about your secret word. Don't say the
              word itself! When everyone is ready, move to voting.
            </p>

            <div className="discussion-card">
              <span className="discussion-emoji">CHAT</span>
              <h2>Discuss your clues</h2>

              <p>
                The imposter must try to blend in without knowing the secret
                word.
              </p>

              <div className="player-chips">
                {players.map((player) => (
                  <span key={player}>{player}</span>
                ))}
              </div>
            </div>

            <div
              className={`discussion-timer ${
                seconds <= 10 ? "timer-warning" : ""
              }`}
            >
              <span className="timer-label">
                <Clock size={14} />
                TIME LEFT
              </span>

              <strong>{formattedTime}</strong>

              <div className="timer-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() =>
                    setTimerRunning((running) => !running)
                  }
                  disabled={seconds === 0}
                >
                  {timerRunning ? "Pause timer" : "Resume timer"}
                </button>

                <button
                  type="button"
                  className="secondary-button"
                  onClick={resetTimer}
                >
                  <RotateCcw size={15} />
                  Reset
                </button>
              </div>

              {seconds === 0 && (
                <p className="timer-finished" role="status">
                  Time's up! Cast your votes.
                </p>
              )}
            </div>

            <button
              type="button"
              className="primary-button full-button"
              onClick={() => setPhase("voting")}
            >
              <Vote size={18} />
              Start voting
            </button>
          </>
        )}

        {/* VOTING */}
        {phase === "voting" && (
          <>
            <span className="section-kicker">
              VOTING · PLAYER {voterIndex + 1} OF {players.length}
            </span>

            <h1>Cast your vote</h1>

            <p className="imposter-subtitle">
              Pass the device to {round.assignments[voterIndex].player}.
              Choose who you think the imposter is.
            </p>

            <form
              className="voting-form"
              onSubmit={submitVote}
              key={voterIndex}
            >
              {players
                .filter(
                  (player) =>
                    player !== round.assignments[voterIndex].player
                )
                .map((player) => (
                  <label
                    key={player}
                    className={`vote-option ${
                      voteTarget === player ? "vote-selected" : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name="vote"
                      value={player}
                      checked={voteTarget === player}
                      onChange={() => setVoteTarget(player)}
                    />

                    <Users size={17} />
                    {player}
                  </label>
                ))}

              <button
                className="primary-button full-button"
                type="submit"
                disabled={!voteTarget}
              >
                {voterIndex === players.length - 1
                  ? "Reveal results"
                  : "Submit & pass device"}
              </button>
            </form>
          </>
        )}

        {/* RESULTS */}
        {phase === "result" && result && (
          <>
            <span className="section-kicker">ROUND COMPLETE</span>

            <h1>
              {result.winner === "players"
                ? "Imposter caught!"
                : result.winner === "imposter"
                  ? "The imposter wins!"
                  : "It's a tie!"}
            </h1>

            <p className="imposter-subtitle">
              {result.winner === "players"
                ? "The group identified the imposter."
                : result.winner === "imposter"
                  ? "The group voted for the wrong player."
                  : "The votes were tied, so nobody was eliminated."}
            </p>

            <div className="result-card">
              <span className="result-badge">IMP</span>
              <p>The imposter was</p>
              <h2>{round.imposterId}</h2>

              <p>The secret word was</p>
              <div className="secret-word">{round.secretWord}</div>

              <p className="result-votes">
                Votes cast: {Object.keys(votes).length}
              </p>
            </div>

            <button
              type="button"
              className="primary-button full-button"
              onClick={restartRound}
            >
              <RotateCcw size={18} />
              Play another round
            </button>

            <button
              type="button"
              className="secondary-button full-button"
              onClick={() => navigate("/game/imposter")}
            >
              Back to setup
            </button>
          </>
        )}
      </section>
    </main>
  );
}
