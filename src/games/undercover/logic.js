const wordPairs = [
  ["Pizza", "Burger"],
  ["Beach", "Lake"],
  ["Coffee", "Tea"],
  ["Cat", "Dog"],
  ["Moon", "Sun"],
  ["Doctor", "Nurse"],
  ["Train", "Bus"],
  ["Apple", "Orange"],
  ["Mountain", "Hill"],
  ["River", "Stream"],
  ["Laptop", "Tablet"],
  ["Rain", "Snow"],
  ["Guitar", "Piano"],
  ["School", "College"],
  ["Book", "Magazine"],
  ["Window", "Door"],
  ["Lion", "Tiger"],
  ["Pencil", "Pen"],
  ["Ocean", "Sea"],
  ["Castle", "Fort"],
  ["Candle", "Lantern"],
  ["Socks", "Shoes"],
  ["Gloves", "Mittens"],
  ["Camera", "Phone"],
  ["Forest", "Jungle"],
];

export function createUndercoverRound(players) {
  if (!Array.isArray(players) || players.length < 3 || players.length > 12) {
    throw new Error("Undercover requires 3 to 12 players.");
  }

  const cleanedPlayers = players.map((player) =>
    typeof player === "string" ? player.trim() : ""
  );

  if (cleanedPlayers.some((player) => !player)) {
    throw new Error("Every player must have a name.");
  }

  const uniqueNames = new Set(cleanedPlayers.map((player) => player.toLowerCase()));
  if (uniqueNames.size !== cleanedPlayers.length) {
    throw new Error("Player names must be unique.");
  }

  const shuffledPlayers = [...cleanedPlayers];
  for (let i = shuffledPlayers.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledPlayers[i], shuffledPlayers[j]] = [
      shuffledPlayers[j],
      shuffledPlayers[i],
    ];
  }

  const undercoverCount = shuffledPlayers.length >= 8 ? 2 : 1;
  const selectedPair = wordPairs[Math.floor(Math.random() * wordPairs.length)];
  const civilianWord = selectedPair[0];
  const undercoverWord = selectedPair[1];

  const assignments = shuffledPlayers.map((player, index) => {
    const role = index < undercoverCount ? "undercover" : "civilian";

    return {
      id: `player-${index + 1}`,
      name: player,
      role,
      word: role === "undercover" ? undercoverWord : civilianWord,
      alive: true,
    };
  });

  return {
    undercoverCount,
    civilianWord,
    undercoverWord,
    assignments,
  };
}

export function getVoteResult(votes, assignments) {
  const counts = {};

  Object.values(votes).forEach((target) => {
    if (!target) return;
    counts[target] = (counts[target] || 0) + 1;
  });

  if (Object.keys(counts).length === 0) {
    return {
      winner: "tie",
      eliminated: null,
      counts,
    };
  }

  const highestVotes = Math.max(...Object.values(counts));
  const leaders = Object.keys(counts).filter(
    (player) => counts[player] === highestVotes
  );

  if (leaders.length > 1) {
    return {
      winner: "tie",
      eliminated: null,
      counts,
    };
  }

  const eliminatedName = leaders[0];
  const eliminatedPlayer = assignments.find((player) => player.name === eliminatedName);

  if (!eliminatedPlayer) {
    return {
      winner: "tie",
      eliminated: null,
      counts,
    };
  }

  const updatedAssignments = assignments.map((player) => ({
    ...player,
    alive: player.name === eliminatedName ? false : player.alive,
  }));

  const roundWinner = getRoundWinner(updatedAssignments);

  return {
    winner: roundWinner ?? "inconclusive",
    eliminated: eliminatedPlayer.name,
    counts,
  };
}

export function getRoundWinner(assignments) {
  const alivePlayers = assignments.filter((player) => player.alive);
  const undercoverAlive = alivePlayers.filter(
    (player) => player.role === "undercover"
  ).length;
  const civiliansAlive = alivePlayers.filter(
    (player) => player.role === "civilian"
  ).length;

  if (undercoverAlive === 0) {
    return "civilian";
  }

  if (undercoverAlive >= civiliansAlive) {
    return "undercover";
  }

  return null;
}
