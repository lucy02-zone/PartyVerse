import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, Clock3, Eye, EyeOff, Flag, Lightbulb, RotateCcw, ShieldAlert, Sparkles, Trophy, Users } from "lucide-react";
import ShareResultsButton from "../../components/ShareResultsButton.jsx";
import { undercoverResultSummary } from "../../lib/resultSummary.js";
import { buildUndercoverSummary, createUndercoverGame, continueGame, finishRound, getLeaderboard, missions, resetForReplay, setMissionClaim, submitAccusation, submitSuspicion, verifyClaim } from "./logic.js";

export default function UndercoverGame() {
  const location = useLocation();
  const players = Array.isArray(location.state?.players) ? location.state.players : [];
  const options = location.state?.undercoverConfig || {};
  const [game, setGame] = useState(() => {
    try { return createUndercoverGame(players, options); } catch { return null; }
  });
  const [privateVisible, setPrivateVisible] = useState(false);
  const [activePlayerId, setActivePlayerId] = useState("");
  const [accuserId, setAccuserId] = useState("");
  const [targetId, setTargetId] = useState("");
  const [missionGuess, setMissionGuess] = useState("");
  const [suspicionVoterId, setSuspicionVoterId] = useState("");
  const [suspicionTargetId, setSuspicionTargetId] = useState("");
  const [feedback, setFeedback] = useState("");
  const [rulesOpen, setRulesOpen] = useState(false);
  const finalSummary = game?.phase === "results" ? buildUndercoverSummary(game) : null;
  const phase = game?.phase;
  const timerEnabled = game?.timerEnabled;
  const seconds = game?.seconds;

  useEffect(() => {
    if (phase !== "active" || !timerEnabled || seconds <= 0) return undefined;
    const shouldFinish = seconds <= 1;
    const timer = window.setInterval(() => {
      if (shouldFinish) {
        setPrivateVisible(false);
        setGame((current) => current?.phase === "active" ? finishRound(current) : current);
      } else {
        setGame((current) => current?.phase === "active" ? { ...current, seconds: Math.max(0, current.seconds - 1) } : current);
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [phase, timerEnabled, seconds]);

  const leaderboard = game ? getLeaderboard(game.assignments) : [];
  const activePlayer = game?.assignments.find((player) => player.id === activePlayerId);
  const currentReveal = game?.assignments[game.currentIndex];
  const formattedTime = game ? `${Math.floor(game.seconds / 60).toString().padStart(2, "0")}:${(game.seconds % 60).toString().padStart(2, "0")}` : "";

  if (!game) return <main className="undercover-page" data-phase="invalid"><div className="undercover-panel"><span className="undercover-kicker">PARTYVERSE · UNDERCOVER</span><h1>Let’s get the team ready.</h1><p>Undercover needs between 3 and 12 uniquely named players. Return to setup and check the player list.</p><Link className="primary-button" to="/game/undercover">Set up players</Link></div></main>;

  function showMission() { setPrivateVisible(true); setFeedback(""); }
  function hideMission() { setPrivateVisible(false); }
  function passMission() {
    hideMission();
    if (game.currentIndex + 1 >= game.assignments.length) {
      setGame((current) => ({ ...current, phase: "active", seconds: current.config.duration }));
    } else {
      setGame((current) => ({ ...current, currentIndex: current.currentIndex + 1 }));
    }
  }
  function finishCurrentRound() {
    setGame((current) => current?.phase === "active" ? finishRound(current) : current);
    setPrivateVisible(false);
    setFeedback("");
  }
  function nextRound() {
    setGame(continueGame(game));
    setPrivateVisible(false);
    setActivePlayerId("");
    setFeedback("");
  }
  function makeAccusation(event) {
    event.preventDefault();
    const outcome = submitAccusation(game, { accuserId, targetId, missionId: missionGuess });
    if (outcome.error) { setFeedback(outcome.error); return; }
    setGame(outcome.game);
    setFeedback("Accusation recorded. Guess results and score changes stay hidden until the round recap.");
    setTargetId(""); setMissionGuess("");
  }
  function makeNomination(event) {
    event.preventDefault();
    const outcome = submitSuspicion(game, suspicionVoterId, suspicionTargetId);
    setFeedback(outcome.error || "Private nomination recorded.");
    if (!outcome.error) { setGame(outcome.game); setSuspicionVoterId(""); setSuspicionTargetId(""); }
  }
  function replay() {
    setGame(resetForReplay(game));
    setPrivateVisible(false); setActivePlayerId(""); setAccuserId(""); setTargetId(""); setMissionGuess(""); setFeedback("");
  }
  function updateTwist() {
    setGame((current) => ({ ...current, twistCompleted: true }));
    setFeedback("Conversation prompt completed. The mission will resolve with this round.");
  }

  return (
    <main className="undercover-page" data-phase={game.phase}>
      <header className="undercover-topbar"><Link to="/game/undercover" className="back-link"><ArrowLeft size={17} /> Setup</Link><span className="undercover-badge">UNDERCOVER · SECRET MISSIONS</span><button type="button" className="undercover-rules-toggle" aria-expanded={rulesOpen} onClick={() => setRulesOpen((open) => !open)}><Lightbulb size={16} /> Rules</button></header>
      {rulesOpen && <aside className="undercover-rules" id="undercover-rules"><strong>How to play</strong><p>Read your private mission, then talk and play naturally. Claim social missions yourself; game-event missions resolve from recorded actions. Spend accusation tokens to guess another player’s mission. The group reviews claims at each recap. Casual, Standard, and Chaos missions are worth 1, 2, and 3 points. A correct accusation earns 3 points for the accuser and 1 for the mission holder; a wrong guess costs 1 point and one token.</p><p>Accusations against the same player are limited to one per accuser each round. Tokens carry across rounds.</p></aside>}

      <section className={`undercover-panel undercover-panel-${game.phase}`}>
        {game.phase === "reveal" && currentReveal && <>
          <span className="undercover-kicker">ROUND {game.round} OF {game.rounds} · PRIVATE BRIEFING</span>{game.deckFallback && <p className="undercover-deck-note" role="status">This category has fewer unique missions than players, so a few missions from other categories joined the deck.</p>}<div className="undercover-progress" aria-label={`Player ${game.currentIndex + 1} of ${game.assignments.length}`}><span style={{ width: `${((game.currentIndex + 1) / game.assignments.length) * 100}%` }} /></div>
          {!privateVisible ? <div className="undercover-briefing"><span className="undercover-index">PLAYER {String(game.currentIndex + 1).padStart(2, "0")} / {String(game.assignments.length).padStart(2, "0")}</span><div className="undercover-seal" aria-hidden="true"><ShieldAlert size={28} /></div><span className="undercover-kicker">PASS THE DEVICE</span><h1>{currentReveal.name}, your mission awaits.</h1><p>Make sure nobody else can see the screen, then reveal your private mission.</p><button className="undercover-primary" type="button" onClick={showMission}><Eye size={18} /> Reveal my mission</button></div> : <div className="undercover-mission-reveal"><span className="undercover-kicker">{currentReveal.mission.category} · {currentReveal.mission.difficulty}</span><h1>{currentReveal.mission.title}</h1><p className="undercover-objective">{currentReveal.mission.objective}</p><p className="undercover-hint"><Lightbulb size={16} /> {currentReveal.mission.hint}</p><p className="undercover-restriction">{currentReveal.mission.restriction}</p><div className="undercover-reward">{currentReveal.mission.points} points <span>·</span> {currentReveal.mission.validation === "game-verified" ? "game-verified" : "player claim, reviewed later"}</div><div className="undercover-button-row"><button className="undercover-secondary" type="button" onClick={hideMission}><EyeOff size={17} /> Hide mission</button><button className="undercover-primary" type="button" onClick={passMission}>{game.currentIndex + 1 === game.assignments.length ? "Begin the round" : "Hide & pass device"}</button></div></div>}
        </>}

        {game.phase === "active" && <>
          <div className="undercover-round-heading"><div><span className="undercover-kicker">ROUND {game.round} OF {game.rounds} · IN PLAY</span><h1>Make your move.</h1></div><div className={`undercover-clock ${game.seconds <= 20 ? "is-low" : ""}`} aria-label={game.timerEnabled ? `${formattedTime} remaining` : "Timer off"}><Clock3 size={16} /><strong>{game.timerEnabled ? formattedTime : "OPEN"}</strong></div></div>
          <p className="undercover-subtitle">Carry out your mission naturally. Public scores and progress are visible; secret missions stay private until the final reveal.</p>
          {game.activeEvent && <article className="undercover-event"><span className="undercover-kicker"><Sparkles size={14} /> ROUND EVENT · {game.activeEvent.title}</span><p>{game.activeEvent.description} <strong>{game.activeEvent.prompt}</strong></p>{game.activeEvent.id === "twist" && <button type="button" className="undercover-secondary" onClick={updateTwist} disabled={game.twistCompleted}>{game.twistCompleted ? "Prompt completed" : "We answered the prompt"}</button>}{game.activeEvent.id === "suspicion" && <form className="undercover-inline-form" onSubmit={makeNomination}><label>Your name<select required value={suspicionVoterId} onChange={(event) => setSuspicionVoterId(event.target.value)}><option value="">Choose player</option>{game.assignments.filter((player) => !game.suspicions.some((item) => item.voterId === player.id)).map((player) => <option key={player.id} value={player.id}>{player.name}</option>)}</select></label><label>Private nomination<select required value={suspicionTargetId} onChange={(event) => setSuspicionTargetId(event.target.value)}><option value="">Choose player</option>{game.assignments.filter((player) => player.id !== suspicionVoterId).map((player) => <option key={player.id} value={player.id}>{player.name}</option>)}</select></label><button className="undercover-secondary" type="submit" disabled={!suspicionVoterId || !suspicionTargetId}>Submit nomination</button><small>{game.suspicions.length} of {game.assignments.length} private nominations submitted</small></form>}</article>}
          <div className="undercover-active-grid"><section className="undercover-module"><div className="undercover-module-heading"><Users size={18} /><div><h2>Players &amp; progress</h2><p>Scores and claimed missions</p></div></div><ul className="undercover-score-list">{leaderboard.map((player) => <li key={player.id}><span className="undercover-player-mark">{player.name.slice(0, 1).toUpperCase()}</span><span className="undercover-score-name">{player.name}<small>{player.claimStatus === "verified" ? "Mission verified" : player.claimStatus === "claimed" ? "Claim submitted" : "Mission in progress"}</small></span><strong>{player.score}<small>PTS</small></strong></li>)}</ul></section>
            <section className="undercover-module"><div className="undercover-module-heading"><Flag size={18} /><div><h2>Mission check-in</h2><p>Open only for the player holding the device</p></div></div><label className="undercover-field">Player<select value={activePlayerId} onChange={(event) => { setActivePlayerId(event.target.value); hideMission(); }}><option value="">Select your name</option>{game.assignments.map((player) => <option key={player.id} value={player.id}>{player.name}</option>)}</select></label>{activePlayer && <div className="undercover-private-checkin"><button type="button" className="undercover-secondary" onClick={() => setPrivateVisible((visible) => !visible)}>{privateVisible ? <EyeOff size={16} /> : <Eye size={16} />}{privateVisible ? "Hide my mission" : "Check my mission privately"}</button>{privateVisible && <div className="undercover-private-text" aria-live="polite"><span className="undercover-kicker">PRIVATE · {activePlayer.name}</span><strong>{activePlayer.mission.title}</strong><p>{activePlayer.mission.objective}</p><label className="undercover-claim"><input type="checkbox" checked={activePlayer.claimed} disabled={activePlayer.claimed || activePlayer.claimStatus === "verified"} onChange={(event) => setGame((current) => setMissionClaim(current, activePlayer.id, event.target.checked))} /> I completed this mission</label><small>{activePlayer.mission.validation === "game-verified" ? "The game will verify this from recorded events." : "Your claim is self-reported and will be reviewed in the recap."}</small></div>}</div>}<p className="undercover-token-note">Accusation tokens: {game.assignments.reduce((sum, player) => sum + player.tokens, 0)} remaining across the group.</p></section></div>
          <section className="undercover-module undercover-accuse"><div className="undercover-module-heading"><ShieldAlert size={18} /><div><h2>Make an accusation</h2><p>A correct guess earns 3 points. Each guess costs one token.</p></div></div><form className="undercover-accusation-form" onSubmit={makeAccusation}><label className="undercover-field">Accuser<select value={accuserId} required onChange={(event) => setAccuserId(event.target.value)}><option value="">Choose player</option>{game.assignments.filter((player) => player.tokens > 0).map((player) => <option key={player.id} value={player.id}>{player.name} · {player.tokens} tokens</option>)}</select></label><label className="undercover-field">Suspected player<select value={targetId} required onChange={(event) => setTargetId(event.target.value)}><option value="">Choose player</option>{game.assignments.filter((player) => player.id !== accuserId).map((player) => <option key={player.id} value={player.id}>{player.name}</option>)}</select></label><label className="undercover-field">Mission guess<select value={missionGuess} required onChange={(event) => setMissionGuess(event.target.value)}><option value="">Choose mission</option>{missions.map((mission) => <option key={mission.id} value={mission.id}>{mission.title}</option>)}</select></label><button className="undercover-primary" type="submit" disabled={!accuserId || !targetId || !missionGuess}>Submit accusation</button></form>{feedback && <p className="undercover-feedback" role="status">{feedback}</p>}{game.accusations.length > 0 && <p className="undercover-accusation-count">{game.accusations.length} accusation{game.accusations.length === 1 ? "" : "s"} submitted · results stay private until recap.</p>}</section>
          <button type="button" className="undercover-end-round" onClick={finishCurrentRound}>End round &amp; review claims <span>→</span></button>
        </>}

        {game.phase === "recap" && <><span className="undercover-kicker">ROUND {game.round} RECAP</span><h1>Resolve the round.</h1><p className="undercover-subtitle">Review player claims as a group. Game-verified goals resolve automatically; social goals need an honest group confirmation.</p><section className="undercover-recap-list">{game.assignments.map((player) => <article className="undercover-recap-row" key={player.id}><div><span className="undercover-kicker">{player.mission.category} · {player.mission.points} PTS</span><h2>{player.name} · {player.mission.title}</h2><p>{player.mission.objective}</p><small>{player.claimStatus === "verified" ? "Verified" : player.claimStatus === "disputed" ? "Disputed" : player.claimStatus === "failed" ? "Failed" : player.claimed ? "Claim pending review" : "Not claimed"} · {player.mission.validation === "game-verified" ? "Game-verified rule" : "Self-reported claim"}</small></div>{player.mission.validation === "self-report" && player.claimed && player.claimStatus === "claimed" ? <div className="undercover-review-actions"><button className="undercover-secondary" onClick={() => setGame((current) => verifyClaim(current, player.id, false))}>Dispute</button><button className="undercover-primary" onClick={() => setGame((current) => verifyClaim(current, player.id, true))}>Confirm</button></div> : <strong className="undercover-points">{player.claimStatus === "verified" ? `+${player.mission.points}` : "—"}</strong>}</article>)}</section><section className="undercover-module"><h2>Accusations</h2>{game.accusations.length ? game.accusations.map((entry, index) => <p key={`${entry.accuserId}-${entry.targetId}-${index}`} className="undercover-result-line">{game.assignments.find((player) => player.id === entry.accuserId)?.name} guessed {game.assignments.find((player) => player.id === entry.targetId)?.name}’s mission: <strong>{missions.find((item) => item.id === entry.missionId)?.title}</strong> — {entry.correct ? "correct" : "not quite"}.</p>) : <p>No accusations this round.</p>}{game.activeEvent?.id === "suspicion" && <p>{game.suspicions.length} private nominations were recorded.</p>}</section><div className="undercover-button-row"><button className="undercover-secondary" type="button" onClick={replay}><RotateCcw size={16} /> Start fresh</button><button className="undercover-primary" type="button" onClick={nextRound}>{game.round === game.rounds ? "See final results" : "Start next round"} →</button></div></>}

        {game.phase === "results" && <><span className="undercover-kicker">GAME COMPLETE · {game.events.length} ROUNDS</span><div className="undercover-winner-mark" aria-hidden="true"><Trophy size={30} /></div><h1>{finalSummary?.winners.length > 1 ? "A well-played tie." : `${finalSummary?.winners[0] || leaderboard[0]?.name} takes the win.`}</h1><p className="undercover-subtitle">{finalSummary?.winners.length > 1 ? `${finalSummary.winners.join(" and ")} share the top score.` : "A sharp read, a smooth mission, and a brilliant game night."}</p><section className="undercover-final-board"><h2>Final leaderboard</h2>{leaderboard.map((player) => <div className="undercover-final-row" key={player.id}><span className="undercover-rank">{player.rank === 1 ? "WIN" : `0${player.rank}`}</span><strong>{player.name}</strong><span>{player.score} pts</span></div>)}</section><section className="undercover-final-missions"><h2>Missions revealed</h2>{finalSummary?.recap.flatMap((event) => event.missions).map((entry, index) => <p key={`${entry.playerId}-${index}`}><strong>{entry.player}:</strong> {entry.mission} · {entry.completed ? "completed" : "not completed"}</p>)}</section><section className="undercover-final-recap"><h2>Round recap</h2>{game.events.map((event) => <div key={event.round}><p>Round {event.round} · {event.event?.title || "No event"}: {event.claims.length} claims · {event.accusations.filter((item) => item.correct).length} correct accusations · {event.suspicions.length} nominations</p>{event.accusations.map((entry, index) => <p key={`${entry.accuserId}-${entry.targetId}-${index}`}>{game.assignments.find((player) => player.id === entry.accuserId)?.name} guessed {game.assignments.find((player) => player.id === entry.targetId)?.name}: {entry.correct ? "correct" : "incorrect"}.</p>)}</div>)}</section><div className="undercover-button-row"><Link className="undercover-secondary" to="/game/undercover">Back to setup</Link><button type="button" className="undercover-primary" onClick={replay}><RotateCcw size={16} /> Play again</button></div><ShareResultsButton className="undercover-secondary full-button" summary={undercoverResultSummary(finalSummary)} /></>}
      </section>
    </main>
  );
}
