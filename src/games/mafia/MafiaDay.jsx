
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Sun, Users, Vote } from "lucide-react";
import Navbar from "../../components/Navbar.jsx";

function getWinner(players) {
  const alive = players.filter((player) => player.alive);
  const mafiaCount = alive.filter(
    (player) => player.role === "Mafia"
  ).length;
  const otherCount = alive.length - mafiaCount;

  if (mafiaCount === 0) return "Town";
  if (mafiaCount >= otherCount) return "Mafia";

  return null;
}

export default function MafiaDay() {
  const location = useLocation();
  const navigate = useNavigate();

  const roundNumber = location.state?.roundNumber ?? 1;

  const [players, setPlayers] = useState(() => {
    const incoming = location.state?.assignedPlayers;
    return Array.isArray(incoming)
      ? incoming.map((player) => ({ ...player }))
      : [];
  });

  const [votes, setVotes] = useState({});
  const [message, setMessage] = useState("");
  const [result, setResult] = useState(null);
  const [showRoles, setShowRoles] = useState(false);

  if (players.length < 5) {
    return (
      <>
        <Navbar />
        <main className="mafia-page">
          <section className="mafia-panel">
            <h1>Day phase unavailable</h1>
            <p>Start a Mafia game and complete the night phase first.</p>
            <button
              className="mafia-primary-button"
              onClick={() => navigate("/game/mafia")}
            >
              Return to setup
            </button>
          </section>
        </main>
      </>
    );
  }

  const alivePlayers = players.filter((player) => player.alive);
  const winner = getWinner(players);

  function castVote(voterId, targetId) {
    if (voterId === targetId) {
      setMessage("Players cannot vote for themselves.");
      return;
    }

    setVotes((current) => ({ ...current, [voterId]: targetId }));
    setMessage("");
  }

  function resolveVoting() {
    if (alivePlayers.length < 2) {
      setMessage("Not enough living players remain to vote.");
      return;
    }

    const missingVote = alivePlayers.some((player) => !votes[player.id]);

    if (missingVote) {
      setMessage("Every living player must vote before voting is resolved.");
      return;
    }

    const counts = {};

    Object.entries(votes).forEach(([voterId, targetId]) => {
      const voterAlive = alivePlayers.some(
        (player) => player.id === voterId
      );
      const targetAlive = alivePlayers.some(
        (player) => player.id === targetId
      );

      if (voterAlive && targetAlive) {
        counts[targetId] = (counts[targetId] || 0) + 1;
      }
    });

    const maxVotes = Math.max(0, ...Object.values(counts));
    const topTargets = Object.keys(counts).filter(
      (playerId) => counts[playerId] === maxVotes
    );

    if (topTargets.length === 0 || topTargets.length > 1) {
      setResult({
        eliminated: null,
        counts,
        text:
          topTargets.length > 1
            ? "The vote is tied! Nobody is eliminated this round."
            : "No valid votes were cast. Nobody is eliminated.",
      });
      return;
    }

    const eliminatedId = topTargets[0];

    const updatedPlayers = players.map((player) =>
      player.id === eliminatedId
        ? { ...player, alive: false }
        : player
    );

    const eliminated = updatedPlayers.find(
      (player) => player.id === eliminatedId
    );

    setPlayers(updatedPlayers);
    setResult({
      eliminated,
      counts,
      text: `${eliminated.name} was eliminated by the vote.`,
    });
  }

  function playNextNight() {
    navigate("/play/mafia/night", {
      state: { assignedPlayers: players, roundNumber: roundNumber + 1 },
    });
  }

  function restartGame() {
    navigate("/game/mafia");
  }

  const finalWinner = getWinner(players);

  return (
    <>
      <Navbar />

      <main className="mafia-page">
        <Link to="/" className="back-link">
          <ArrowLeft size={17} />
          Back to games
        </Link>

        <section className="mafia-panel">
          <div className="mafia-icon">
            <Sun size={30} />
          </div>

          <span className="section-kicker">PARTYVERSE • MAFIA · ROUND {roundNumber}</span>
          <h1>The town awakens</h1>
          <p className="mafia-description">
            Discuss what happened last night, share suspicions, and vote
            to eliminate a suspected Mafia member.
          </p>

          {!result && !winner && (
            <>
              <div className="mafia-progress">
                <Users size={18} />
                {alivePlayers.length} players alive
              </div>

              <div className="day-player-list">
                {alivePlayers.map((player) => (
                  <div className="day-player-row" key={player.id}>
                    <div className="day-player-info">
                      <span className="player-avatar">
                        {player.name.charAt(0).toUpperCase()}
                      </span>
                      <span>{player.name}</span>
                    </div>

                    <label className="day-vote-select">
                      <span className="sr-only">
                        Vote cast by {player.name}
                      </span>
                      <select
                        aria-label={`${player.name}'s vote`}
                        value={votes[player.id] || ""}
                        onChange={(event) =>
                          castVote(player.id, event.target.value)
                        }
                      >
                        <option value="">Choose vote</option>
                        {alivePlayers
                          .filter((target) => target.id !== player.id)
                          .map((target) => (
                            <option key={target.id} value={target.id}>
                              {target.name}
                            </option>
                          ))}
                      </select>
                    </label>
                  </div>
                ))}
              </div>

              <p className="vote-count">
                <Vote size={17} />
                {Object.keys(votes).filter((id) =>
                  alivePlayers.some((player) => player.id === id)
                ).length}{" "}
                of {alivePlayers.length} votes submitted
              </p>

              {message && (
                <p className="setup-message error" role="status">
                  {message}
                </p>
              )}

              <button
                className="mafia-primary-button"
                onClick={resolveVoting}
              >
                Resolve votes
              </button>
            </>
          )}

          {result && (
            <div className="role-card">
              <h2>Voting results</h2>
              <p>Round {roundNumber}: {result.text}</p>

              <div className="vote-results">
                {alivePlayers.map((player) => (
                  <p key={player.id}>
                    {player.name}: {result.counts[player.id] || 0} vote(s)
                  </p>
                ))}
              </div>

              {result.eliminated && (
                <p>
                  Revealed role: <strong>{result.eliminated.role}</strong>
                </p>
              )}

              {finalWinner ? (
                <>
                  <h2>{finalWinner} wins!</h2>
                  <button
                    className="mafia-primary-button"
                    onClick={() => setShowRoles((current) => !current)}
                  >
                    {showRoles ? "Hide all roles" : "Reveal all roles"}
                  </button>

                  {showRoles && (
                    <div className="vote-results">
                      {players.map((player) => (
                        <p key={player.id}>
                          {player.name}: {player.role}
                          {!player.alive ? " (eliminated)" : ""}
                        </p>
                      ))}
                    </div>
                  )}

                  <button
                    className="mafia-primary-button"
                    onClick={restartGame}
                  >
                    Play again
                  </button>
                </>
              ) : (
                <button
                  className="mafia-primary-button"
                  onClick={() => {
                    setResult(null);
                    setVotes({});
                    setMessage("");
                    playNextNight();
                  }}
                >
                  Continue to next night →
                </button>
              )}
            </div>
          )}

          {!result && winner && (
            <div className="role-card">
              <h2>{winner} wins!</h2>
              <p>The game has ended.</p>
              <button
                className="mafia-primary-button"
                onClick={restartGame}
              >
                Play again
              </button>
            </div>
          )}
        </section>
      </main>
    </>
  );
}
