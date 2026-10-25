import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, Copy, Moon, Shield, Sun, Users, Wifi, WifiOff } from "lucide-react";
import Navbar from "../../components/Navbar.jsx";
import { isSupabaseConfigured, requireSupabase } from "../../lib/supabase.js";
import { isAnonymousSignInDisabled } from "./onlineAuth.js";

const emptySnapshot = null;

function messageForError(error) {
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
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
  const [authSetupRequired, setAuthSetupRequired] = useState(false);
  const [connection, setConnection] = useState("offline");
  const snapshotRef = useRef(null);

  const invoke = useCallback(async (command, payload = {}) => {
    const client = requireSupabase();
    let { data: sessionData } = await client.auth.getSession();
    if (!sessionData.session) {
      const { data, error: authError } = await client.auth.signInAnonymously();
      if (authError) {
        if (isAnonymousSignInDisabled(authError)) {
          const setupError = new Error("Anonymous sign-ins are disabled for this Supabase project.");
          setupError.code = "anonymous_provider_disabled";
          throw setupError;
        }
        throw authError;
      }
      if (!data.user) throw new Error("Could not create a player session. Please retry.");
    }
    const { data, error: functionError } = await client.functions.invoke("mafia", {
      body: { command, payload },
    });
    if (functionError) {
      let functionMessage = functionError.message;
      if (functionError.context instanceof Response) {
        try {
          const responseBody = await functionError.context.json();
          functionMessage = responseBody?.error || functionMessage;
        } catch {
          // Retain the SDK's transport error when the response is not JSON.
        }
      }
      throw new Error(functionMessage || "Could not reach the Mafia server.");
    }
    if (data?.error) throw new Error(data.error);
    return data;
  }, []);

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
      setAuthSetupRequired(false);
      setError("");
    } catch (refreshError) {
      const disabled = isAnonymousSignInDisabled(refreshError);
      setAuthSetupRequired(disabled);
      setConnection(disabled ? "offline" : "reconnecting");
      setError(messageForError(refreshError));
    }
  }, [invoke]);

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
    setAuthSetupRequired(false);
    try {
      const next = await invoke(command, payload);
      snapshotRef.current = next;
      setSnapshot(next);
      setCode(next.room.code);
      setConnection("connected");
      setTargetId("");
      setRoleRevealed(false);
      return next;
    } catch (commandError) {
      const disabled = isAnonymousSignInDisabled(commandError);
      setAuthSetupRequired(disabled);
      setError(messageForError(commandError));
      setConnection(disabled ? "offline" : "reconnecting");
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
    setAuthSetupRequired(false);
    setError("");
    setSearchParams({}, { replace: true });
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

        {!isSupabaseConfigured ? (
          <section className="online-mafia-card" role="status">
            <h2>Connect Supabase to play online</h2>
            <p>Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> in your local <code>.env</code> file, then restart Vite.</p>
          </section>
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
                <div className="online-mafia-roster">
                  {snapshot.players.map((item) => <div className="online-mafia-player" key={item.id}><span className="online-mafia-avatar">{item.name.slice(0, 1).toUpperCase()}</span><span>{item.name}{item.id === snapshot.myPlayerId ? " (you)" : ""}{item.id === snapshot.hostPlayerId && <small>HOST</small>}</span><b className={item.ready ? "ready" : "not-ready"}>{item.ready ? "Ready" : "Joining"}</b></div>)}
                </div>
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
                  <div className="online-mafia-phase online-mafia-private"><Shield size={19} /><div><span className="section-kicker">PRIVATE TO YOU</span>{roleRevealed ? <h2>{snapshot.yourRole}</h2> : <button type="button" className="online-mafia-reveal" onClick={() => setRoleRevealed(true)}>Reveal my role</button>}{snapshot.yourRole === "Mafia" && roleRevealed && snapshot.mafiaTeammates?.length > 0 && <p>Mafia teammates: {snapshot.mafiaTeammates.map((mate) => mate.name).join(", ")}</p>}{snapshot.investigation && <p>Investigation: {snapshot.investigation.playerName} is {snapshot.investigation.isMafia ? "Mafia" : "not Mafia"}.</p>}</div></div>
                  {snapshot.room.phase === "night" && snapshot.yourRole !== "Villager" && !snapshot.hasSubmitted && player?.alive && <div className="online-mafia-action-box"><h3>{snapshot.yourRole === "Mafia" ? "Choose the town’s target" : snapshot.yourRole === "Doctor" ? "Choose someone to protect" : "Choose someone to investigate"}</h3><p>Your action is private. Mafia members coordinate through their submitted targets; the result is hidden until all night actions are in.</p><select value={targetId} onChange={(event) => setTargetId(event.target.value)} aria-label="Choose a player"><option value="">Choose a living player</option>{targets.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><button className="mafia-primary-button" disabled={loading || !targetId} onClick={submitRoleAction}>Submit secret action</button></div>}
                  {snapshot.room.phase === "day" && player?.alive && !snapshot.hasSubmitted && <div className="online-mafia-action-box"><h3>Vote to eliminate</h3><p>Discuss together, then submit one private vote. The result appears when everyone has voted.</p><select value={targetId} onChange={(event) => setTargetId(event.target.value)} aria-label="Vote for a player"><option value="">Choose a living player</option>{targets.filter((item) => item.id !== player.id).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><button className="mafia-primary-button" disabled={loading || !targetId} onClick={submitVote}>Submit private vote</button></div>}
                  {(!player?.alive || snapshot.hasSubmitted || snapshot.yourRole === "Villager" && snapshot.room.phase === "night") && <p className="online-mafia-wait">{!player?.alive ? "You are out of the game. Stay and watch the round." : snapshot.hasSubmitted ? "Your submission is in. Waiting for the other players…" : "The town is asleep. Waiting for the night actions…"}</p>}
                  {waiting && <div className="online-mafia-progress" aria-live="polite">{snapshot.submittedCount} of {snapshot.requiredCount} submissions received · Waiting for other players</div>}
                </>}
                <div className="online-mafia-roster compact">{snapshot.players.map((item) => <div className="online-mafia-player" key={item.id}><span className="online-mafia-avatar">{item.name.slice(0, 1).toUpperCase()}</span><span>{item.name}{item.id === snapshot.myPlayerId ? " (you)" : ""}</span><b className={item.alive ? "ready" : "not-ready"}>{item.alive ? "In game" : "Out"}</b></div>)}</div>
                {snapshot.finalRoles && <div className="online-mafia-final-roles"><h3>Final roles</h3>{snapshot.finalRoles.map((item) => <p key={item.playerId}><strong>{item.name}</strong><span>{item.role}{item.alive ? " · survived" : " · eliminated"}</span></p>)}</div>}
                {snapshot.room.phase === "ended" && <button className="mafia-secondary-button" onClick={leaveRoom}>Leave room</button>}
              </>
            )}
          </section>
        )}
        {error && (authSetupRequired ? <section className="online-mafia-error" role="alert"><strong>Enable Anonymous Sign-Ins in Supabase</strong><p>Supabase returned <code>anonymous_provider_disabled</code> (HTTP 422). The game uses anonymous device sessions so players do not need full accounts.</p><p>In your Supabase Dashboard, open <strong>Authentication → Sign In / Providers → Anonymous Sign-Ins</strong> and enable it, then retry. For local Supabase, set <code>auth.enable_anonymous_sign_ins = true</code> in <code>supabase/config.toml</code>.</p><a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer">Open Supabase Dashboard</a> · <a href="https://supabase.com/docs/guides/auth/auth-anonymous" target="_blank" rel="noreferrer">Anonymous sign-in guide</a></section> : <p className="online-mafia-error" role="alert">{error}</p>)}
        {snapshot && <button type="button" className="online-mafia-leave" onClick={leaveRoom}>Leave room</button>}
      </main>
    </>
  );
}
