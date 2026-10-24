import { getPromptDeck } from "./prompts.js";

export const DEFAULT_TURN_DURATION = 60;
export const STREAK_MILESTONES = [3, 5, 10];
export const POWER_UPS = ["doublePoints", "extraTime", "freeSkip"];

export function getTiltAction(delta, armed, now, lastAction, threshold = 22, cooldown = 1000) {
  if (Math.abs(delta) < 9) return "rearm";
  if (!armed || now - lastAction < cooldown) return null;
  if (delta <= -threshold) return "correct";
  if (delta >= threshold) return "skip";
  return null;
}

export function normalizeCharadesConfig(config = {}) {
  return {
    roundCount: Number.isInteger(Number(config.roundCount)) ? Math.min(Math.max(Number(config.roundCount), 1), 12) : 3,
    turnDuration: Number.isFinite(Number(config.turnDuration)) ? Math.min(Math.max(Number(config.turnDuration), 15), 180) : DEFAULT_TURN_DURATION,
    teamMode: config.teamMode === "teams" ? "teams" : "individual",
    teamCount: Number.isInteger(Number(config.teamCount)) ? Math.min(Math.max(Number(config.teamCount), 2), 6) : 2,
    era: config.era || null,
    difficulty: config.difficulty || "Mixed",
    targetScore: Number.isInteger(Number(config.targetScore)) && Number(config.targetScore) > 0 ? Number(config.targetScore) : null,
  };
}

export function buildTeamAssignments(players = [], teamMode = "individual", teamCount = 2) {
  const names = Array.from(new Set(players.map((p) => String(p).trim()).filter(Boolean)));
  if (names.length < 3 || names.length > 16) throw new Error("Charades requires 3 to 16 unique players.");
  if (teamMode !== "teams") return names.map((name, i) => ({ id: `team-${i + 1}`, name, players: [name], score: 0, correctAnswers: 0, skippedPrompts: 0, streak: 0, longestStreak: 0, turnsPlayed: 0 }));
  const count = Math.min(Math.max(teamCount, 2), names.length, 6);
  return Array.from({ length: count }, (_, i) => ({ id: `team-${i + 1}`, name: `Team ${i + 1}`, players: [], score: 0, correctAnswers: 0, skippedPrompts: 0, streak: 0, longestStreak: 0, turnsPlayed: 0 })).map((team, i) => ({ ...team, players: names.filter((_, n) => n % count === i) }));
}

export function buildCharadesGame(config = {}) {
  const normalized = normalizeCharadesConfig(config);
  const teams = buildTeamAssignments(config.players || [], normalized.teamMode, normalized.teamCount);
  if (teams.length < 2) throw new Error("Charades needs at least 2 teams or players.");
  const deck = getPromptDeck("Telugu Movies", 1000, { era: normalized.era, difficulty: normalized.difficulty });
  if (!deck.length) throw new Error("No Telugu movies match these filters. Choose another era or difficulty.");
  return { ...normalized, players: teams.flatMap((t) => t.players), teams, deck, totalTurns: teams.length * normalized.roundCount };
}

export function getTurnDetails(game, turnIndex) {
  if (!game?.teams?.length) return null;
  const roundNumber = Math.floor(turnIndex / game.teams.length) + 1;
  const team = game.teams[turnIndex % game.teams.length];
  return { roundNumber, totalRounds: game.roundCount, team, actingPlayer: team.players[(roundNumber - 1) % team.players.length], totalTurns: game.totalTurns };
}

export function getWinningTeams(teams = []) {
  if (!teams.length) return [];
  const top = Math.max(...teams.map((t) => t.score));
  return teams.filter((t) => t.score === top);
}

export function createMatchState(game, random = Math.random) {
  const deck = [...game.deck];
  for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]]; }
  return { game, teams: game.teams.map((t) => ({ ...t, score: 0, correctAnswers: 0, skippedPrompts: 0, streak: 0, longestStreak: 0, turnsPlayed: 0, inventory: { doublePoints: 1, extraTime: 1, freeSkip: 1 } })), turnIndex: 0, phase: "preparation", timeLeft: game.turnDuration, turnElapsed: 0, paused: false, promptIndex: 0, currentPrompt: deck[0] || null, deck, history: [], correctTimes: [], achievements: [], transition: false, result: null };
}

export function matchReducer(state, action) {
  if (!state) return state;
  switch (action.type) {
    case "RESTART": return createMatchState(action.game);
    case "REPLAY_DECK": {
      if (state.currentPrompt || !["acting", "preparation"].includes(state.phase)) return state;
      const deck = [...state.game.deck];
      for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]]; }
      return { ...state, deck, promptIndex: 0, currentPrompt: deck[0] || null, history: [...state.history, { outcome: "deck-replay" }] };
    }
    case "START": return state.phase === "preparation" ? { ...state, phase: "acting", timeLeft: state.game.turnDuration, turnElapsed: 0 } : state;
    case "PAUSE": return state.phase === "acting" ? { ...state, paused: true } : state;
    case "RESUME": return state.phase === "acting" ? { ...state, paused: false } : state;
    case "TICK": {
      if (state.phase !== "acting" || state.paused || state.transition) return state;
      if (state.timeLeft <= 1) return matchReducer({ ...state, timeLeft: 0 }, { type: "END_TURN", reason: "timeout" });
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
      return { ...state, teams, history, achievements, promptIndex, currentPrompt, result: correct ? { type: "correct", points } : { type: "skip", points: 0 }, transition: true };
    }
    case "NEXT_PROMPT": return state.phase === "acting" ? { ...state, transition: false, result: null } : state;
    case "END_TURN": {
      if (state.phase !== "acting" || state.transition) return state;
      const teamIndex = state.turnIndex % state.teams.length;
      const teams = state.teams.map((team, i) => i === teamIndex ? { ...team, turnsPlayed: team.turnsPlayed + 1, streak: 0, inventory: { ...team.inventory, extraTime: Math.max(0, team.inventory.extraTime - (action.extraTime ? 1 : 0)) } } : team);
      const finished = state.turnIndex + 1 >= state.game.totalTurns || (state.game.targetScore && teams.some((t) => t.score >= state.game.targetScore));
      const consumePrompt = Boolean(state.currentPrompt && !["correct", "skip"].includes(state.result?.type));
      const nextPromptIndex = state.promptIndex + (consumePrompt ? 1 : 0);
      return { ...state, teams, turnIndex: finished ? state.turnIndex : state.turnIndex + 1, phase: finished ? "results" : "preparation", timeLeft: state.game.turnDuration, turnElapsed: 0, paused: false, promptIndex: nextPromptIndex, currentPrompt: finished ? null : state.deck[nextPromptIndex] || null, transition: false, result: { type: action.reason || "ended", points: 0 } };
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
