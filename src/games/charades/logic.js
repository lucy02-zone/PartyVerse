import { getPromptDeck } from "./prompts.js";
export { createDefaultPlayers, removePlayerFromRoster } from "../../utils/playerSetup.js";

export const DEFAULT_TURN_DURATION = 60;
export const STREAK_MILESTONES = [3, 5, 10];
export const POWER_UPS = ["doublePoints", "extraTime", "freeSkip"];
const ERA_RANGES = [[2000, 2009], [2010, 2019], [2020, 2026]];

export function createPowerUpInventory(source = {}) {
  return Object.fromEntries(POWER_UPS.map((name) => [name,
    Number.isInteger(source?.[name]) && source[name] >= 0 ? source[name] : 1,
  ]));
}

export function getLeaderboard(teams = []) {
  return [...teams].sort((a, b) => b.score - a.score);
}

export function getTiltAction(delta, armed, now, lastAction, threshold = 22, cooldown = 1000) {
  if (Math.abs(delta) < 9) return "rearm";
  if (!armed || now - lastAction < cooldown) return null;
  if (delta <= -threshold) return "correct";
  if (delta >= threshold) return "skip";
  return null;
}

export function normalizeCharadesConfig(config = {}) {
  const era = ERA_RANGES.find(([start, end]) => Array.isArray(config.era) && config.era.length === 2 && config.era[0] === start && config.era[1] === end) || null;
  return {
    roundCount: Number.isInteger(Number(config.roundCount)) ? Math.min(Math.max(Number(config.roundCount), 1), 12) : 3,
    turnDuration: Number.isFinite(Number(config.turnDuration)) ? Math.min(Math.max(Number(config.turnDuration), 15), 180) : DEFAULT_TURN_DURATION,
    teamMode: config.teamMode === "teams" ? "teams" : "individual",
    teamCount: Number.isInteger(Number(config.teamCount)) ? Math.min(Math.max(Number(config.teamCount), 2), 6) : 2,
    era,
    difficulty: ["Easy", "Medium", "Hard", "Mixed"].includes(config.difficulty) ? config.difficulty : "Mixed",
    targetScore: Number.isInteger(Number(config.targetScore)) && Number(config.targetScore) > 0 ? Number(config.targetScore) : null,
  };
}

export function buildTeamAssignments(players = [], teamMode = "individual", teamCount = 2) {
  if (!Array.isArray(players)) throw new Error("Player list is missing or invalid.");
  if (players.some((player) => typeof player !== "string" || !player.trim())) throw new Error("Player names must be non-empty text.");
  const names = players.map((player) => player.trim());
  if (new Set(names.map((name) => name.toLocaleLowerCase())).size !== names.length) throw new Error("Player names must be unique.");
  if (names.length < 2 || names.length > 16) throw new Error("Charades requires 2 to 16 unique players.");
  if (teamMode !== "teams") return names.map((name, i) => ({ id: `team-${i + 1}`, name, players: [name], score: 0, correctAnswers: 0, skippedPrompts: 0, streak: 0, longestStreak: 0, turnsPlayed: 0, inventory: createPowerUpInventory() }));
  const count = Math.min(Math.max(teamCount, 2), names.length, 6);
  return Array.from({ length: count }, (_, i) => ({ id: `team-${i + 1}`, name: `Team ${i + 1}`, players: [], score: 0, correctAnswers: 0, skippedPrompts: 0, streak: 0, longestStreak: 0, turnsPlayed: 0, inventory: createPowerUpInventory() })).map((team, i) => ({ ...team, players: names.filter((_, n) => n % count === i) }));
}

export function buildCharadesGame(config = {}) {
  const normalized = normalizeCharadesConfig(config);
  const teams = buildTeamAssignments(config.players || [], normalized.teamMode, normalized.teamCount);
  if (teams.length < 2) throw new Error("Charades needs at least 2 teams or players.");
  const deck = getPromptDeck("Telugu Movies", 1000, { era: normalized.era, difficulty: normalized.difficulty });
  if (!deck.length) throw new Error("No Telugu movies match these filters. Choose another era or difficulty.");
  return { ...normalized, players: teams.flatMap((t) => t.players), teams, deck, totalTurns: teams.length * normalized.roundCount };
}

export function getTurnDetails(game, turnIndex, matchTeams = game?.teams) {
  if (!Array.isArray(matchTeams) || !matchTeams.length || !Number.isInteger(turnIndex) || turnIndex < 0) return null;
  const roundNumber = Math.floor(turnIndex / matchTeams.length) + 1;
  const team = matchTeams[turnIndex % matchTeams.length];
  if (!team || !Array.isArray(team.players) || !team.players.length) return null;
  return { roundNumber, totalRounds: game.roundCount, team, actingPlayer: team.players[(roundNumber - 1) % team.players.length], totalTurns: game.totalTurns };
}

export function getWinningTeams(teams = []) {
  if (!teams.length) return [];
  const top = Math.max(...teams.map((t) => t.score));
  return teams.filter((t) => t.score === top);
}

export function createMatchState(game, random = Math.random) {
  if (!game || !Array.isArray(game.teams) || !game.teams.length || !Array.isArray(game.deck) || !game.deck.length) throw new Error("Charades match data is incomplete.");
  game = {
    ...game,
    roundCount: Number.isInteger(game.roundCount) && game.roundCount > 0 ? game.roundCount : 3,
    turnDuration: Number.isFinite(game.turnDuration) && game.turnDuration > 0 ? game.turnDuration : DEFAULT_TURN_DURATION,
    totalTurns: Number.isInteger(game.totalTurns) && game.totalTurns > 0 ? game.totalTurns : game.teams.length * (Number.isInteger(game.roundCount) && game.roundCount > 0 ? game.roundCount : 3),
  };
  const deck = [...game.deck];
  for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]]; }
  return { game, teams: game.teams.map((t) => ({ ...t, score: 0, correctAnswers: 0, skippedPrompts: 0, streak: 0, longestStreak: 0, turnsPlayed: 0, inventory: createPowerUpInventory(t.inventory) })), turnIndex: 0, phase: "preparation", timeLeft: game.turnDuration, turnElapsed: 0, paused: false, promptIndex: 0, promptVersion: 0, currentPrompt: deck[0] || null, deck, history: [], correctTimes: [], achievements: [], transition: false, result: null };
}

export function matchReducer(state, action = {}) {
  if (!state || !Array.isArray(state.teams) || !state.teams.length || state.teams.some((team) => !team || typeof team !== "object")) return state;
  if (state.teams.some((team) => !team.inventory || POWER_UPS.some((powerUp) => !Number.isInteger(team.inventory[powerUp]) || team.inventory[powerUp] < 0))) {
    state = { ...state, teams: state.teams.map((team) => ({ ...team, inventory: createPowerUpInventory(team.inventory) })) };
  }
  switch (action.type) {
    case "RESTART": return createMatchState(action.game);
    case "REPLAY_DECK": {
      if (state.currentPrompt || !["acting", "preparation"].includes(state.phase)) return state;
      const deck = [...state.game.deck];
      for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]]; }
      return { ...state, deck, promptIndex: 0, promptVersion: (state.promptVersion || 0) + (deck[0] ? 1 : 0), currentPrompt: deck[0] || null, history: [...state.history, { outcome: "deck-replay" }] };
    }
    case "START": return state.phase === "preparation" ? { ...state, phase: "acting", timeLeft: state.game.turnDuration, turnElapsed: 0 } : state;
    case "PAUSE": return state.phase === "acting" ? { ...state, paused: true } : state;
    case "RESUME": return state.phase === "acting" ? { ...state, paused: false } : state;
    case "TICK": {
      if (state.phase !== "acting" || state.paused || state.transition) return state;
      if (state.timeLeft <= 1) return matchReducer({ ...state, timeLeft: 0, turnElapsed: state.turnElapsed + 1 }, { type: "END_TURN", reason: "timeout" });
      return { ...state, timeLeft: state.timeLeft - 1, turnElapsed: state.turnElapsed + 1 };
    }
    case "ANSWER": {
      if (state.phase !== "acting" || state.paused || state.transition || !state.currentPrompt) return state;
      const teamIndex = state.turnIndex % state.teams.length;
      const team = state.teams[teamIndex];
      const correct = action.correct === true;
      const freeSkip = !correct && action.freeSkip && team.inventory.freeSkip > 0;
      const double = correct && action.doublePoints && team.inventory.doublePoints > 0;
      const points = correct ? (double ? 2 : 1) : 0;
      const inventory = { ...team.inventory, ...(double ? { doublePoints: team.inventory.doublePoints - 1 } : {}), ...(freeSkip ? { freeSkip: team.inventory.freeSkip - 1 } : {}) };
      const nextTeam = { ...team, inventory, score: team.score + points, correctAnswers: team.correctAnswers + (correct ? 1 : 0), skippedPrompts: team.skippedPrompts + (!correct ? 1 : 0), streak: correct ? team.streak + 1 : 0, longestStreak: Math.max(team.longestStreak, correct ? team.streak + 1 : 0) };
      const teams = state.teams.map((t, i) => i === teamIndex ? nextTeam : t);
      const history = [...state.history, { prompt: state.currentPrompt.prompt, outcome: correct ? "correct" : freeSkip ? "free-skip" : "skip", player: getTurnDetails(state.game, state.turnIndex).actingPlayer, teamId: team.id, elapsed: state.turnElapsed }];
      const achievements = [...state.achievements];
      if (correct && STREAK_MILESTONES.includes(nextTeam.streak)) achievements.push({ type: "streak", teamId: team.id, value: nextTeam.streak });
      const promptIndex = state.promptIndex + 1;
      const currentPrompt = state.deck[promptIndex] || null;
      return { ...state, teams, history, achievements, promptIndex, promptVersion: (state.promptVersion || 0) + (currentPrompt ? 1 : 0), currentPrompt, result: correct ? { type: "correct", points } : { type: "skip", points: 0 }, transition: true };
    }
    case "NEXT_PROMPT": return state.phase === "acting" ? { ...state, transition: false, result: null } : state;
    case "END_TURN": {
      if (state.phase !== "acting" || state.transition) return state;
      const teamIndex = state.turnIndex % state.teams.length;
      const teams = state.teams.map((team, i) => i === teamIndex ? { ...team, turnsPlayed: team.turnsPlayed + 1, streak: 0 } : team);
      const finished = state.turnIndex + 1 >= state.game.totalTurns || (state.game.targetScore && teams.some((t) => t.score >= state.game.targetScore));
      const consumePrompt = Boolean(state.currentPrompt && !["correct", "skip"].includes(state.result?.type));
      const nextPromptIndex = state.promptIndex + (consumePrompt ? 1 : 0);
      const currentPrompt = finished ? null : state.deck[nextPromptIndex] || null;
      return { ...state, teams, turnIndex: finished ? state.turnIndex : state.turnIndex + 1, phase: finished ? "results" : "preparation", timeLeft: state.game.turnDuration, turnElapsed: 0, paused: false, promptIndex: nextPromptIndex, promptVersion: (state.promptVersion || 0) + (currentPrompt && currentPrompt !== state.currentPrompt ? 1 : 0), currentPrompt, transition: false, result: { type: action.reason || "ended", points: 0 } };
    }
    case "EXTRA_TIME": {
      const teamIndex = state.turnIndex % state.teams.length;
      const team = state.teams[teamIndex];
      if (state.phase !== "acting" || state.paused || state.transition || !team.inventory.extraTime) return state;
      return { ...state, timeLeft: state.timeLeft + 15, teams: state.teams.map((t, i) => i === teamIndex ? { ...t, inventory: { ...t.inventory, extraTime: 0 } } : t), result: { type: "extra-time", points: 0 } };
    }
    default: return state;
  }
}

export function getMatchStats(state) {
  const correct = state.history.filter((h) => h.outcome === "correct");
  const skips = state.history.filter((h) => h.outcome !== "correct");
  const winnerIds = getWinningTeams(state.teams).map((t) => t.id);
  const playerScores = state.teams.map((team) => ({ name: team.name, score: team.score, correct: team.correctAnswers, skips: team.skippedPrompts, longestStreak: team.longestStreak, accuracy: team.correctAnswers + team.skippedPrompts ? Math.round(team.correctAnswers / (team.correctAnswers + team.skippedPrompts) * 100) : 0 }));
  return { winnerIds, correct: correct.length, skips: skips.length, accuracy: correct.length + skips.length ? Math.round(correct.length / (correct.length + skips.length) * 100) : 0, longestStreak: Math.max(0, ...state.teams.map((t) => t.longestStreak)), fastestCorrect: correct.length ? Math.min(...correct.map((h) => h.elapsed)) : null, playerScores };
}
