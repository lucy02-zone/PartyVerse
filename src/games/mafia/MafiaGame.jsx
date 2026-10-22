
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff, Shield, Users } from "lucide-react";
import Navbar from "../../components/Navbar.jsx";
import { assignMafiaRoles } from "./logic.js";

export default function MafiaGame() {
  const location = useLocation();
  const navigate = useNavigate();
  const players = location.state?.players;

  const [assignedPlayers, setAssignedPlayers] = useState(() => {
    if (!Array.isArray(players) || players.length < 5 || players.length > 15) {
      return [];
    }

    try {
      return assignMafiaRoles(players);
    } catch {
      return [];
    }
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [allRolesRevealed, setAllRolesRevealed] = useState(false);

  if (assignedPlayers.length === 0) {
    return (
      <>
        <Navbar />
        <main className="mafia-page">
          <section className="mafia-panel">
            <h1>Unable to start Mafia</h1>
            <p>Please return to setup and add between 5 and 15 unique players.</p>
            <button onClick={() => navigate("/game/mafia")}>
              Return to setup
            </button>
          </section>
        </main>
      </>
    );
  }

  const currentPlayer = assignedPlayers[currentIndex];

  function revealRole() {
    setRevealed(true);
  }

  function hideRoleAndContinue() {
    setRevealed(false);

    if (currentIndex === assignedPlayers.length - 1) {
      setAllRolesRevealed(true);
      return;
    }

    setCurrentIndex((index) => index + 1);
  }

  function restartRoles() {
    setAssignedPlayers(assignMafiaRoles(players));
    setCurrentIndex(0);
    setRevealed(false);
    setAllRolesRevealed(false);
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
            <Shield size={30} />
          </div>

          <span className="section-kicker">PARTYVERSE • MAFIA</span>
          <h1>Who are you?</h1>
          <p className="mafia-description">
            Pass the device to each player. Keep your role secret!
          </p>

          {!allRolesRevealed ? (
            <>
              <div className="mafia-progress">
                <Users size={18} />
                Player {currentIndex + 1} of {assignedPlayers.length}
              </div>

              <div className="role-card">
                {!revealed ? (
                  <>
                    <span className="role-card-label">NEXT PLAYER</span>
                    <h2>{currentPlayer.name}</h2>
                    <p>Make sure nobody else is looking at the screen.</p>

                    <button
                      className="mafia-primary-button"
                      onClick={revealRole}
                    >
                      <Eye size={18} />
                      Reveal my role
                    </button>
                  </>
                ) : (
                  <>
                    <span className="role-card-label">
                      {currentPlayer.name.toUpperCase()}, YOUR ROLE IS
                    </span>

                    <div
                      className={`role-badge ${currentPlayer.role.toLowerCase()}`}
                    >
                      {currentPlayer.role}
                    </div>

                    <p>
                      {currentPlayer.role === "Mafia" &&
                        "Work with the other Mafia members secretly during the night."}
                      {currentPlayer.role === "Doctor" &&
                        "Choose one player to protect during the night."}
                      {currentPlayer.role === "Detective" &&
                        "Investigate a player to learn whether they are Mafia."}
                      {currentPlayer.role === "Villager" &&
                        "Discuss clues with everyone and vote to find the Mafia."}
                    </p>

                    <button
                      className="mafia-primary-button"
                      onClick={hideRoleAndContinue}
                    >
                      <EyeOff size={18} />
                      Hide role and continue
                    </button>
                  </>
                )}
              </div>

              <p className="mafia-note">
                Keep your role secret. Don't let other players see the screen.
              </p>
            </>
          ) : (
            <div className="role-card">
              <div className="mafia-complete-icon">✓</div>
              <h2>Everyone knows their role!</h2>
              <p>
                All players have checked their roles. The next step is to
                begin the night phase.
              </p>

              <button
                className="mafia-primary-button"
                onClick={() =>
                  navigate("/play/mafia/night", {
                    state: { assignedPlayers, roundNumber: 1 },
                  })
                }
              >
                Begin night phase →
              </button>

              <button
                className="mafia-secondary-button"
                onClick={restartRoles}
              >
                Shuffle roles again
              </button>
            </div>
          )}
        </section>
      </main>
    </>
  );
}
