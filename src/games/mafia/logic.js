
const ROLE_CONFIG = {
  5: { Mafia: 1, Doctor: 1, Detective: 1, Villager: 2 },
  6: { Mafia: 1, Doctor: 1, Detective: 1, Villager: 3 },
  7: { Mafia: 2, Doctor: 1, Detective: 1, Villager: 3 },
  8: { Mafia: 2, Doctor: 1, Detective: 1, Villager: 4 },
  9: { Mafia: 2, Doctor: 1, Detective: 1, Villager: 5 },
  10: { Mafia: 2, Doctor: 1, Detective: 1, Villager: 6 },
  11: { Mafia: 3, Doctor: 1, Detective: 1, Villager: 6 },
  12: { Mafia: 3, Doctor: 1, Detective: 1, Villager: 7 },
  13: { Mafia: 3, Doctor: 1, Detective: 1, Villager: 8 },
  14: { Mafia: 3, Doctor: 1, Detective: 1, Villager: 9 },
  15: { Mafia: 3, Doctor: 1, Detective: 1, Villager: 10 },
};

export function getRoleConfiguration(playerCount) {
  if (playerCount < 5 || playerCount > 15) {
    throw new Error("Mafia requires 5 to 15 players.");
  }

  return { ...ROLE_CONFIG[playerCount] };
}

export function assignMafiaRoles(players) {
  if (!Array.isArray(players)) {
    throw new Error("Players must be provided as an array.");
  }

  if (players.length < 5 || players.length > 15) {
    throw new Error("Mafia requires 5 to 15 players.");
  }

  const normalizedPlayers = players.map((player) =>
    typeof player === "string" ? player.trim() : ""
  );

  if (normalizedPlayers.some((player) => !player)) {
    throw new Error("Every player must have a name.");
  }

  const uniqueNames = new Set(
    normalizedPlayers.map((player) => player.toLowerCase())
  );

  if (uniqueNames.size !== normalizedPlayers.length) {
    throw new Error("Player names must be unique.");
  }

  const roleCounts = getRoleConfiguration(players.length);

  const roles = Object.entries(roleCounts).flatMap(([role, count]) =>
    Array(count).fill(role)
  );

  // Randomize the roles before assigning them.
  for (let i = roles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [roles[i], roles[j]] = [roles[j], roles[i]];
  }

  return normalizedPlayers.map((name, index) => ({
    id: `player-${index + 1}`,
    name,
    role: roles[index],
    alive: true,
  }));
}

export function getMafiaTeam(assignedPlayers) {
  return assignedPlayers.filter((player) => player.role === "Mafia");
}

export function getAlivePlayers(assignedPlayers) {
  return assignedPlayers.filter((player) => player.alive);
}
