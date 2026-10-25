
import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Vote,
  RotateCcw,
  Clock,
} from "lucide-react";
import {
  createImposterRound,
  getCategories,
  getVoteResult,
  addImposterVote,
} from "./logic.js";
import { getPlayerColor } from "../../utils/playerSetup.js";
import lockImage from "./lock.png";
import discussionImage from "./dicussion.png";

export default function ImposterGame() {
  const location = useLocation();
  const navigate = useNavigate();
  const players = location.state?.players || [];
  const [selectedCategory, setSelectedCategory] = useState(
    location.state?.category || "Mixed"
  );

  const [round, setRound] = useState(() => {
    if (players.length < 3) return null;

    try {
      return createImposterRound(players, {
        category: location.state?.category || "Mixed",
      });
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
  const submittedVotersRef = useRef(new Set());

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
    const voter = round.assignments[voterIndex]?.player;
    if (phase !== "voting" || !voter || submittedVotersRef.current.has(voter)) return;
    const updatedVotes = addImposterVote(votes, voter, voteTarget, players);
    if (!updatedVotes) return;
    submittedVotersRef.current.add(voter);

    setVotes(updatedVotes);
    setVoteTarget("");

    if (voterIndex < round.assignments.length - 1) {
      setVoterIndex((index) => index + 1);
    } else {
      setResult(getVoteResult(updatedVotes, round.imposterId));
      setPhase("result");
    }
  }

  function restartRound(nextCategory = selectedCategory) {
    setRound(createImposterRound(players, { category: nextCategory }));
    setPhase("reveal");
    setCurrentIndex(0);
    setRevealed(false);
    setVotes({});
    setVoterIndex(0);
    setVoteTarget("");
    setResult(null);
    setSeconds(60);
    setTimerRunning(true);
    submittedVotersRef.current.clear();
  }

  function startVoting() {
    submittedVotersRef.current.clear();
    setVotes({});
    setVoteTarget("");
    setVoterIndex(0);
    setPhase("voting");
  }

  function handleCategoryChange(event) {
    const nextCategory = event.target.value;
    setSelectedCategory(nextCategory);
    restartRound(nextCategory);
  }

  function resetTimer() {
    setSeconds(60);
    setTimerRunning(true);
  }

  return (
    <main className={`imposter-page ${phase === "voting" ? "imposter-voting-page" : ""}`}>
      <header className="imposter-topbar">
        <Link to="/" className="back-link">
          <ArrowLeft size={17} />
          PartyVerse
        </Link>

        <span className="imposter-badge">Find the Imposter</span>
      </header>

      <section className={`imposter-panel ${phase === "voting" ? "imposter-panel-voting" : ""}`}>
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
                  <div className="secret-icon lock-image-wrap">
                    <img
                      src={lockImage}
                      alt="Locked"
                      className="secret-lock-image"
                    />
                  </div>
                  <h2 className="player-identity-label" style={{ "--player-color": getPlayerColor(players.indexOf(currentPlayer.player)).background, "--player-foreground": getPlayerColor(players.indexOf(currentPlayer.player)).foreground }}>{currentPlayer.player}</h2>
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
                      ? `Category: ${currentPlayer.category}. Blend in with the clue and stay under the radar.`
                      : `Your clue is about ${currentPlayer.category}:`}
                  </p>

                  <div className="secret-word">
                    {currentPlayer.role === "imposter"
                      ? currentPlayer.clue
                      : currentPlayer.answer}
                  </div>

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
                  style={{ "--player-color": getPlayerColor(index).background }}
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
              <div className="discussion-illustration">
                <img
                  src={discussionImage}
                  alt="Players discussing clues"
                  className="discussion-image"
                />
              </div>

              <h2>Discussion phase</h2>

              <p>
                The imposter must blend in using the clue only and stay calm.
              </p>

              <p className="imposter-game-context">Category: <strong>{round.category}</strong> · Keep clues broad and never say the secret word.</p>

              <div className="player-chips">
                {players.map((player, index) => (
                  <span key={player} style={{ "--player-color": getPlayerColor(index).background, "--player-foreground": getPlayerColor(index).foreground }}><b>{index + 1}</b>{player}</span>
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
              onClick={startVoting}
            >
              <Vote size={18} />
              Start voting
            </button>
          </>
        )}

        {/* VOTING */}
        {phase === "voting" && (
          <div className="imposter-voting-screen" role="region" aria-labelledby="imposter-voting-title">
            <span className="imposter-voting-kicker">PRIVATE BALLOT · ROUND 1</span>
            <h1 id="imposter-voting-title">Cast your vote</h1>
            <p className="imposter-voting-copy">Pass the device to <strong style={{ "--player-color": getPlayerColor(players.indexOf(round.assignments[voterIndex].player)).background, "--player-foreground": getPlayerColor(players.indexOf(round.assignments[voterIndex].player)).foreground }}>{round.assignments[voterIndex].player}</strong>. Choose who you think the imposter is. Votes stay hidden until everyone has voted.</p>
            <div className="imposter-vote-progress"><span>PLAYER {voterIndex + 1} OF {players.length}</span><span>{Object.keys(votes).length} SUBMITTED</span></div>

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
                .map((player) => {
                  const playerIndex = players.indexOf(player);
                  const color = getPlayerColor(playerIndex);
                  return (
                  <label
                    key={player}
                    style={{ "--player-color": color.background, "--player-foreground": color.foreground }}
                    className={`vote-option imposter-vote-option ${
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

                    <span className="vote-player-number">{playerIndex + 1}</span>
                    <span className="vote-player-name">{player}</span>
                    <span className="vote-choice-label">{voteTarget === player ? "SELECTED" : "TAP TO SELECT"}</span>
                  </label>
                )})}

              <button
                className="primary-button full-button"
                type="submit"
                disabled={!voteTarget}
              >
                {voterIndex === players.length - 1 ? "Submit final vote" : "Confirm vote & pass"}
              </button>
              <p className="imposter-vote-status" role="status">{voteTarget ? `Selected: ${voteTarget}. Confirm to submit your private vote.` : "Your vote is pending. Select one player to continue."}</p>
            </form>
          </div>
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

              <p>The secret answer was</p>
              <div className="secret-word">{round.secretWord}</div>

              <p className="result-votes">
                Votes cast: {Object.keys(votes).length}
              </p>
              <div className="imposter-vote-results" aria-label="Vote totals">
                {Object.entries(result.counts || {}).sort((a, b) => b[1] - a[1]).map(([player, count]) => <div key={player} style={{ "--player-color": getPlayerColor(players.indexOf(player)).background, "--player-foreground": getPlayerColor(players.indexOf(player)).foreground }}><span>{player}</span><strong>{count} {count === 1 ? "vote" : "votes"}</strong></div>)}
              </div>
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
              onClick={() => navigate("/game/imposter", { state: { players, category: selectedCategory } })}
            >
              Back to setup
            </button>
          </>
        )}
      </section>
    </main>
  );
}
