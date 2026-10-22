import { getPromptDeck } from "./prompts.js";

export const CHARADES_CATEGORIES = [
  "Movies",
  "Animals",
  "Actions",
  "Sports",
  "Objects",
  "Mixed",
];

export const DEFAULT_TURN_DURATION = 60;

export function normalizeCharadesConfig(config = {}) {
  const category = CHARADES_CATEGORIES.includes(config.category)
    ? config.category
    : "Mixed";

  const roundCount = Number.isInteger(Number(config.roundCount))
    ? Math.min(Math.max(Number(config.roundCount), 1), 12)
    : 3;

  const turnDuration = Number.isFinite(Number(config.turnDuration))
    ? Math.min(Math.max(Number(config.turnDuration), 15), 180)
    : DEFAULT_TURN_DURATION;

  const teamMode = config.teamMode === "teams" ? "teams" : "individual";
  const teamCount = Number.isInteger(Number(config.teamCount))
    ? Math.min(Math.max(Number(config.teamCount), 2), 6)
    : 2;

  return {
    category,
    roundCount,
    turnDuration,
    teamMode,
    teamCount,
  };
}

export function buildTeamAssignments(players = [], teamMode = "individual", teamCount = 2) {
  const uniquePlayers = Array.from(
    new Set((players || []).map((player) => String(player).trim()).filter(Boolean))
  );

  if (uniquePlayers.length < 3 || uniquePlayers.length > 16) {
    throw new Error("Charades requires 3 to 16 unique players.");
  }

  if (teamMode === "individual") {
    return uniquePlayers.map((player, index) => ({
      id: `team-${index + 1}`,
      name: player,
      players: [player],
      score: 0,
      correctAnswers: 0,
      skippedPrompts: 0,
      turnsPlayed: 0,
    }));
  }

  const safeTeamCount = Math.min(Math.max(teamCount, 2), uniquePlayers.length);
  const teams = Array.from({ length: safeTeamCount }, (_, index) => ({
    id: `team-${index + 1}`,
    name: `Team ${index + 1}`,
    players: [],
    score: 0,
    correctAnswers: 0,
    skippedPrompts: 0,
    turnsPlayed: 0,
  }));

  uniquePlayers.forEach((player, index) => {
    const teamIndex = index % safeTeamCount;
    teams[teamIndex].players.push(player);
  });

  return teams.filter((team) => team.players.length > 0);
}

export function buildScoreboard(teams = []) {
  return teams.map((team) => ({
    teamId: team.id,
    name: team.name,
    players: team.players,
    score: 0,
    correctAnswers: 0,
    skippedPrompts: 0,
    turnsPlayed: 0,
  }));
}

export function buildCharadesGame(config = {}) {
  const validPlayers = Array.from(
    new Set((config.players || []).map((player) => String(player).trim()).filter(Boolean))
  );

  const normalized = normalizeCharadesConfig({
    ...config,
    teamMode: config.teamMode || "individual",
    teamCount: config.teamCount || 2,
  });

  const teams = buildTeamAssignments(validPlayers, normalized.teamMode, normalized.teamCount);

  if (teams.length < 2) {
    throw new Error("Charades needs at least 2 teams or players.");
  }

  return {
    players: validPlayers,
    teams,
    category: normalized.category,
    roundCount: normalized.roundCount,
    turnDuration: normalized.turnDuration,
    teamMode: normalized.teamMode,
    teamCount: normalized.teamCount,
    deck: getPromptDeck(normalized.category, 200),
  };
}

export function getTurnDetails(game, turnIndex) {
  if (!game || !game.teams?.length) {
    return null;
  }

  const roundNumber = Math.floor(turnIndex / game.teams.length) + 1;
  const team = game.teams[turnIndex % game.teams.length];
  const actingPlayer = team.players[(roundNumber - 1) % team.players.length] || team.players[0];

  return {
    roundNumber,
    totalRounds: game.roundCount,
    team,
    actingPlayer,
    totalTurns: game.roundCount * game.teams.length,
  };
}

export function getWinningTeams(scoreboard = []) {
  if (!scoreboard.length) {
    return [];
  }

  const topScore = Math.max(...scoreboard.map((team) => team.score));
  return scoreboard.filter((team) => team.score === topScore);
}
