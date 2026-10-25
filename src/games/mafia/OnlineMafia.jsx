import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, Copy, Moon, Shield, Sun, UserMinus, Users, Wifi, WifiOff } from "lucide-react";
import Navbar from "../../components/Navbar.jsx";
import { isSupabaseConfigured, requireSupabase } from "../../lib/supabase.js";
import { createFriendlyAuthError, isOnlineAuthUnavailable } from "./onlineAuth.js";

const emptySnapshot = null;

const temporarilyUnavailable = "Online Mafia is temporarily unavailable. Please try again shortly.";
const safeActionErrorPatterns = [
  /^Room not found\. Check the code and try again\.?$/i,
  /^Enter a name from 1 to 30 characters\.?$/i,
  /^That name is already in this room\.?$/i,
  /^This room is full\.?$/i,
  /^This game has already started or ended\.?$/i,
  /^Mafia needs 5 to 15 players\.?$/i,
  /^Wait for every player to be ready\.?$/i,
  /^Only the host can start the game\.?$/i,
  /^Only the room host can remove players\.?$/i,
  /^The host cannot remove themselves\.?$/i,
  /^Players can only be removed before the game starts\.?$/i,
  /^Choose a player in this room to remove\.?$/i,
  /^The game has already started\.?$/i,
  /^(Lobby|Night actions|Day voting) (is|are) (closed|over)\.?$/i,
  /^Eliminated players cannot (act|vote)\.?$/i,
  /^Your role has no night action\.?$/i,
  /^Your (night action|vote) has already been submitted\.?$/i,
  /^Choose a living player in this room\.?$/i,
  /^You cannot (investigate|vote for) yourself\.?$/i,
  /^The Mafia cannot target a teammate\.?$/i,
  /^Game state changed\. Refresh the room and try again\.?$/i,
  /^The host removed you from this room\.?$/i,
  /^Voting time is up\. Your vote was not counted\.?$/i,
];

function messageForError(error) {
  const message = error instanceof Error ? error.message : "";
  return safeActionErrorPatterns.some((pattern) => pattern.test(message)) ? message : temporarilyUnavailable;
}

export default function OnlineMafia() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [name, setName] = useState("");
  const [roomName, setRoomName] = useState("");
  const [entryMode, setEntryMode] = useState(() => searchParams.get("room") ? "join" : null);
  const [code, setCode] = useState(searchParams.get("room")?.toUpperCase() ?? "");
  const [snapshot, setSnapshot] = useState(emptySnapshot);
  const [targetId, setTargetId] = useState("");
  const [roleRevealed, setRoleRevealed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [authUnavailable, setAuthUnavailable] = useState(false);
  const [connection, setConnection] = useState("offline");
  const [secondsLeft, setSecondsLeft] = useState(0);
  const snapshotRef = useRef(null);
  const timeoutRequestedForRef = useRef("");
  const clockOffsetRef = useRef(0);

  const invoke = useCallback(async (command, payload = {}) => {
    const client = requireSupabase();
    let { data: sessionData, error: sessionError } = await client.auth.getSession();
    if (sessionError) throw createFriendlyAuthError(sessionError);
    if (!sessionData.session) {
      const { data, error: authError } = await client.auth.signInAnonymously();
      if (authError) throw createFriendlyAuthError(authError);
      if (!data.user) throw createFriendlyAuthError(new Error("Missing player session."));
    }
    const requestStartedAt = Date.now();
    const { data, error: functionError } = await client.functions.invoke("mafia", {
      body: { command, payload },
    });
    const responseReceivedAt = Date.now();
    if (functionError) {
      let functionMessage = "";
      if (functionError.context instanceof Response) {
        try {
          const responseBody = await functionError.context.json();
          functionMessage = responseBody?.error || functionMessage;
        } catch {
          // Retain the SDK's transport error when the response is not JSON.
        }
      }
      throw new Error(messageForError(new Error(functionMessage)));
    }
    if (data?.error) throw new Error(messageForError(new Error(data.error)));
    if (data?.serverTime) {
      const serverTime = Date.parse(data.serverTime);
      if (Number.isFinite(serverTime)) {
        clockOffsetRef.current = serverTime - (requestStartedAt + responseReceivedAt) / 2;
      }
    }
    return data;
  }, []);

  const handleRemovedFromRoom = useCallback(() => {
    const removedCode = snapshotRef.current?.room?.code ?? code;
    snapshotRef.current = null;
    setSnapshot(null);
    setRoomName("");
    setEntryMode("join");
    setCode(removedCode);
    setAuthUnavailable(false);
    setConnection("offline");
    setError("The host removed you from this room. You can join a different room with a new code.");
    setSearchParams({}, { replace: true });
  }, [code, setSearchParams]);

  const refresh = useCallback(async (roomId = snapshotRef.current?.room?.id) => {
    if (!roomId) return;
    try {
      const next = await invoke("state", { roomId });
      const previous = snapshotRef.current;
      if (previous && (previous.room.phase !== next.room.phase || previous.room.roundNumber !== next.room.roundNumber)) {
        setTargetId("");
      }
      snapshotRef.current = next;
      setSnapshot(next);
      setCode(next.room.code);
      setConnection("connected");
      setAuthUnavailable(false);
      setError("");
    } catch (refreshError) {
      if (refreshError instanceof Error && /^The host removed you from this room\.?$/i.test(refreshError.message)) {
        handleRemovedFromRoom();
        return;
      }
      const authenticationUnavailable = isOnlineAuthUnavailable(refreshError);
      setAuthUnavailable(authenticationUnavailable);
      if (authenticationUnavailable) {
        snapshotRef.current = null;
        setSnapshot(null);
      }
      setConnection(authenticationUnavailable ? "offline" : "reconnecting");
      setError(authenticationUnavailable ? "" : messageForError(refreshError));
    }
  }, [handleRemovedFromRoom, invoke]);

  useEffect(() => {
    if (!snapshot?.room?.id) return undefined;
    const client = requireSupabase();
    const roomId = snapshot.room.id;
    const channel = client.channel(`online-mafia-${roomId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "mafia_rooms", filter: `id=eq.${roomId}` }, () => refresh(roomId))
      .on("postgres_changes", { event: "*", schema: "public", table: "mafia_room_players", filter: `room_id=eq.${roomId}` }, () => refresh(roomId))
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setConnection("connected");
        if (["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"].includes(status)) setConnection("reconnecting");
      });
    const interval = window.setInterval(() => refresh(roomId), 5000);
    return () => {
      window.clearInterval(interval);
      client.removeChannel(channel);
    };
  }, [refresh, snapshot?.room?.id]);

  useEffect(() => {
    if (snapshot?.room?.id) {
      if (searchParams.get("room") === snapshot.room.code) return;
      const updated = new URLSearchParams(searchParams);
      updated.set("room", snapshot.room.code);
      setSearchParams(updated, { replace: true });
    }
  }, [snapshot?.room?.id, snapshot?.room?.code, searchParams, setSearchParams]);

  async function runCommand(command, payload = {}) {
    setLoading(true);
    setError("");
    try {
      const next = await invoke(command, payload);
      snapshotRef.current = next;
      setSnapshot(next);
      setCode(next.room.code);
      setConnection("connected");
      setAuthUnavailable(false);
      setTargetId("");
      setRoleRevealed(false);
      return next;
    } catch (commandError) {
      if (commandError instanceof Error && /^The host removed you from this room\.?$/i.test(commandError.message)) {
        handleRemovedFromRoom();
        return null;
      }
      const authenticationUnavailable = isOnlineAuthUnavailable(commandError);
      setAuthUnavailable(authenticationUnavailable);
      if (authenticationUnavailable) {
        snapshotRef.current = null;
        setSnapshot(null);
      }
      setError(authenticationUnavailable ? "" : messageForError(commandError));
      setConnection(authenticationUnavailable ? "offline" : "reconnecting");
      return null;
    } finally {
      setLoading(false);
    }
  }

  async function createRoom(event) {
    event.preventDefault();
    await runCommand("create", { roomName, playerName: name });
  }

  async function joinRoom(event) {
    event.preventDefault();
    await runCommand("join", { roomCode: code.trim().toUpperCase(), playerName: name });
  }

  function submitRoleAction() {
    if (!targetId || !snapshot?.yourRole) return;
    runCommand("night_action", { roomId: snapshot.room.id, targetPlayerId: targetId, expectedPhase: snapshot.room.phase, expectedRoundNumber: snapshot.room.roundNumber });
  }

  function submitVote() {
    if (!targetId) return;
    runCommand("vote", { roomId: snapshot.room.id, targetPlayerId: targetId, expectedPhase: snapshot.room.phase, expectedRoundNumber: snapshot.room.roundNumber });
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(snapshot.room.code);
    } catch {
      setError("Copy is unavailable in this browser. Share the room code shown here.");
    }
  }

  function leaveRoom() {
    snapshotRef.current = null;
    setSnapshot(null);
    setCode("");
    setRoomName("");
    setEntryMode(null);
    setAuthUnavailable(false);
    setError("");
    setSearchParams({}, { replace: true });
  }

  async function removePlayer(item) {
    const confirmed = window.confirm(`Remove ${item.name} from this room? They will not be able to rejoin with this session.`);
    if (!confirmed) return;
    await runCommand("remove_player", { roomId: snapshot.room.id, targetPlayerId: item.id });
  }

  const player = snapshot?.players?.find((item) => item.id === snapshot.myPlayerId);
  const livingPlayers = snapshot?.players?.filter((item) => item.alive) ?? [];
  const targets = livingPlayers.filter((item) => {
    if (!player || item.id === player.id) return snapshot?.yourRole === "Doctor" && item.id === player?.id;
    if (snapshot?.room?.phase === "night" && snapshot.yourRole === "Mafia") {
      return !snapshot.mafiaTeammates?.some((teammate) => teammate.id === item.id);
    }
    return true;
  });
  const waiting = snapshot && snapshot.submittedCount < snapshot.requiredCount;
  const votingDeadline = snapshot?.room?.votingDeadline ?? null;

  useEffect(() => {
    if (snapshot?.room?.phase !== "day" || !votingDeadline) {
      return undefined;
    }
    const deadlineMs = Date.parse(votingDeadline);
    if (!Number.isFinite(deadlineMs)) return undefined;
    const updateCountdown = () => {
      const remaining = Math.max(0, Math.ceil((deadlineMs - Date.now() - clockOffsetRef.current) / 1000));
      setSecondsLeft(remaining);
      if (remaining === 0 && timeoutRequestedForRef.current !== votingDeadline) {
        timeoutRequestedForRef.current = votingDeadline;
        refresh(snapshot.room.id);
      }
    };
    const initialTimer = window.setTimeout(updateCountdown, 0);
    const timer = window.setInterval(updateCountdown, 200);
    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(timer);
    };
  }, [refresh, snapshot?.room?.id, snapshot?.room?.phase, votingDeadline]);

  return (
    <>
      <Navbar />
      <main className="online-mafia-page">
        <Link to="/" className="back-link"><ArrowLeft size={17} /> All games</Link>
        <header className="online-mafia-heading">
          <span className="online-mafia-mark"><Shield size={25} /></span>
          <span className="section-kicker">PARTYVERSE · ONLINE</span>
          <h1>Mafia, together</h1>
          <p>Everyone joins on their own device. Roles, actions, and votes stay server-side.</p>
        </header>

        {!isSupabaseConfigured || authUnavailable ? (
          <OnlineMafiaUnavailable />
        ) : !snapshot ? (
          <section className="online-mafia-card">
            <span className="section-kicker">START A GAME NIGHT</span>
            <h2>{entryMode === "create" ? "Create a room" : entryMode === "join" ? "Join your friends" : "Choose how to play"}</h2>
            <p>{entryMode ? "Every player joins on their own device. No full account is needed." : "Host a new game night or enter a room code to join your group."}</p>
            {!entryMode ? (
              <div className="online-mafia-entry-choices">
                <button type="button" className="online-mafia-choice create" onClick={() => setEntryMode("create")}><span className="online-mafia-choice-icon"><Users size={20} /></span><strong>Create a Room</strong><span>Host a new Mafia game</span></button>
                <button type="button" className="online-mafia-choice join" onClick={() => setEntryMode("join")}><span className="online-mafia-choice-icon"><ArrowLeft size={20} /></span><strong>Join a Room</strong><span>Enter a code from your host</span></button>
              </div>
            ) : entryMode === "create" ? (
              <>
                <form className="online-mafia-entry-form" onSubmit={createRoom}>
                  <label>Room name<input value={roomName} onChange={(event) => setRoomName(event.target.value)} minLength={2} maxLength={40} required autoComplete="off" placeholder="Friday game night" /></label>
                  <label>Your player name<input value={name} onChange={(event) => setName(event.target.value)} maxLength={30} required autoComplete="nickname" /></label>
                  <button className="mafia-primary-button" disabled={loading}>{loading ? "Creating room…" : "Create a Room"}</button>
                </form>
                <button type="button" className="online-mafia-back-choice" onClick={() => setEntryMode(null)}>Back to room options</button>
              </>
            ) : (
              <>
                <form className="online-mafia-entry-form" onSubmit={joinRoom}>
                  <label>Room code<input value={code} onChange={(event) => setCode(event.target.value.toUpperCase().replace(/[^A-HJ-NP-Z2-9]/g, "").slice(0, 6))} maxLength={6} minLength={6} required autoComplete="off" /></label>
                  <label>Your player name<input value={name} onChange={(event) => setName(event.target.value)} maxLength={30} required autoComplete="nickname" /></label>
                  <button className="mafia-primary-button" disabled={loading || code.length !== 6}>{loading ? "Joining room…" : "Join a Room"}</button>
                </form>
                <button type="button" className="online-mafia-back-choice" onClick={() => setEntryMode(null)}>Back to room options</button>
              </>
            )}
            <div className="online-mafia-local-option"><span>Playing on one device?</span><Link to="/game/mafia">Use local Mafia</Link></div>
          </section>
        ) : (
          <section className="online-mafia-card online-mafia-live">
            <div className="online-mafia-room-bar">
              <div className="online-mafia-room-title"><span className="section-kicker">ROOM</span><strong>{snapshot.room.name}</strong></div>
              <div className="online-mafia-room-code"><span className="section-kicker">ROOM CODE</span><strong>{snapshot.room.code}</strong></div>
              <button type="button" className="online-mafia-icon-button" onClick={copyCode} aria-label="Copy room code"><Copy size={18} /></button>
              <span className={`online-connection ${connection}`} role="status">{connection === "connected" ? <Wifi size={16} /> : <WifiOff size={16} />}{connection === "connected" ? "Connected" : "Reconnecting…"}</span>
            </div>

            {snapshot.room.phase === "lobby" ? (
              <>
                <div className="online-mafia-phase"><Users size={20} /><div><h2>Waiting room</h2><p>{snapshot.players.length} of 15 players · At least 5 players; everyone must be ready.</p></div></div>
                <OnlineMafiaLobbyRoster
                  players={snapshot.players}
                  isHost={snapshot.isHost}
                  myPlayerId={snapshot.myPlayerId}
                  hostPlayerId={snapshot.hostPlayerId}
                  loading={loading}
                  onRemove={removePlayer}
                />
                <div className="online-mafia-actions">
                  <button className="mafia-secondary-button" disabled={loading} onClick={() => runCommand("ready", { roomId: snapshot.room.id, ready: !player?.ready })}>{player?.ready ? "I’m not ready" : "I’m ready"}</button>
                  {snapshot.isHost && <button className="mafia-primary-button" disabled={loading || snapshot.players.length < 5 || !snapshot.players.every((item) => item.ready)} onClick={() => runCommand("start", { roomId: snapshot.room.id })}>Start game</button>}
                </div>
                {snapshot.isHost && snapshot.players.length < 5 && <p className="online-mafia-wait">Invite {5 - snapshot.players.length} more {5 - snapshot.players.length === 1 ? "player" : "players"} to start.</p>}
              </>
            ) : (
              <>
                <div className="online-mafia-round"><span className="section-kicker">ROUND {snapshot.room.roundNumber}</span><h2>{snapshot.room.phase === "night" ? <><Moon size={21} /> Night phase</> : snapshot.room.phase === "day" ? <><Sun size={21} /> Day discussion</> : `${snapshot.room.winner} wins!`}</h2><p>{snapshot.room.publicResult}</p></div>
                {snapshot.room.phase !== "ended" && <>
                  <OnlineMafiaPrivateRole
                    role={snapshot.yourRole}
                    revealed={roleRevealed}
                    onReveal={() => setRoleRevealed(true)}
                    teammates={snapshot.mafiaTeammates}
                    investigation={snapshot.investigation}
                  />
                  {snapshot.room.phase === "day" && <OnlineMafiaVotingTimer secondsLeft={votingDeadline ? secondsLeft : 0} />}
                  {snapshot.room.phase === "night" && snapshot.yourRole !== "Villager" && !snapshot.hasSubmitted && player?.alive && <div className="online-mafia-action-box"><h3>{snapshot.yourRole === "Mafia" ? "Choose the town’s target" : snapshot.yourRole === "Doctor" ? "Choose someone to protect" : "Choose someone to investigate"}</h3><p>{snapshot.yourRole === "Mafia" ? "Select a living player outside your Mafia team." : snapshot.yourRole === "Doctor" ? "Choose any living player, including yourself, to protect tonight." : "Choose another living player to investigate privately."}</p><PlayerTargetList targets={targets} selectedId={targetId} onSelect={setTargetId} label="Select a night-action target" action="night" /><button className="mafia-primary-button" disabled={loading || !targetId} onClick={submitRoleAction}>{loading ? "Submitting…" : "Submit night action"}</button></div>}
                  {snapshot.room.phase === "day" && player?.alive && !snapshot.hasSubmitted && <div className="online-mafia-action-box"><h3>Vote to eliminate</h3><p>Discuss together, then submit one private vote. Votes stay private until the round resolves. You cannot vote for yourself.</p><PlayerTargetList targets={targets.filter((item) => item.id !== player.id)} selectedId={targetId} onSelect={setTargetId} label="Select a player to vote for" action="vote" /><button className="mafia-primary-button" disabled={loading || !targetId || secondsLeft <= 0} onClick={submitVote}>{loading ? "Submitting…" : "Submit vote"}</button></div>}
                  {(!player?.alive || snapshot.hasSubmitted || snapshot.yourRole === "Villager" && snapshot.room.phase === "night") && <p className="online-mafia-wait">{!player?.alive ? "You are out of the game. Stay and watch the round." : snapshot.hasSubmitted ? "Your submission is in. Waiting for the other players…" : "The town is asleep. Waiting for the night actions…"}</p>}
                  {waiting && <div className="online-mafia-progress" aria-live="polite">{snapshot.submittedCount} of {snapshot.requiredCount} submissions received · Waiting for other players</div>}
                </>}
                <div className="online-mafia-roster compact">{snapshot.players.map((item) => <div className={`online-mafia-player${item.alive ? "" : " eliminated"}`} key={item.id}><span className="online-mafia-avatar">{item.name.slice(0, 1).toUpperCase()}</span><span>{item.name}{item.id === snapshot.myPlayerId ? " (you)" : ""}</span><b className={item.alive ? "ready" : "eliminated"}>{item.alive ? "In game" : "Out"}</b></div>)}</div>
                {snapshot.finalRoles && <div className="online-mafia-final-roles"><h3>Final roles</h3>{snapshot.finalRoles.map((item) => <p key={item.playerId}><strong>{item.name}</strong><span>{item.role}{item.alive ? " · survived" : " · eliminated"}</span></p>)}</div>}
                {snapshot.room.phase === "ended" && <button className="mafia-secondary-button" onClick={leaveRoom}>Leave room</button>}
              </>
            )}
          </section>
        )}
        {error && <p className="online-mafia-error" role="alert">{error}</p>}
        {snapshot && <button type="button" className="online-mafia-leave" onClick={leaveRoom}>Leave room</button>}
      </main>
    </>
  );
}

function OnlineMafiaUnavailable() {
  return (
    <section className="online-mafia-card online-mafia-unavailable" role="status" aria-live="polite">
      <span className="section-kicker">ONLINE GAME NIGHT</span>
      <h2>Online Mafia is taking a short break</h2>
      <p>Online play is temporarily unavailable. Please try again in a little while, or keep the game night going with local play.</p>
      <div className="online-mafia-unavailable-actions">
        <button type="button" className="mafia-primary-button" onClick={() => window.location.reload()}>Try again</button>
        <Link className="mafia-secondary-button" to="/game/mafia">Play local Mafia</Link>
      </div>
    </section>
  );
}

const roleDescriptions = {
  Mafia: "Work together at night to choose a target. Stay convincing during the day.",
  Doctor: "Choose one living player to protect from the Mafia each night. You may protect yourself.",
  Detective: "Investigate one living player each night and keep the result private.",
  Villager: "Discuss clues with the town and vote to find and eliminate the Mafia.",
};

export function OnlineMafiaPrivateRole({ role, revealed, onReveal, teammates = [], investigation }) {
  return (
    <section className="online-mafia-phase online-mafia-private" aria-label="Your private role">
      <Shield className="online-mafia-private-icon" size={22} aria-hidden="true" />
      <div className="online-mafia-private-copy">
        <span className="section-kicker">PRIVATE TO YOU</span>
        {revealed ? (
          <>
            <h2>{role}</h2>
            <p>{roleDescriptions[role] ?? "Your role will guide your choices during the game."}</p>
          </>
        ) : (
          <>
            <p>Your role is only visible on this device. Reveal it when you are ready.</p>
            <button type="button" className="online-mafia-reveal" onClick={onReveal}>Reveal my role</button>
          </>
        )}
        {role === "Mafia" && revealed && teammates.length > 0 && <p>Mafia teammates: {teammates.map((mate) => mate.name).join(", ")}</p>}
        {investigation && revealed && <p>Investigation: {investigation.playerName} is {investigation.isMafia ? "Mafia" : "not Mafia"}.</p>}
      </div>
    </section>
  );
}

export function PlayerTargetList({ targets, selectedId, onSelect, label, action }) {
  return (
    <div className="online-mafia-target-list" role="group" aria-label={label}>
      {targets.map((item) => {
        const selected = selectedId === item.id;
        const actionLabel = action === "vote" ? "vote for" : action === "night" ? "select" : "choose";
        return (
          <button
            key={item.id}
            type="button"
            className={`online-mafia-target${selected ? " selected" : ""}${item.alive ? "" : " eliminated"}`}
            aria-label={`${actionLabel} ${item.name}${item.alive ? "" : ", eliminated"}`}
            aria-pressed={selected}
            disabled={!item.alive}
            onClick={() => onSelect(item.id)}
          >
            <span className="online-mafia-avatar" aria-hidden="true">{item.name.slice(0, 1).toUpperCase()}</span>
            <span className="online-mafia-target-name">{item.name}</span>
            <span className="online-mafia-target-state">{selected ? "Selected" : item.alive ? "Choose" : "Out"}</span>
          </button>
        );
      })}
      {targets.length === 0 && <p className="online-mafia-no-targets">No eligible players are available.</p>}
    </div>
  );
}

export function OnlineMafiaVotingTimer({ secondsLeft }) {
  const remaining = Math.max(0, Math.min(15, secondsLeft));
  return (
    <div className={`online-mafia-vote-timer${remaining <= 5 ? " urgent" : ""}`}>
      <div className="online-mafia-vote-timer-copy">
        <span className="section-kicker">DAY DISCUSSION</span>
        <strong aria-live="polite" aria-atomic="true">Voting ends in {remaining}s</strong>
      </div>
      <div className="online-mafia-vote-progress" role="progressbar" aria-label="Voting time remaining" aria-valuemin="0" aria-valuemax="15" aria-valuenow={remaining}>
        <span style={{ transform: `scaleX(${remaining / 15})` }} />
      </div>
    </div>
  );
}

export function OnlineMafiaLobbyRoster({ players, isHost, myPlayerId, hostPlayerId, loading, onRemove }) {
  return (
    <div className="online-mafia-roster">
      {players.map((item) => (
        <div className="online-mafia-player" key={item.id}>
          <span className="online-mafia-avatar">{item.name.slice(0, 1).toUpperCase()}</span>
          <span>{item.name}{item.id === myPlayerId ? " (you)" : ""}{item.id === hostPlayerId && <small>HOST</small>}</span>
          <b className={item.ready ? "ready" : "not-ready"}>{item.ready ? "Ready" : "Joining"}</b>
          {isHost && item.id !== hostPlayerId && <button type="button" className="online-mafia-remove" aria-label={`Remove ${item.name} from room`} disabled={loading} onClick={() => onRemove(item)}><UserMinus size={17} aria-hidden="true" /><span>Remove</span></button>}
        </div>
      ))}
    </div>
  );
}
