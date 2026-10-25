export const MISSION_CATEGORIES = ["Social", "Sneaky", "Strategy", "Funny"];
export const DIFFICULTIES = ["Casual", "Standard", "Chaos"];
export const SCORING_RULES = Object.freeze({ casualMission: 1, standardMission: 2, chaosMission: 3, correctAccusation: 3, correctMissionHolderGuess: 1, incorrectAccusationPenalty: -1 });
export const ACCUSATION_REWARD = SCORING_RULES.correctAccusation;
export const INCORRECT_ACCUSATION_PENALTY = Math.abs(SCORING_RULES.incorrectAccusationPenalty);

const definitions = [
  ["ask-question", "Invite a question", "Get another player to ask you a question.", "Social", "Casual", "self-report"],
  ["agree-suggestion", "Build consensus", "Convince two players to agree with a suggestion you make.", "Social", "Standard", "self-report"],
  ["repeat-phrase", "Echo chamber", "Get someone to repeat the harmless phrase “what a plot twist”.", "Social", "Casual", "self-report"],
  ["two-options", "The deciding vote", "Get the group to choose between two options you propose.", "Social", "Standard", "self-report"],
  ["hypothetical", "Big what-if", "Start a conversation about a funny hypothetical.", "Social", "Casual", "self-report"],
  ["support-idea", "Quiet support", "Get another player to support your idea without asking directly.", "Social", "Chaos", "self-report"],
  ["compliment-choice", "Good taste", "Get someone to compliment a choice you made in the game.", "Social", "Standard", "self-report"],
  ["ask-for-advice", "Trusted advisor", "Get a player to give you advice about a harmless choice.", "Social", "Casual", "self-report"],
  ["group-vote", "Call the vote", "Get everyone to vote on a small group decision.", "Social", "Standard", "self-report"],
  ["shared-memory", "Remember when", "Get two players to share a favorite fictional character.", "Social", "Casual", "self-report"],
  ["change-subject", "Smooth pivot", "Naturally change the conversation topic once.", "Social", "Chaos", "self-report"],
  ["nickname", "Name game", "Get someone to suggest a nickname for a game piece or team.", "Social", "Casual", "self-report"],
  ["phrase-naturally", "Casual phrase", "Use the word “marvelous” naturally three times.", "Sneaky", "Standard", "self-report"],
  ["ask-time", "What time is it", "Get someone to check or mention the time.", "Sneaky", "Casual", "self-report"],
  ["borrow-pen", "Borrowed tool", "Get someone to pass you a pen or another game item.", "Sneaky", "Standard", "self-report"],
  ["say-color", "Color commentary", "Get a player to name a color during conversation.", "Sneaky", "Casual", "self-report"],
  ["offer-choice", "Two doors", "Offer a choice and get someone to pick one.", "Sneaky", "Standard", "self-report"],
  ["ask-repeat", "Could you repeat that", "Get someone to repeat a detail they just said.", "Sneaky", "Chaos", "self-report"],
  ["mention-weather", "Forecast", "Get the conversation to mention the weather.", "Sneaky", "Casual", "self-report"],
  ["seat-count", "Head count", "Ask the group to count something in the room.", "Sneaky", "Standard", "self-report"],
  ["use-name", "Name drop", "Say three different players’ names in one minute.", "Sneaky", "Standard", "self-report"],
  ["start-applause", "Polite applause", "Start a brief round of applause for a game moment.", "Sneaky", "Chaos", "self-report"],
  ["gesture-thanks", "Gratitude", "Thank two different players for something small.", "Sneaky", "Casual", "self-report"],
  ["avoid-accusation", "Stay under the radar", "Finish the round without a successful accusation against you.", "Sneaky", "Chaos", "game-verified"],
  ["guess-mission", "Good read", "Correctly guess another player’s mission in an accusation.", "Strategy", "Chaos", "game-verified"],
  ["protect-token", "Save your spark", "Finish the round with at least one accusation token unused.", "Strategy", "Standard", "game-verified"],
  ["accuse-correct", "Sharp instincts", "Make a correct accusation this round.", "Strategy", "Chaos", "game-verified"],
  ["no-claim", "Patient planner", "Wait until the final half of the timed round, then submit your mission claim.", "Strategy", "Standard", "game-verified"],
  ["support-claim", "Good sport", "Support another player’s mission claim during the round recap.", "Strategy", "Casual", "self-report"],
  ["event-prompt", "Prompt master", "Get the group to answer the round’s public conversation prompt.", "Strategy", "Casual", "self-report"],
  ["avoid-repeat", "Fresh approach", "Complete your mission without repeating another player’s exact wording.", "Strategy", "Chaos", "self-report"],
  ["suspicion-nominee", "Under suspicion", "Be the player the group privately suspects is making the most progress.", "Strategy", "Chaos", "game-verified"],
  ["make-laugh", "Lighten the room", "Get at least one player to laugh with a harmless observation.", "Funny", "Casual", "self-report"],
  ["silly-debate", "Serious business", "Start a playful debate about a silly topic.", "Funny", "Standard", "self-report"],
  ["dramatic-intro", "Grand entrance", "Introduce a turn like a dramatic game-show host.", "Funny", "Casual", "self-report"],
  ["invent-title", "Award season", "Give someone a playful, kind award title.", "Funny", "Standard", "self-report"],
  ["animal-sound", "Wild clue", "Work a gentle animal sound into the conversation.", "Funny", "Chaos", "self-report"],
  ["fake-headline", "Breaking news", "Invent a friendly one-line headline about the game.", "Funny", "Standard", "self-report"],
  ["wrong-answer", "Confidently curious", "Ask a deliberately silly but harmless question.", "Funny", "Casual", "self-report"],
  ["story-chain", "One sentence each", "Get two players to add a sentence to a made-up story.", "Funny", "Chaos", "self-report"],
  ["name-tune", "Theme song", "Hum a short tune and get someone to guess its mood.", "Funny", "Standard", "self-report"],
  ["reverse-choice", "Unexpected pick", "Persuade the group to choose the less obvious of two silly options.", "Funny", "Chaos", "self-report"],
];

export const missions = definitions.map(([id, title, objective, category, difficulty, validation]) => ({
  id, title, objective, category, difficulty, validation,
  points: difficulty === "Casual" ? SCORING_RULES.casualMission : difficulty === "Standard" ? SCORING_RULES.standardMission : SCORING_RULES.chaosMission,
  confirmation: validation === "self-report" ? "Player claim, reviewed at round end" : "Validated from game events",
  hint: category === "Social" ? "Keep it natural and low-pressure." : "Let the conversation do the work.",
  restriction: "Keep it kind, optional, and safe. Never ask for personal information or physical contact.",
}));

export const ROUND_EVENTS = [
  { id: "twist", title: "The Twist", prompt: "What tiny invention would make everyday life more delightful?", description: "Invite the group to answer this public conversation prompt." },
  { id: "suspicion", title: "The Suspicion Round", prompt: "Privately nominate the player you think is making the most progress.", description: "Each player can privately nominate one other player. The most-nominated player can earn mission points if they carry a Suspicion mission." },
];

function randomIndex(length, random) { return Math.max(0, Math.min(length - 1, Math.floor(random() * length))); }
export function validateUndercoverPlayers(players) {
  if (!Array.isArray(players) || players.length < 3 || players.length > 12) return { valid: false, message: "Undercover needs between 3 and 12 players." };
  const names = players.map((player) => typeof player === "string" ? player.trim() : "");
  if (names.some((name) => !name)) return { valid: false, message: "Every player needs a name." };
  if (new Set(names.map((name) => name.toLocaleLowerCase())).size !== names.length) return { valid: false, message: "Player names must be unique." };
  return { valid: true, players: names };
}
function getMissionPools(options = {}) {
  const categories = Array.isArray(options.categories) && options.categories.length ? options.categories : MISSION_CATEGORIES;
  const allowedDifficulties = options.difficulty === "Casual" ? ["Casual"] : options.difficulty === "Chaos" ? ["Standard", "Chaos"] : ["Casual", "Standard", "Chaos"];
  const eventAvailable = (mission) => {
    if (options.events === false && ["event-prompt", "suspicion-nominee"].includes(mission.id)) return false;
    if (Number(options.duration) === 0 && mission.id === "no-claim") return false;
    if (options.round && options.events !== false) {
      if (options.round % 2 === 1 && mission.id === "suspicion-nominee") return false;
      if (options.round % 2 === 0 && mission.id === "event-prompt") return false;
    }
    return true;
  };
  const selectedPool = missions.filter((mission) => categories.includes(mission.category) && allowedDifficulties.includes(mission.difficulty) && eventAvailable(mission));
  const fallbackPool = missions.filter((mission) => allowedDifficulties.includes(mission.difficulty) && eventAvailable(mission));
  return { selectedPool, fallbackPool };
}
export function assignMissions(players, options = {}, random = Math.random) {
  const validation = validateUndercoverPlayers(players);
  if (!validation.valid) throw new Error(validation.message);
  const { selectedPool, fallbackPool } = getMissionPools(options);
  const usedFallback = selectedPool.length < validation.players.length;
  const pool = usedFallback ? fallbackPool : selectedPool;
  if (pool.length < validation.players.length) throw new Error("Not enough unique missions for this setup.");
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = randomIndex(i + 1, random); [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const selected = shuffled.slice(0, validation.players.length);
  return validation.players.map((name, index) => ({
    id: `player-${index + 1}`, name, mission: selected[index], score: 0,
    tokens: Math.max(1, Math.min(5, Number(options.tokens) || 2)), claimed: false, claimStatus: "pending", alive: true,
  }));
}
export function createUndercoverGame(players, options = {}, random = Math.random) {
  const rounds = Math.min(8, Math.max(1, Number(options.rounds) || 3));
  const requestedDuration = Number(options.duration);
  const duration = Number.isFinite(requestedDuration) ? Math.max(0, requestedDuration) : 180;
  const eventEnabled = options.events !== false;
  const missionOptions = { ...options, rounds, round: 1, events: eventEnabled };
  const assignments = assignMissions(players, missionOptions, random);
  const { selectedPool } = getMissionPools(missionOptions);
  return {
    assignments, deckFallback: selectedPool.length < assignments.length, round: 1, rounds, phase: "reveal", currentIndex: 0, revealed: false,
    seconds: duration, timerEnabled: duration > 0,
    claims: [], accusations: [], suspicions: [], events: [], eventEnabled,
    activeEvent: eventEnabled ? ROUND_EVENTS[0] : null, twistCompleted: false, status: "playing",
    config: { difficulty: options.difficulty || "Standard", categories: options.categories?.length ? options.categories : MISSION_CATEGORIES, tokens: Math.max(1, Math.min(5, Number(options.tokens) || 2)), duration },
  };
}
export function setMissionClaim(game, playerId, claimed = true) {
  const player = game.assignments.find((entry) => entry.id === playerId);
  if (!player || game.phase !== "active" || player.claimStatus === "verified" || player.claimStatus === "failed") return game;
  if (!claimed) return { ...game, assignments: game.assignments.map((entry) => entry.id === playerId ? { ...entry, claimed: false, claimStatus: "pending" } : entry), claims: game.claims.filter((claim) => claim.playerId !== playerId) };
  if (player.claimed) return game;
  const claim = { playerId, round: game.round, status: "claimed", points: player.mission.points, secondsRemaining: game.seconds };
  return { ...game, claims: [...game.claims, claim], assignments: game.assignments.map((entry) => entry.id === playerId ? { ...entry, claimed: true, claimStatus: claim.status } : entry) };
}
export function validateAccusation(game, { accuserId, targetId, missionId }) {
  const accuser = game.assignments.find((entry) => entry.id === accuserId);
  const target = game.assignments.find((entry) => entry.id === targetId);
  if (game.phase !== "active") return { valid: false, reason: "Accusations are only open during active play." };
  if (!accuser || !target) return { valid: false, reason: "Choose players from this game." };
  if (accuserId === targetId) return { valid: false, reason: "You cannot accuse yourself." };
  if (!missionId || !missions.some((mission) => mission.id === missionId)) return { valid: false, reason: "Choose a mission guess." };
  if (accuser.tokens <= 0) return { valid: false, reason: "No accusation tokens remain." };
  if (game.accusations.some((entry) => entry.accuserId === accuserId && entry.targetId === targetId)) return { valid: false, reason: "You already accused this player this round." };
  return { valid: true };
}
export function submitAccusation(game, payload) {
  const validation = validateAccusation(game, payload);
  if (!validation.valid) return { game, error: validation.reason };
  const target = game.assignments.find((entry) => entry.id === payload.targetId);
  const correct = target.mission.id === payload.missionId;
  const accusation = { ...payload, round: game.round, correct, resolved: true };
  const assignments = game.assignments.map((player) => player.id === payload.accuserId ? { ...player, tokens: player.tokens - 1 } : player);
  return { game: { ...game, assignments, accusations: [...game.accusations, accusation] }, error: "" };
}
export function submitSuspicion(game, voterId, targetId) {
  if (!game.activeEvent || game.activeEvent.id !== "suspicion" || game.phase !== "active") return { game, error: "The suspicion event is not active." };
  if (!game.assignments.some((player) => player.id === voterId) || !game.assignments.some((player) => player.id === targetId) || voterId === targetId) return { game, error: "Choose another player in this game." };
  if (game.suspicions.some((entry) => entry.voterId === voterId)) return { game, error: "Your nomination is already recorded." };
  return { game: { ...game, suspicions: [...game.suspicions, { voterId, targetId }] }, error: "" };
}
export function verifyClaim(game, playerId, approved) {
  const player = game.assignments.find((entry) => entry.id === playerId);
  if (!player || !player.claimed || player.claimStatus !== "claimed" || player.mission.validation === "game-verified") return game;
  const status = approved ? "verified" : "disputed";
  return { ...game, assignments: game.assignments.map((entry) => entry.id === playerId ? { ...entry, claimStatus: status, score: entry.score + (approved ? player.mission.points : 0) } : entry), claims: game.claims.map((claim) => claim.playerId === playerId ? { ...claim, status } : claim) };
}
export function finishRound(game) {
  if (game.phase !== "active") return game;
  const correct = (playerId) => game.accusations.some((entry) => entry.accuserId === playerId && entry.correct);
  const suspectVotes = new Map();
  game.suspicions.forEach(({ targetId }) => suspectVotes.set(targetId, (suspectVotes.get(targetId) || 0) + 1));
  const topSuspicion = Math.max(0, ...suspectVotes.values());
  let assignments = game.assignments.map((player) => {
    if (!player.mission || player.mission.validation !== "game-verified" || player.claimStatus === "verified") return player;
    const verified = {
      "avoid-accusation": !game.accusations.some((entry) => entry.targetId === player.id && entry.correct),
      "guess-mission": correct(player.id),
      "accuse-correct": correct(player.id),
      "protect-token": player.tokens > 0,
      "event-prompt": game.twistCompleted,
      "suspicion-nominee": suspectVotes.get(player.id) === topSuspicion && topSuspicion > 0,
      "no-claim": game.timerEnabled && game.claims.some((claim) => claim.playerId === player.id && claim.secondsRemaining <= game.config.duration / 2),
    }[player.mission.id] || false;
    if (!verified) return { ...player, claimStatus: "failed" };
    return { ...player, claimed: true, claimStatus: "verified", score: player.score + player.mission.points };
  });
  assignments = assignments.map((player) => player.mission?.validation === "self-report" && !player.claimed ? { ...player, claimStatus: "failed" } : player);
  assignments = assignments.map((player) => {
    const accusationDelta = game.accusations.reduce((total, item) => {
      if (item.accuserId === player.id) return total + (item.correct ? ACCUSATION_REWARD : -INCORRECT_ACCUSATION_PENALTY);
      if (item.targetId === player.id && item.correct) return total + SCORING_RULES.correctMissionHolderGuess;
      return total;
    }, 0);
    return accusationDelta ? { ...player, score: player.score + accusationDelta } : player;
  });
  const successfulAccusations = game.accusations.filter((item) => item.correct).length;
  const recap = { round: game.round, event: game.activeEvent ? { ...game.activeEvent } : null, claims: game.claims.map((claim) => ({ ...claim })), accusations: game.accusations.map((accusation) => ({ ...accusation })), suspicions: game.suspicions.map((entry) => ({ ...entry })), missions: assignments.map((player) => ({ playerId: player.id, player: player.name, missionId: player.mission.id, mission: player.mission.title, completed: player.claimStatus === "verified" })), successfulAccusations };
  return { ...game, assignments, phase: "recap", seconds: 0, events: [...game.events, recap] };
}
export function continueGame(game, random = Math.random) {
  if (game.phase !== "recap") return game;
  if (game.round >= game.rounds) return { ...game, phase: "results", status: "ended" };
  const nextRound = game.round + 1;
  const fresh = assignMissions(game.assignments.map((player) => player.name), { ...game.config, rounds: game.rounds, round: nextRound, events: game.eventEnabled }, random);
  const nextAssignments = fresh.map((player, index) => ({ ...game.assignments[index], mission: player.mission, claimed: false, claimStatus: "pending" }));
  const { selectedPool } = getMissionPools({ ...game.config, round: nextRound, events: game.eventEnabled });
  return { ...game, assignments: nextAssignments, deckFallback: selectedPool.length < fresh.length, round: nextRound, currentIndex: 0, revealed: false, seconds: game.config.duration, phase: "reveal", claims: [], accusations: [], suspicions: [], activeEvent: game.eventEnabled ? ROUND_EVENTS[(nextRound - 1) % ROUND_EVENTS.length] : null, twistCompleted: false };
}
export function getLeaderboard(assignments) {
  const sorted = [...assignments].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  return sorted.reduce((ranked, player, index) => [...ranked, { ...player, rank: index > 0 && player.score === sorted[index - 1].score ? ranked[index - 1].rank : index + 1 }], []);
}
export function buildUndercoverSummary(game) {
  const leaderboard = getLeaderboard(game.assignments);
  const top = leaderboard[0]?.score;
  const winners = leaderboard.filter((player) => player.score === top).map((player) => player.name);
  return { winners, leaderboard: leaderboard.map(({ id, name, score, rank, mission, claimStatus }) => ({ id, name, score, rank, mission: mission?.title, claimStatus })), rounds: game.events.length, recap: game.events, accusations: game.events.flatMap((round) => round.accusations).map(({ accuserId, targetId, missionId, correct }) => ({ accuser: game.assignments.find((player) => player.id === accuserId)?.name, target: game.assignments.find((player) => player.id === targetId)?.name, guess: missions.find((mission) => mission.id === missionId)?.title, correct })), status: game.status };
}
export function resetForReplay(game, random = Math.random) {
  const fresh = createUndercoverGame(game.assignments.map((player) => player.name), { ...game.config, rounds: game.rounds, events: game.eventEnabled }, random);
  return { ...fresh, assignments: fresh.assignments.map((player, index) => ({ ...player, id: game.assignments[index].id })) };
}
