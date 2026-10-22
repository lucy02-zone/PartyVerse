import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  MoonStar,
  Vote,
  TimerReset,
} from "lucide-react";
import { createMafiaRound, getVoteResult } from "./logic.js";

export default function MafiaGame() {
  const location = useLocation();
  const players = location.state?.players || [];

  const [round, setRound] = useState(() => {
    if (players.length < 5) return null;

    try {
      return createMafiaRound(players);
    } catch {
      return null;
    }
  });

  const [phase, setPhase] = useState("reveal");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [nightTarget, setNightTarget] = useState("");
  const [votes, setVotes] = useState({});
  const [voterIndex, setVoterIndex] = useState(0);
  const [result, setResult] = useState(null);
  const [nightResult, setNightResult] = useState(null);

  if (!round) {
    return (
      <main className="imposter-page">
        <div className="imposter-panel">
          <h1>Let’s get your crew ready!</h1>
          <p>At least five players are needed to start a Mafia game.</p>
          <Link className="primary-button" to="/game/mafia">
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
      setPhase("night");
      setCurrentIndex(0);
    }
  }

  function confirmNightTarget() {
    if (!nightTarget) return;

    const eliminated = nightTarget;
    setNightResult({ eliminated, message: `${eliminated} was targeted by the mafia.` });
    setPhase("discussion");
    setDiscussion(true);
  }

  function submitVote(event) {
    event.preventDefault();

    const currentVoter = round.assignments[voterIndex]?.player;
    if (!currentVoter) {
      return;
    }

    const voteTarget = votes[currentVoter];
    if (!voteTarget) return;

    const updatedVotes = {
      ...votes,
      [currentVoter]: voteTarget,
    };

    setVotes(updatedVotes);

    if (voterIndex < round.assignments.length - 1) {
      setVoterIndex((index) => index + 1);
    } else {
      setResult(getVoteResult(updatedVotes, round.mafiaPlayers));
      setPhase("result");
    }
  }

  function restartRound() {
    setRound(createMafiaRound(players));
    setPhase("reveal");
    setCurrentIndex(0);
    setRevealed(false);
    setNightTarget("");
    setVotes({});
    setVoterIndex(0);
    setResult(null);
    setNightResult(null);
  }

  return (
    <main className="imposter-page">
      <header className="imposter-topbar">
        <Link to="/" className="back-link">
          <ArrowLeft size={17} />
          PartyVerse
        </Link>

        <span className="imposter-badge">🌙 Mafia Night</span>
      </header>

      <section className="imposter-panel">
        {phase === "reveal" && (
          <>
            <span className="section-kicker">
              SECRET ROLE · PLAYER {currentIndex + 1} OF {players.length}
            </span>

            <h1>Pass the phone around</h1>

            <p className="imposter-subtitle">
              Only the active player should see their role.
            </p>

            <div className="secret-card">
              <span className="secret-icon">
                {!revealed ? "🔒" : currentPlayer.role === "mafia" ? "🕵️" : "🛡️"}
              </span>

              {!revealed ? (
                <>
                  <h2>{currentPlayer.player}</h2>
                  <p>Tap below to reveal your secret role.</p>

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
                    {currentPlayer.role === "mafia"
                      ? "You are part of the MAFIA!"
                      : "You are a townsperson"}
                  </h2>

                  <p>
                    {currentPlayer.role === "mafia"
                      ? "You know the other mafia members. Stay calm and blend in."
                      : "You are trying to uncover the hidden mafia before they take over."}
                  </p>

                  {currentPlayer.role === "mafia" && (
                    <div className="player-chips">
                      {round.mafiaPlayers.map((player) => (
                        <span key={player}>{player}</span>
                      ))}
                    </div>
                  )}

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
                    {currentIndex === players.length - 1
                      ? "Begin night phase"
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

        {phase === "night" && (
          <>
            <span className="section-kicker">PHASE 1 · NIGHT</span>

            <h1>Choose the mafia target</h1>

            <p className="imposter-subtitle">
              The mafia secretly decides who to eliminate before dawn.
            </p>

            <div className="discussion-card">
              <span>🌙</span>
              <h2>Night action</h2>

              <p>
                Select a player to target. The village will vote on the next day.
              </p>

              <div className="voting-form">
                {players.map((player) => (
                  <label className={`vote-option ${nightTarget === player ? "vote-selected" : ""}`} key={player}>
                    <input
                      type="radio"
                      name="nightTarget"
                      value={player}
                      checked={nightTarget === player}
                      onChange={() => setNightTarget(player)}
                    />
                    <span>{player}</span>
                  </label>
                ))}
              </div>

              <button
                type="button"
                className="primary-button full-button"
                onClick={confirmNightTarget}
                disabled={!nightTarget}
              >
                <MoonStar size={18} />
                Confirm target
              </button>
            </div>
          </>
        )}

        {phase === "discussion" && (
          <>
            <span className="section-kicker">PHASE 2 · DISCUSSION</span>

            <h1>Talk it out</h1>

            <p className="imposter-subtitle">
              Everyone discusses suspicions, alibis, and strange behavior.
            </p>

            <div className="discussion-card">
              <span>💬</span>
              <h2>Daytime discussion</h2>

              <p>
                {nightResult
                  ? `${nightResult.message} Now debate who should be voted out.`
                  : "Use the conversation to challenge the mafia and find hidden loyalties."}
              </p>

              <div className="player-chips">
                {players.map((player) => (
                  <span key={player}>{player}</span>
                ))}
              </div>

              <button
                type="button"
                className="primary-button full-button"
                onClick={() => {
                  setPhase("vote");
                  setVoterIndex(0);
                }}
              >
                <Vote size={18} />
                Start voting
              </button>
            </div>
          </>
        )}

        {phase === "vote" && (
          <>
            <span className="section-kicker">
              PHASE 3 · VOTE · PLAYER {voterIndex + 1} OF {players.length}
            </span>

            <h1>Cast your vote</h1>

            <p className="imposter-subtitle">
              Pass the device to {round.assignments[voterIndex]?.player}.
            </p>

            <div className="discussion-card">
              <span>🗳️</span>
              <h2>Who should be eliminated?</h2>

              <form className="voting-form" onSubmit={submitVote}>
                {(players.filter(
                  (player) => player !== round.assignments[voterIndex]?.player
                ) || []).map((player) => (
                  <label
                    key={player}
                    className={`vote-option ${votes[round.assignments[voterIndex]?.player] === player ? "vote-selected" : ""}`}
                  >
                    <input
                      type="radio"
                      name="voteTarget"
                      value={player}
                      checked={votes[round.assignments[voterIndex]?.player] === player}
                      onChange={() =>
                        setVotes((current) => ({
                          ...current,
                          [round.assignments[voterIndex].player]: player,
                        }))
                      }
                    />
                    <span>{player}</span>
                  </label>
                ))}

                <button
                  type="submit"
                  className="primary-button full-button"
                  disabled={!round.assignments[voterIndex] || !votes[round.assignments[voterIndex]?.player]}
                >
                  <Vote size={18} />
                  {voterIndex === players.length - 1 ? "Reveal elimination" : "Next vote"}
                </button>
              </form>
            </div>
          </>
        )}

        {phase === "result" && result && (
          <>
            <span className="section-kicker">ROUND RESULT</span>

            <h1>{result.winner === "villagers" ? "The villagers win!" : result.winner === "mafia" ? "The mafia wins!" : "No elimination"}</h1>

            <div className="result-card">
              <span>{result.winner === "villagers" ? "🏆" : "☠️"}</span>
              <h2>
                {result.eliminated
                  ? `${result.eliminated} was eliminated.`
                  : "The vote was tied, so nobody was removed."}
              </h2>

              <p>
                {result.winner === "villagers"
                  ? "The group uncovered the mafia and kept the town safe."
                  : result.winner === "mafia"
                    ? "The hidden mafia stayed alive long enough to win the round."
                    : "Nobody was eliminated, so the town must keep watching each other."}
              </p>

              <div className="player-chips">
                {round.mafiaPlayers.map((player) => (
                  <span key={player}>{player}</span>
                ))}
              </div>

              <p className="result-votes">
                Votes cast: {Object.keys(votes).length}
              </p>

              <button type="button" className="primary-button full-button" onClick={restartRound}>
                <TimerReset size={18} />
                Play again
              </button>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
