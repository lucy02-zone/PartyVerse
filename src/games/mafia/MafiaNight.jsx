
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Eye,
  HeartPulse,
  Moon,
  Shield,
} from "lucide-react";
import Navbar from "../../components/Navbar.jsx";
import { getPlayerColor } from "../../utils/playerSetup.js";

function getWinner(players) {
  const alivePlayers = players.filter((player) => player.alive);

  const mafiaCount = alivePlayers.filter(
    (player) => player.role === "Mafia"
  ).length;

  const townCount = alivePlayers.length - mafiaCount;

  if (mafiaCount === 0) return "Town";
  if (mafiaCount >= townCount) return "Mafia";

  return null;
}

export default function MafiaNight() {
  const location = useLocation();
  const navigate = useNavigate();

  const initialPlayers = location.state?.assignedPlayers;
  const roundNumber = location.state?.roundNumber ?? 1;

  const [players, setPlayers] = useState(() =>
    Array.isArray(initialPlayers)
      ? initialPlayers.map((player) => ({ ...player }))
      : []
  );

  const [mafiaTarget, setMafiaTarget] = useState("");
  const [doctorTarget, setDoctorTarget] = useState("");
  const [detectiveTarget, setDetectiveTarget] = useState("");
  const [message, setMessage] = useState("");
  const [investigation, setInvestigation] = useState(null);
  const [nightComplete, setNightComplete] = useState(false);

  if (players.length < 5) {
    return (
      <>
        <Navbar />
        <main className="mafia-page">
          <section className="mafia-panel">
            <h1>Night phase unavailable</h1>
            <p>
              Start Mafia from the player setup page first.
            </p>
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

  const mafiaPlayers = alivePlayers.filter(
    (player) => player.role === "Mafia"
  );

  const doctor = alivePlayers.find(
    (player) => player.role === "Doctor"
  );

  const detective = alivePlayers.find(
    (player) => player.role === "Detective"
  );

  const nightWinner = nightComplete ? getWinner(players) : null;

  function resolveNight() {
    setMessage("");
    setInvestigation(null);

    if (mafiaPlayers.length === 0) {
      setMessage("No Mafia members remain alive.");
      return;
    }

    if (!mafiaTarget) {
      setMessage("The Mafia must select a target.");
      return;
    }

    if (doctor && !doctorTarget) {
      setMessage("The Doctor must choose someone to protect.");
      return;
    }

    if (detective && !detectiveTarget) {
      setMessage("The Detective must investigate someone.");
      return;
    }

    const attackedPlayer = players.find(
      (player) => player.id === mafiaTarget
    );

    if (!attackedPlayer || !attackedPlayer.alive) {
      setMessage("Choose a player who is still alive.");
      return;
    }

    if (attackedPlayer.role === "Mafia") {
      setMessage("The Mafia cannot target one of its own members.");
      return;
    }

    if (doctor) {
      const protectedPlayer = players.find(
        (player) => player.id === doctorTarget
      );

      if (!protectedPlayer || !protectedPlayer.alive) {
        setMessage("The Doctor must protect a living player.");
        return;
      }
    }

    if (detective) {
      const investigatedPlayer = players.find(
        (player) => player.id === detectiveTarget
      );

      if (
        !investigatedPlayer ||
        !investigatedPlayer.alive ||
        investigatedPlayer.id === detective.id
      ) {
        setMessage(
          "The Detective must investigate another living player."
        );
        return;
      }

      setInvestigation({
        playerName: investigatedPlayer.name,
        isMafia: investigatedPlayer.role === "Mafia",
      });
    }

    const wasSaved =
      Boolean(doctor) && mafiaTarget === doctorTarget;

    const updatedPlayers = players.map((player) => {
      if (player.id === mafiaTarget && !wasSaved) {
        return { ...player, alive: false };
      }

      return player;
    });

    setPlayers(updatedPlayers);

    if (wasSaved) {
      setMessage("The Doctor saved the Mafia's target!");
    } else {
      setMessage(
        `${attackedPlayer.name} was eliminated during the night.`
      );
    }

    setNightComplete(true);
  }

  function continueToDay() {
    navigate("/play/mafia/day", {
      state: { assignedPlayers: players, roundNumber },
    });
  }

  function restartGame() {
    navigate("/game/mafia");
  }

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
            <Moon size={30} />
          </div>

          <span className="section-kicker">
            PARTYVERSE • MAFIA · ROUND {roundNumber}
          </span>

          <h1>Night falls...</h1>

          <p className="mafia-description">
            The town is asleep. Complete the secret actions for this
            round.
          </p>

          {!nightComplete ? (
            <div className="night-actions">
              <div className="night-action-card">
                <h2>
                  <Shield size={20} />
                  Mafia attack
                </h2>

                <p>
                  Select one living non-Mafia player to target.
                </p>

                <select
                  value={mafiaTarget}
                  style={{ "--player-color": getPlayerColor(Math.max(0, players.findIndex((player) => player.id === mafiaTarget))).background, "--player-foreground": getPlayerColor(Math.max(0, players.findIndex((player) => player.id === mafiaTarget))).foreground }}
                  onChange={(event) =>
                    setMafiaTarget(event.target.value)
                  }
                  aria-label="Mafia target"
                >
                  <option value="">Select a target</option>

                  {alivePlayers
                    .filter((player) => player.role !== "Mafia")
                    .map((player) => (
                      <option key={player.id} value={player.id}>
                        {player.name}
                      </option>
                    ))}
                </select>
              </div>

              {doctor && (
                <div className="night-action-card">
                  <h2>
                    <HeartPulse size={20} />
                    Doctor protection
                  </h2>

                  <p>
                    Choose one living player to protect tonight.
                  </p>

                  <select
                    value={doctorTarget}
                    style={{ "--player-color": getPlayerColor(Math.max(0, players.findIndex((player) => player.id === doctorTarget))).background, "--player-foreground": getPlayerColor(Math.max(0, players.findIndex((player) => player.id === doctorTarget))).foreground }}
                    onChange={(event) =>
                      setDoctorTarget(event.target.value)
                    }
                    aria-label="Doctor protection target"
                  >
                    <option value="">
                      Select someone to protect
                    </option>

                    {alivePlayers.map((player) => (
                      <option key={player.id} value={player.id}>
                        {player.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {detective && (
                <div className="night-action-card">
                  <h2>
                    <Eye size={20} />
                    Detective investigation
                  </h2>

                  <p>
                    Investigate one other living player.
                  </p>

                  <select
                    value={detectiveTarget}
                    style={{ "--player-color": getPlayerColor(Math.max(0, players.findIndex((player) => player.id === detectiveTarget))).background, "--player-foreground": getPlayerColor(Math.max(0, players.findIndex((player) => player.id === detectiveTarget))).foreground }}
                    onChange={(event) =>
                      setDetectiveTarget(event.target.value)
                    }
                    aria-label="Detective investigation target"
                  >
                    <option value="">
                      Select someone to investigate
                    </option>

                    {alivePlayers
                      .filter(
                        (player) => player.id !== detective.id
                      )
                      .map((player) => (
                        <option key={player.id} value={player.id}>
                          {player.name}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {message && (
                <p
                  className="setup-message error"
                  role="alert"
                >
                  {message}
                </p>
              )}

              <button
                className="mafia-primary-button"
                onClick={resolveNight}
              >
                Resolve night actions
              </button>
            </div>
          ) : (
            <div className="role-card">
              <h2>Night results</h2>

              <p>Round {roundNumber}: {message}</p>

              {investigation && (
                <p>
                  Detective investigation for{" "}
                  <strong>{investigation.playerName}</strong>:{" "}
                  <strong>
                    {investigation.isMafia
                      ? "Mafia"
                      : "Not Mafia"}
                  </strong>
                </p>
              )}

              <p>
                Living players:{" "}
                {players.filter((player) => player.alive).length}
              </p>

              {nightWinner ? (
                <>
                  <h2>{nightWinner} wins!</h2>
                  <p>The Mafia game has ended.</p>

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
                  onClick={continueToDay}
                >
                  Continue to day phase →
                </button>
              )}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
