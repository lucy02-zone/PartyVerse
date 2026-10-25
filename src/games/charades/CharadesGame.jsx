import { Component, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Clock3, Pause, Play, RotateCcw, SkipForward, Trophy, Smartphone, Zap, X } from "lucide-react";
import { buildCharadesGame, createMatchState, getLeaderboard, getMatchStats, getTiltAction, getTurnDetails, matchReducer } from "./logic.js";
import { getPlayerColor } from "../../utils/playerSetup.js";
import ShareResultsButton from "../../components/ShareResultsButton.jsx";
import { charadesResultSummary } from "../../lib/resultSummary.js";

const MOTION_THRESHOLD = 22;
const COOLDOWN_MS = 1000;

function CharadesGameScreen() {
  const location = useLocation();
  const navigate = useNavigate();
  const config = location.state || {};
  const [state, dispatch] = useReducer(matchReducer, null, () => {
    try { return createMatchState(buildCharadesGame(config)); } catch { return null; }
  });
  const [tiltEnabled, setTiltEnabled] = useState(false);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [doublePointsArmedFor, setDoublePointsArmedFor] = useState(null);
  const [sensorStatus, setSensorStatus] = useState("Manual controls active");
  const [neutralBeta, setNeutralBeta] = useState(null);
  const [pauseOpen, setPauseOpen] = useState(false);
  const [leaveConfirm, setLeaveConfirm] = useState(false);
  const neutralRef = useRef(null);
  const armedRef = useRef(true);
  const lastActionRef = useRef(0);
  const sensorTimerRef = useRef(null);
  const dialogRef = useRef(null);
  const dialogCloseRef = useRef(null);
  const pauseTriggerRef = useRef(null);

  const turn = state ? getTurnDetails(state.game, state.turnIndex, state.teams) : null;
  const actingPlayerIndex = state && turn ? state.game.players.indexOf(turn.actingPlayer) : 0;
  const turnColor = getPlayerColor(actingPlayerIndex);
  const doublePointsArmed = Boolean(state && turn && doublePointsArmedFor === `${state.turnIndex}:${turn.team.id}`);
  const stats = useMemo(() => state && getMatchStats(state), [state]);

  useEffect(() => () => window.clearTimeout(sensorTimerRef.current), []);

  useEffect(() => {
    if (state?.phase !== "acting" || state.paused || state.transition) return undefined;
    const id = window.setInterval(() => dispatch({ type: "TICK" }), 1000);
    return () => window.clearInterval(id);
  }, [state?.phase, state?.paused, state?.transition]);

  useEffect(() => {
    // Keep the acting timer fixed while hidden; the player must explicitly resume.
    const pauseWhenHidden = () => {
      if (document.hidden && state?.phase === "acting" && !state.paused) {
        dispatch({ type: "PAUSE" });
        setPauseOpen(true);
      }
    };
    document.addEventListener("visibilitychange", pauseWhenHidden);
    return () => document.removeEventListener("visibilitychange", pauseWhenHidden);
  }, [state?.phase, state?.paused]);

  useEffect(() => {
    if (!state?.transition) return undefined;
    const id = window.setTimeout(() => dispatch({ type: "NEXT_PROMPT" }), 260);
    return () => window.clearTimeout(id);
  }, [state?.transition]);

  useEffect(() => {
    if (!pauseOpen) return undefined;
    dialogCloseRef.current?.focus();
    const previousFocus = pauseTriggerRef.current;
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (leaveConfirm) setLeaveConfirm(false);
        else closePause();
      }
      if (event.key === "Tab") {
        const focusable = dialogRef.current?.querySelectorAll('button:not([disabled]), a[href], input:not([disabled])');
        if (!focusable?.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      previousFocus?.focus();
    };
  }, [pauseOpen, leaveConfirm]);

  useEffect(() => {
    if (!pauseOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [pauseOpen]);

  useEffect(() => {
    if (!tiltEnabled || state?.phase !== "acting" || state.paused || state.transition) return undefined;
    const handleOrientation = (event) => {
      if (typeof event.beta !== "number") return;
      if (neutralRef.current === null) {
        neutralRef.current = event.beta;
        setNeutralBeta(event.beta);
        setSensorStatus("Ready · tilt up for correct, down to skip");
        window.clearTimeout(sensorTimerRef.current);
        return;
      }
      const tiltAction = getTiltAction(event.beta - neutralRef.current, armedRef.current, Date.now(), lastActionRef.current, MOTION_THRESHOLD, COOLDOWN_MS);
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

  function closePause() {
    setPauseOpen(false);
    setLeaveConfirm(false);
    dispatch({ type: "RESUME" });
  }

  function openPause(event) {
    pauseTriggerRef.current = event.currentTarget;
    dispatch({ type: "PAUSE" });
    setLeaveConfirm(false);
    setPauseOpen(true);
  }

  function act(correct, powerUp = {}) {
    if (!state || state.phase !== "acting" || state.paused || state.transition || !state.currentPrompt) return;
    if (vibrationEnabled && typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(correct ? [25, 30, 25] : 20);
    dispatch({ type: "ANSWER", correct, ...powerUp, doublePoints: correct && (powerUp.doublePoints || doublePointsArmed) });
    setDoublePointsArmedFor(null);
  }

  async function enableTilt() {
    if (typeof window === "undefined" || !("DeviceOrientationEvent" in window)) {
      setSensorStatus("Sensors unavailable · manual controls active"); return;
    }
    try {
      const api = window.DeviceOrientationEvent;
      if (typeof api.requestPermission === "function") {
        setSensorStatus("Allow motion access to enable tilt");
        if (await api.requestPermission() !== "granted") { setSensorStatus("Permission denied · manual controls active"); return; }
      }
      neutralRef.current = null; setNeutralBeta(null); armedRef.current = true; setTiltEnabled(true);
      setSensorStatus("Hold the phone comfortably still to calibrate");
      window.clearTimeout(sensorTimerRef.current);
      sensorTimerRef.current = window.setTimeout(() => {
        if (neutralRef.current === null) {
          setTiltEnabled(false);
          setSensorStatus("No sensor readings · manual controls active");
        }
      }, 5000);
    } catch { setSensorStatus("Sensor permission unavailable · manual controls active"); }
  }

  function restart() {
    try {
      dispatch({ type: "RESTART", game: buildCharadesGame(config) });
      neutralRef.current = null;
      setNeutralBeta(null);
      setTiltEnabled(false);
      setPauseOpen(false);
      setLeaveConfirm(false);
      setDoublePointsArmedFor(null);
      window.clearTimeout(sensorTimerRef.current);
    }
    catch { navigate("/game/charades"); }
  }

  if (!state || !turn) return <main className="charades-page"><section className="charades-panel charades-error"><span className="charades-eyebrow">TELUGU MOVIE CHARADES</span><h1>Unable to start Charades</h1><p>Return to setup and add 2–16 unique players{config.players?.length ? "." : ". No player list was provided."}</p><button className="charades-button charades-button-primary" onClick={() => navigate("/game/charades")}>Back to setup</button></section></main>;

  const winners = stats.winnerIds.map((id) => state.teams.find((team) => team.id === id));
  const shareSummary = charadesResultSummary(winners, state.teams);
  const progress = Math.max(0, state.game.totalTurns - state.turnIndex);

  return <main className={`charades-page ${state.phase === "results" ? "is-results" : ""}`} data-prompt-color={(state.promptVersion || 0) % 3}>
    {state.phase !== "results" ? <>
      <header className="charades-hud" style={{ "--player-color": turnColor.background, "--player-foreground": turnColor.foreground }}>
        <button className="charades-icon-button" aria-label="Pause and exit" onClick={openPause}><ArrowLeft size={21}/></button>
        <div className="charades-hud-player"><span>ROUND {turn.roundNumber} / {state.game.roundCount}</span><strong>{turn.team.name} · {turn.actingPlayer}</strong></div>
        {state.phase === "acting" ? <div className={`charades-timer ${state.timeLeft <= 10 ? "is-urgent" : ""}`} role="timer" aria-label={`${state.timeLeft} seconds remaining`}><Clock3 size={15}/><strong>{state.timeLeft}</strong><span>s</span></div> : <div className="charades-ready-badge" aria-label="Ready">READY</div>}
      </header>

      <section className={`charades-stage ${state.phase === "acting" ? "is-acting" : "is-preparing"}`} aria-live="polite">
        {state.phase === "preparation" ? <div className="charades-prep">
          <span className="charades-eyebrow">YOUR TURN IS NEXT</span>
          <h1>Ready, {turn.actingPlayer}?</h1>
          <p>Pass the phone to {turn.actingPlayer} and make sure everyone is ready.</p>
          <div className="charades-prep-meta"><span>TURN {state.turnIndex + 1} OF {state.game.totalTurns}</span><span>{turn.team.score} POINTS</span></div>
          {state.currentPrompt ? <button className="charades-button charades-button-primary charades-reveal-button" onClick={() => dispatch({ type: "START" })}>GO</button> : <div className="charades-reveal"><h2>This deck is complete</h2><button className="charades-button charades-button-primary" onClick={() => dispatch({ type: "REPLAY_DECK" })}>Reshuffle and replay</button></div>}
        </div> : <div className="charades-play">
          <div className="charades-prompt-wrap">
            <span className="charades-eyebrow">{state.result?.type === "correct" ? `CORRECT · +${state.result.points}` : state.result?.type === "skip" ? "SKIPPED · NO POINTS" : state.currentPrompt ? "ACT WITHOUT SPEAKING" : "DECK COMPLETE"}</span>
            <h1 className={`charades-prompt ${state.transition ? "is-changing" : ""}`}>{state.currentPrompt?.prompt || "You played every movie in this deck."}</h1>
            <span className="charades-prompt-meta">{state.currentPrompt ? `${state.currentPrompt.year} · ${state.currentPrompt.difficulty}` : ""}</span>
          </div>
          <div className="charades-round-status"><span><Trophy size={16}/> {turn.team.score} points</span><span><span className="charades-streak-dot"/> {turn.team.streak} streak</span><span>{state.game.totalTurns - progress + 1} / {state.game.totalTurns} turns</span></div>
          {state.currentPrompt ? <>
            <div className="charades-actions">
              <button className="charades-button charades-button-primary" disabled={state.paused || state.transition} onClick={() => act(true)}><CheckCircle2 size={19}/> Correct</button>
              <button className="charades-button charades-button-secondary" disabled={state.paused || state.transition} onClick={() => act(false)}><SkipForward size={19}/> Skip</button>
            </div>
            <div className="charades-utility-row">
              <button className="charades-text-button" onClick={openPause}><Pause size={15}/> Pause</button>
              <button className="charades-text-button" disabled={state.paused || state.transition} onClick={() => dispatch({ type: "END_TURN", reason: "ended" })}>End turn</button>
              <button className="charades-text-button" onClick={() => { if (tiltEnabled) { setTiltEnabled(false); window.clearTimeout(sensorTimerRef.current); neutralRef.current = null; setSensorStatus("Manual controls active"); } else enableTilt(); }}><Smartphone size={15}/> {tiltEnabled ? "Disable tilt" : "Tilt controls"}</button>
              <label className="charades-vibration"><input type="checkbox" checked={vibrationEnabled} onChange={(event) => setVibrationEnabled(event.target.checked)}/> Vibration</label>
            </div>
            <div className="charades-gesture-hint" role="status">{sensorStatus}{neutralBeta !== null && tiltEnabled ? ` · calibrated ${Math.round(neutralBeta)}°` : ""}</div>
            <details className="charades-powerups"><summary>Team power-ups</summary><div className="charades-powerup-list">
              <button className="charades-powerup" disabled={state.paused || state.transition || !turn.team.inventory.doublePoints} onClick={() => setDoublePointsArmedFor(doublePointsArmed ? null : `${state.turnIndex}:${turn.team.id}`)}><Zap size={16}/><span>{doublePointsArmed ? "Double points armed" : "Double points"}</span><b>{turn.team.inventory.doublePoints}</b></button>
              <button className="charades-powerup" disabled={state.paused || state.transition || !turn.team.inventory.extraTime} onClick={() => dispatch({ type: "EXTRA_TIME" })}><Clock3 size={16}/><span>Add 15 seconds</span><b>{turn.team.inventory.extraTime}</b></button>
              <button className="charades-powerup" disabled={state.paused || state.transition || !turn.team.inventory.freeSkip} onClick={() => act(false, { freeSkip: true })}><SkipForward size={16}/><span>Free skip</span><b>{turn.team.inventory.freeSkip}</b></button>
            </div></details>
          </> : <button className="charades-button charades-button-secondary" onClick={() => dispatch({ type: "REPLAY_DECK" })}>Replay this deck</button>}
        </div>}
      </section>

      <footer className="charades-footer" style={{ "--player-color": turnColor.background, "--player-foreground": turnColor.foreground }}><div className="charades-footer-copy"><strong>{turn.team.name}</strong><span>{turn.team.correctAnswers} correct · best streak {turn.team.longestStreak}</span></div><div className="charades-score-dots" aria-label={`${turn.team.score} points`}><span>{turn.team.score}</span><small>PTS</small></div></footer>
    </> : <section className="charades-results">
      <div className="charades-result-icon"><Trophy size={27}/></div><span className="charades-eyebrow">MATCH COMPLETE</span>
      <h1>{winners.length === 1 ? `${winners[0].name} wins` : winners.length ? "It’s a tie" : "Game complete"}</h1>
      <p className="charades-results-intro">A round well played. Here are the final scores.</p>
      <div className="charades-scoreboard">{getLeaderboard(state.teams).map((team, index) => { const color = getPlayerColor(Number(team.id.replace("team-", "")) - 1); return <div className={`charades-leader-row ${stats.winnerIds.includes(team.id) ? "is-winner" : ""}`} key={team.id} style={{ "--player-color": color.background, "--player-foreground": color.foreground }}><span className="charades-rank">{index + 1}</span><span className="charades-leader-name">{team.name}<small>{team.correctAnswers} correct · {team.skippedPrompts} skips · best streak {team.longestStreak}</small></span><strong>{team.score}<small>PTS</small></strong></div>; })}</div>
      <div className="charades-summary-stats"><span>{stats.accuracy}% accuracy</span><span>{stats.correct} correct</span><span>{stats.skips} skips</span>{stats.fastestCorrect !== null && <span>{stats.fastestCorrect}s fastest</span>}</div>
      <div className="charades-result-actions"><button className="charades-button charades-button-primary" onClick={restart}><RotateCcw size={18}/> Play again</button><button className="charades-button charades-button-secondary" onClick={() => navigate("/game/charades", { state: { players: state.game.players, era: state.game.era, difficulty: state.game.difficulty, roundCount: state.game.roundCount, turnDuration: state.game.turnDuration, teamMode: state.game.teamMode, teamCount: state.game.teamCount } })}>Back to setup</button><ShareResultsButton summary={shareSummary} className="charades-text-button" /></div>
    </section>}

    {pauseOpen && <div className="charades-modal-backdrop"><section className="charades-dialog" role="dialog" aria-modal="true" aria-labelledby="charades-dialog-title" aria-describedby="charades-dialog-copy" ref={dialogRef}>
      <div className="charades-dialog-head"><span>{leaveConfirm ? "LEAVE MATCH" : "PAUSED"}</span><button className="charades-icon-button charades-dialog-close" aria-label="Close pause dialog" ref={dialogCloseRef} onClick={closePause}><X size={18}/></button></div>
      <h2 id="charades-dialog-title">{leaveConfirm ? "Leave this game?" : "Take a breather"}</h2>
      <p id="charades-dialog-copy">{leaveConfirm ? "Your scores and this match will be discarded." : "Your timer is stopped. The current turn will be right here when you return."}</p>
      <div className="charades-dialog-actions">{leaveConfirm ? <><button className="charades-button charades-button-danger" onClick={() => navigate("/")}>Leave game</button><button className="charades-button charades-button-primary" onClick={() => setLeaveConfirm(false)}>Keep playing</button></> : <><button className="charades-button charades-button-primary" onClick={closePause}><Play size={18}/> Resume</button><button className="charades-button charades-button-secondary" onClick={() => setLeaveConfirm(true)}>Leave game</button></>}</div>
    </section></div>}
  </main>;
}

export default class CharadesGame extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <main className="charades-page"><section className="charades-panel charades-error" role="alert"><h1>Charades needs a fresh start</h1><p>The current match state could not be recovered. Your room setup is still available.</p><Link className="charades-button charades-button-primary" to="/game/charades">Return to Charades setup</Link><Link className="charades-button charades-button-secondary" to="/">Return home</Link></section></main>;
    return <CharadesGameScreen />;
  }
}
