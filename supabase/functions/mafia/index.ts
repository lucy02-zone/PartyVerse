import { createClient } from "npm:@supabase/supabase-js@2";
import { createMafiaCorsPolicy, createMafiaJsonResponse, createMafiaPreflightResponse, getAllowedMafiaOrigins } from "../_shared/cors.js";
import { assignServerRoles, generateRoomCode } from "../_shared/mafiaRules.js";

const allowedOrigins = getAllowedMafiaOrigins(Deno.env.get("MAFIA_ALLOWED_ORIGINS") ?? "");

Deno.serve(async (request: Request) => {
  const origin = request.headers.get("Origin");
  if (request.method === "OPTIONS") return createMafiaPreflightResponse(origin, allowedOrigins);
  const cors = createMafiaCorsPolicy(origin, allowedOrigins);
  const respond = (body: unknown, status = 200) => createMafiaJsonResponse(body, status, cors);
  if (!cors.allowed) return respond({ error: "This origin is not allowed." }, 403);
  if (request.method !== "POST") return respond({ error: "Use POST for Mafia commands." }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return respond({ error: "Online Mafia is not configured on the server." }, 503);
    }

    const authorization = request.headers.get("Authorization") ?? "";
    const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) return respond({ error: "Sign in before using Online Mafia." }, 401);

    const authClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: authData, error: authError } = await authClient.auth.getUser(token);
    if (authError || !authData.user) return respond({ error: "Your session is invalid. Reconnect and try again." }, 401);

    let body: { command?: string; payload?: Record<string, unknown> };
    try {
      body = await request.json();
    } catch {
      return respond({ error: "Request body must be valid JSON." }, 400);
    }
    const allowedCommands = new Set(["create", "join", "state", "ready", "start", "night_action", "vote"]);
    if (!body || typeof body.command !== "string" || !allowedCommands.has(body.command)) {
      return respond({ error: "Unsupported Mafia command." }, 400);
    }
    const payload = body.payload && typeof body.payload === "object" ? body.payload : {};
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    if (body.command === "create") {
      if (typeof payload.playerName !== "string") return respond({ error: "Enter your player name." }, 400);
      if (typeof payload.roomName !== "string") return respond({ error: "Enter a room name." }, 400);
      payload.roomCode = generateRoomCode();
    }

    if (body.command === "start") {
      const roomId = typeof payload.roomId === "string" ? payload.roomId : "";
      if (!roomId) return respond({ error: "Room details are missing. Refresh the lobby." }, 400);
      const { data: membership, error: membershipError } = await admin
        .from("mafia_room_memberships")
        .select("is_host")
        .eq("room_id", roomId)
        .eq("user_id", authData.user.id)
        .maybeSingle();
      if (membershipError || !membership?.is_host) return respond({ error: "Only the room host can start the game." }, 403);
      const { data: players, error: playersError } = await admin
        .from("mafia_room_players")
        .select("id")
        .eq("room_id", roomId)
        .order("joined_at", { ascending: true });
      if (playersError || !players) return respond({ error: "Could not prepare this room. Refresh and try again." }, 409);
      try {
        payload.roles = assignServerRoles(players.map((player) => player.id));
      } catch (error) {
        return respond({ error: error instanceof Error ? error.message : "Could not assign roles." }, 400);
      }
    }

    const { data, error } = await admin.rpc("mafia_command", {
      p_actor_user_id: authData.user.id,
      p_command: body.command,
      p_payload: payload,
    });
    if (error) {
      const message = error.message || "That Mafia action could not be completed.";
      const expectedClientError = /Room not found|Check the code|Enter a name|already|needs 5|full|ready|cannot|living|closed|started|invalid|Only the host|has already|unsupported|Mafia cannot|Your role|state changed|refresh/i.test(message);
      return respond({ error: expectedClientError ? message : "That Mafia action could not be completed. Refresh the room and try again." }, expectedClientError ? 400 : 409);
    }
    return respond(data);
  } catch {
    return respond({ error: "Online Mafia could not complete that request. Please try again." }, 500);
  }
});
