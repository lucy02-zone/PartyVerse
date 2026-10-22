
const wordPairs = [
  ["Pizza", "Burger"],
  ["Beach", "Swimming Pool"],
  ["Coffee", "Tea"],
  ["Cat", "Dog"],
  ["Moon", "Sun"],
  ["Doctor", "Nurse"],
  ["Cricket", "Football"],
  ["Pencil", "Pen"],
  ["Train", "Bus"],
  ["Ice Cream", "Cake"],
  ["Apple", "Orange"],
  ["School", "College"],
];

export function createImposterRound(players) {
  if (!Array.isArray(players) || players.length < 3) {
    throw new Error("At least 3 players are required.");
  }

  const shuffledPlayers = [...players];

  for (let i = shuffledPlayers.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledPlayers[i], shuffledPlayers[j]] = [
      shuffledPlayers[j],
      shuffledPlayers[i],
    ];
  }

  const imposterIndex = Math.floor(Math.random() * players.length);
  const wordPair = wordPairs[Math.floor(Math.random() * wordPairs.length)];
  const secretWord = wordPair[0];

  return {
    secretWord,
    imposterId: shuffledPlayers[imposterIndex],
    assignments: shuffledPlayers.map((player, index) => ({
      player,
      role: index === imposterIndex ? "imposter" : "player",
      word: index === imposterIndex ? null : secretWord,
    })),
  };
}

export function getVoteResult(votes, imposterId) {
  const counts = {};

  for (const votedPlayer of Object.values(votes)) {
    counts[votedPlayer] = (counts[votedPlayer] || 0) + 1;
  }

  const maxVotes = Math.max(0, ...Object.values(counts));
  const leaders = Object.keys(counts).filter(
    (player) => counts[player] === maxVotes
  );

  if (leaders.length !== 1) {
    return { winner: "tie", eliminated: null };
  }

  const eliminated = leaders[0];

  return {
    eliminated,
    winner: eliminated === imposterId ? "players" : "imposter",
  };
}
