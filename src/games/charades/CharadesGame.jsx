import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Clock3, Pause, Play, RotateCcw, SkipForward, Trophy, Smartphone, Zap } from "lucide-react";
import { buildCharadesGame, createMatchState, getMatchStats, getTiltAction, getTurnDetails, matchReducer } from "./logic.js";

const MOTION_THRESHOLD = 22;
const COOLDOWN_MS = 1000;

export default function CharadesGame() {
  const location = useLocation();
  const navigate = useNavigate();
  const config = location.state || {};
  const [state, dispatch] = useReducer(matchReducer, null, () => {
    try { return createMatchState(buildCharadesGame(config)); } catch { return null; }
  });
  const [revealedTurn, setRevealedTurn] = useState(-1);
  const [tiltEnabled, setTiltEnabled] = useState(false);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [doublePointsArmed, setDoublePointsArmed] = useState(false);
  const [sensorStatus, setSensorStatus] = useState("Manual Controls Active");
  const [neutralBeta, setNeutralBeta] = useState(null);
  const neutralRef = useRef(null);
  const armedRef = useRef(true);
  const lastActionRef = useRef(0);
  const sensorTimerRef = useRef(null);

  const turn = state ? getTurnDetails(state.game, state.turnIndex) : null;
  const revealed = state ? revealedTurn === state.turnIndex : false;
  const stats = useMemo(() => state && getMatchStats(state), [state]);

  useEffect(() => () => window.clearTimeout(sensorTimerRef.current), []);


  useEffect(() => {
    if (state?.phase !== "acting" || state.paused || state.transition) return undefined;
    const id = window.setInterval(() => dispatch({ type: "TICK" }), 1000);
    return () => window.clearInterval(id);
  }, [state?.phase, state?.paused, state?.transition]);

  useEffect(() => {
    if (!state?.transition) return undefined;
    const id = window.setTimeout(() => dispatch({ type: "NEXT_PROMPT" }), 260);
    return () => window.clearTimeout(id);
  }, [state?.transition]);

  useEffect(() => {
    if (!tiltEnabled || state?.phase !== "acting" || state.paused || state.transition) return undefined;
    const handleOrientation = (event) => {
      if (typeof event.beta !== "number") return;
      if (neutralRef.current === null) {
        neutralRef.current = event.beta;
        setNeutralBeta(event.beta);
        setSensorStatus("Calibrated · tilt up for correct, down to skip");
        window.clearTimeout(sensorTimerRef.current);
        return;
      }
      const delta = event.beta - neutralRef.current;
      const tiltAction = getTiltAction(delta, armedRef.current, Date.now(), lastActionRef.current, MOTION_THRESHOLD, COOLDOWN_MS);
      if (tiltAction === "rearm") { armedRef.current = true; return; }
      if (tiltAction) {
        armedRef.current = false;
        lastActionRef.current = Date.now();
        const correct = tiltAction === "correct";
        if (vibrationEnabled && navigator.vibrate) navigator.vibrate(correct ? [25, 30, 25] : 20);
        dispatch({ type: "ANSWER", correct });
      }
    };
    window.addEventListener("deviceorientation", handleOrientation, true);
    return () => window.removeEventListener("deviceorientation", handleOrientation, true);
  }, [tiltEnabled, state?.phase, state?.paused, state?.transition, vibrationEnabled]);

  function act(correct, powerUp = {}) {
    if (!state || state.phase !== "acting" || state.paused || state.transition || !state.currentPrompt) return;
    if (vibrationEnabled && typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(correct ? [25, 30, 25] : 20);
    dispatch({ type: "ANSWER", correct, ...powerUp, doublePoints: correct && (powerUp.doublePoints || doublePointsArmed) });
    setDoublePointsArmed(false);
  }

  async function enableTilt() {
    if (typeof window === "undefined" || !("DeviceOrientationEvent" in window)) {
      setSensorStatus("Sensors unavailable · Manual Controls Active"); return;
    }
    try {
      const api = window.DeviceOrientationEvent;
      if (typeof api.requestPermission === "function") {
        setSensorStatus("Permission Required · allow motion access");
        if (await api.requestPermission() !== "granted") { setSensorStatus("Permission denied · Manual Controls Active"); return; }
      }
      neutralRef.current = null; setNeutralBeta(null); armedRef.current = true; setTiltEnabled(true);
      setSensorStatus("Calibrate · hold the phone in a comfortable neutral position");
      window.clearTimeout(sensorTimerRef.current);
      sensorTimerRef.current = window.setTimeout(() => {
        if (neutralRef.current === null) {
          setTiltEnabled(false);
          setSensorStatus("No sensor readings · Manual Controls Active");
        }
      }, 5000);
    } catch { setSensorStatus("Sensor permission unavailable · Manual Controls Active"); }
  }

  function restart() {
    try { dispatch({ type: "RESTART", game: buildCharadesGame(config) }); setRevealedTurn(-1); neutralRef.current = null; }
    catch (error) { window.alert(error.message); }
  }

  if (!state) return <main className="charades-page"><section className="charades-panel"><h1>Unable to start Charades</h1><p>Return to setup and add 3–16 unique players. {config.players?.length ? "" : "No player list was provided."}</p><button className="primary-button" onClick={() => navigate("/game/charades")}>Back to setup</button></section></main>;

  const progress = Math.max(0, state.game.totalTurns - state.turnIndex);
  const winners = stats.winnerIds.map((id) => state.teams.find((team) => team.id === id));
  const shareSummary = `PartyVerse Telugu Charades · ${winners.length === 1 ? winners[0]?.name + " wins" : winners.map((w) => w.name).join(" & ") + " tie"} · ${state.teams.map((team) => `${team.name} ${team.score}`).join(" | ")} · ${stats.correct} correct, ${stats.skips} skips`;

  return <main className="charades-page">
    <header className="charades-topbar"><Link to="/" className="back-link"><ArrowLeft size={17}/> PartyVerse</Link><span className="charades-badge">Telugu Movie Charades</span></header>
    <section className="charades-panel">
      {state.phase !== "results" ? <>
        <div className="charades-roundline"><span className="section-kicker">ROUND {turn.roundNumber} OF {state.game.roundCount}</span><span>{state.game.totalTurns - progress + 1} / {state.game.totalTurns} turns</span></div>
        <h1>{turn.team.name} <span>·</span> {turn.actingPlayer}</h1>
        <p className="charades-subtitle">{turn.team.players.length > 1 ? `${turn.team.players.join(", ")} · ` : ""}Act without speaking. The title is shown only on this device.</p>
        <div className="charades-main-stats">
          <div className={`charades-clock ${state.timeLeft <= 10 ? "is-urgent" : ""}`} role="timer" aria-label={`${state.timeLeft} seconds remaining`}><Clock3 size={18}/><strong>{state.timeLeft}</strong><small>seconds</small></div>
          <div className="charades-score-chip"><Trophy size={18}/><span><strong>{turn.team.score}</strong> {state.game.teamMode === "teams" ? "team" : "player"} points</span></div>
          <div className="charades-streak">🔥 <strong>{turn.team.streak}</strong> streak</div>
        </div>

        <div className={`charades-card ${state.result ? `answer-${state.result.type}` : ""}`}>
          {state.phase === "preparation" ? <>
            <div className="privacy-banner">Pass the phone to <strong>{turn.actingPlayer}</strong>. Keep the title hidden from the guessers.</div>
            {state.currentPrompt ? revealed ? <>
              <span className="charades-secret-label">YOUR TELUGU MOVIE · {state.currentPrompt?.year}</span>
              <div className="charades-secret-prompt">{state.currentPrompt?.prompt}</div>
              <button className="primary-button full-button" onClick={() => dispatch({ type: "START" })}>Start acting · {state.game.turnDuration}s</button>
            </> : <button className="primary-button full-button" onClick={() => setRevealedTurn(state.turnIndex)}>Reveal my movie</button> : <><p className="charades-subtitle">This filtered deck is exhausted.</p><button className="secondary-button full-button" onClick={() => dispatch({ type: "REPLAY_DECK" })}>Reshuffle and replay deck</button></>}
          </> : <>
            <span className="charades-secret-label">{state.result?.type === "correct" ? `Correct · +${state.result.points} point${state.result.points === 1 ? "" : "s"}` : state.result?.type === "skip" ? "Skipped · no points" : state.currentPrompt ? "Acting now · Telugu movie" : "Deck complete"}</span>
            <div className="charades-secret-prompt">{state.currentPrompt?.prompt || "You’ve played every movie in this deck."}</div>
            {state.currentPrompt && <p className="charades-subtitle">{state.currentPrompt.year} · {state.currentPrompt.difficulty}</p>}
            {state.currentPrompt ? <div className="charades-controls">
              <button className="secondary-button" onClick={() => dispatch({ type: state.paused ? "RESUME" : "PAUSE" })}>{state.paused ? <Play size={16}/> : <Pause size={16}/>} {state.paused ? "Resume" : "Pause"}</button>
              <button className="secondary-button" onClick={() => { if (tiltEnabled) { setTiltEnabled(false); window.clearTimeout(sensorTimerRef.current); neutralRef.current = null; setSensorStatus("Manual Controls Active"); } else enableTilt(); }}><Smartphone size={16}/> {tiltEnabled ? "Disable tilt" : "Enable tilt"}</button>
              <label className="charades-toggle"><input type="checkbox" checked={vibrationEnabled} onChange={(e) => setVibrationEnabled(e.target.checked)}/> Vibration</label>
            </div> : <button className="secondary-button full-button" onClick={() => dispatch({ type: "REPLAY_DECK" })}>Replay this deck</button>}
            <p className="charades-subtitle" role="status">{sensorStatus}{neutralBeta !== null ? ` · neutral ${Math.round(neutralBeta)}°` : ""}</p>
            {state.paused && <p className="charades-subtitle">Timer paused. Resume when ready.</p>}
            {state.currentPrompt && <div className="charades-powerups" aria-label="Team power-ups">
              <span>Team power-ups · one each per match</span>
              <button className="secondary-button" disabled={state.paused || state.transition || !turn.team.inventory.doublePoints} title="Double the points for one correct answer" onClick={() => setDoublePointsArmed((armed) => !armed)}><Zap size={15}/> {doublePointsArmed ? "Double points armed" : "Double points"} ({turn.team.inventory.doublePoints})</button>
              <button className="secondary-button" disabled={state.paused || state.transition || !turn.team.inventory.extraTime} title="Add 15 seconds to this turn" onClick={() => dispatch({ type: "EXTRA_TIME" })}>+15 sec ({turn.team.inventory.extraTime})</button>
              <button className="secondary-button" disabled={state.paused || state.transition || !turn.team.inventory.freeSkip} title="Use one free skip and continue this player's turn" onClick={() => act(false, { freeSkip: true })}>Free skip ({turn.team.inventory.freeSkip})</button>
            </div>}            {state.currentPrompt && <div className="charades-actions">
              <button className="primary-button" disabled={state.paused || state.transition} onClick={() => act(true)}><CheckCircle2 size={16}/> Correct (+1)</button>
              <button className="secondary-button" disabled={state.paused || state.transition} onClick={() => act(false)}><SkipForward size={16}/> Skip</button>
              <button className="secondary-button" disabled={state.paused || state.transition} onClick={() => dispatch({ type: "END_TURN", reason: "ended" })}>End turn</button>
            </div>}
          </>}
        </div>
        <section className="charades-scoreboard"><div className="leaderboard-header"><Trophy size={18}/> Live scoreboard</div>{state.teams.map((team) => <div className={`leaderboard-row ${team.id === turn.team.id ? "is-current" : ""}`} key={team.id}><span className="leaderboard-rank">{team.name}{team.id === turn.team.id ? " · up now" : ""}</span><span>{team.score} pts</span><strong>{team.correctAnswers} correct · best streak {team.longestStreak}</strong></div>)}</section>
      </> : <div className="charades-results">
        <span className="section-kicker">MATCH COMPLETE</span><h1>{winners.length === 1 ? `${winners[0].name} wins!` : winners.length ? "It’s a tie!" : "Game complete"}</h1>
        <p className="charades-subtitle">Final scores and verified match activity from this device.</p>
        <div className="charades-scoreboard">{state.teams.slice().sort((a,b) => b.score-a.score).map((team) => <div className="leaderboard-row" key={team.id}><span className="leaderboard-rank">{team.name}</span><span>{team.score} pts</span><strong>{team.correctAnswers} correct · {team.skippedPrompts} skips · {team.longestStreak} best streak</strong></div>)}</div>
        {state.achievements.length > 0 && <div className="charades-achievements"><h2>Achievements</h2>{state.achievements.map((achievement, index) => <span key={`${achievement.teamId}-${achievement.value}-${index}`}>{state.teams.find((team) => team.id === achievement.teamId)?.name} · {achievement.value}-answer streak</span>)}</div>}
        <div className="charades-summary-stats"><span>{stats.correct} correct</span><span>{stats.skips} skips</span><span>{stats.accuracy}% accuracy</span><span>{stats.longestStreak} longest streak</span>{stats.fastestCorrect !== null && <span>{stats.fastestCorrect}s fastest correct</span>}</div>
        <div className="charades-actions"><button className="primary-button" onClick={restart}><RotateCcw size={16}/> Play again</button><button className="secondary-button" onClick={() => navigate("/")}>Return to PartyVerse</button><button className="secondary-button" onClick={async () => { try { await navigator.clipboard.writeText(shareSummary); } catch { window.prompt("Copy results", shareSummary); } }}>Copy results</button></div>
      </div>}
    </section>
  </main>;
}
