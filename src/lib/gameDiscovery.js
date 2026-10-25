export const GAME_FILTERS = [
  { id: "all", label: "All games" },
  { id: "bluffing", label: "Bluffing" },
  { id: "social-deduction", label: "Social deduction" },
  { id: "word-games", label: "Word games" },
  { id: "trivia", label: "Trivia" },
  { id: "acting", label: "Acting & guessing" },
];

export const GAME_TAGS = {
  imposter: ["bluffing", "social-deduction"],
  mafia: ["social-deduction"],
  undercover: ["word-games", "social-deduction"],
  quiz: ["trivia"],
  charades: ["acting"],
};

export function filterGames(games, filterId) {
  if (filterId === "all") return games;
  return games.filter((game) => GAME_TAGS[game.id]?.includes(filterId));
}

export function chooseRandomGame(games, random = Math.random) {
  if (!Array.isArray(games) || games.length === 0) return null;
  const value = random();
  const index = Math.min(games.length - 1, Math.max(0, Math.floor(value * games.length)));
  return games[index];
}

export function getGamePath(game) {
  if (!game?.id) return "/";
  return game.id === "mafia" ? "/play/mafia/online" : `/game/${game.id}`;
}
