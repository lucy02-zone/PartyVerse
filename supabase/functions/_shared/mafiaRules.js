export function secureRandomInt(max) {
  if (!Number.isSafeInteger(max) || max < 1 || max > 0x1_0000_0000) {
    throw new Error("Invalid random range.");
  }
  const range = 0x1_0000_0000;
  const ceiling = Math.floor(range / max) * max;
  const sample = new Uint32Array(1);
  do globalThis.crypto.getRandomValues(sample); while (sample[0] >= ceiling);
  return sample[0] % max;
}

export function generateRoomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => alphabet[secureRandomInt(alphabet.length)]).join("");
}

export function assignServerRoles(playerIds) {
  if (!Array.isArray(playerIds)) throw new Error("Mafia needs 5 to 15 unique players.");
  const count = playerIds.length;
  if (count < 5 || count > 15 || new Set(playerIds).size !== count) {
    throw new Error("Mafia needs 5 to 15 unique players.");
  }
  const mafiaCount = count < 7 ? 1 : count < 11 ? 2 : 3;
  const roles = [
    ...Array.from({ length: mafiaCount }, () => "Mafia"),
    "Doctor",
    "Detective",
    ...Array.from({ length: count - mafiaCount - 2 }, () => "Villager"),
  ];
  for (let index = roles.length - 1; index > 0; index -= 1) {
    const swapIndex = secureRandomInt(index + 1);
    [roles[index], roles[swapIndex]] = [roles[swapIndex], roles[index]];
  }
  return playerIds.map((playerId, index) => ({ playerId, role: roles[index] }));
}
