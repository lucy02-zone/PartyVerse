import { createClient } from "npm:@supabase/supabase-js@2";
import { assignServerRoles, generateRoomCode } from "../_shared/mafiaRules.js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return jsonResponse({ error: "Use POST for Mafia commands." }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return jsonResponse({ error: "Online Mafia is not configured on the server." }, 503);
  }

  const authorization = request.headers.get("Authorization") ?? "";
  const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return jsonResponse({ error: "Sign in before using Online Mafia." }, 401);

  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await authClient.auth.getUser(token);
  if (authError || !authData.user) return jsonResponse({ error: "Your session is invalid. Reconnect and try again." }, 401);

  let body: { command?: string; payload?: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Request body must be valid JSON." }, 400);
  }
  const allowedCommands = new Set(["create", "join", "state", "ready", "start", "night_action", "vote"]);
  if (!body || typeof body.command !== "string" || !allowedCommands.has(body.command)) {
    return jsonResponse({ error: "Unsupported Mafia command." }, 400);
  }
  const payload = body.payload && typeof body.payload === "object" ? body.payload : {};
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  if (body.command === "create") {
    if (typeof payload.playerName !== "string") return jsonResponse({ error: "Enter your player name." }, 400);
    if (typeof payload.roomName !== "string") return jsonResponse({ error: "Enter a room name." }, 400);
    payload.roomCode = generateRoomCode();
  }

  if (body.command === "start") {
    const roomId = typeof payload.roomId === "string" ? payload.roomId : "";
    if (!roomId) return jsonResponse({ error: "Room details are missing. Refresh the lobby." }, 400);
    const { data: membership, error: membershipError } = await admin
      .from("mafia_room_memberships")
      .select("is_host")
      .eq("room_id", roomId)
      .eq("user_id", authData.user.id)
      .maybeSingle();
    if (membershipError || !membership?.is_host) return jsonResponse({ error: "Only the room host can start the game." }, 403);
    const { data: players, error: playersError } = await admin
      .from("mafia_room_players")
      .select("id")
      .eq("room_id", roomId)
      .order("joined_at", { ascending: true });
    if (playersError || !players) return jsonResponse({ error: "Could not prepare this room. Refresh and try again." }, 409);
    try {
      payload.roles = assignServerRoles(players.map((player) => player.id));
    } catch (error) {
      return jsonResponse({ error: error instanceof Error ? error.message : "Could not assign roles." }, 400);
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
    return jsonResponse({ error: expectedClientError ? message : "That Mafia action could not be completed. Refresh the room and try again." }, expectedClientError ? 400 : 409);
  }
  return jsonResponse(data);
});
