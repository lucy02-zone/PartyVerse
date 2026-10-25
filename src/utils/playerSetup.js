export const PLAYER_COLOR_PALETTE = [
  { name: "Beige", background: "#D8C3A5", foreground: "#241C17" },
  { name: "Teal", background: "#2A9D8F", foreground: "#102321" },
  { name: "Pine Green", background: "#245B45", foreground: "#FFFFFF" },
  { name: "Deep Aubergine", background: "#3A0F34", foreground: "#FFFFFF" },
  { name: "Sky Blue", background: "#87CEEB", foreground: "#123040" },
  { name: "Terracotta", background: "#C96F4A", foreground: "#24150F" },
];

export function getPlayerColor(index = 0) {
  const safeIndex = Number.isInteger(index) && index >= 0 ? index : 0;
  return PLAYER_COLOR_PALETTE[safeIndex % PLAYER_COLOR_PALETTE.length];
}

export function createDefaultPlayers(minimum = 2, existingPlayers = null) {
  const min = Number.isInteger(minimum) && minimum > 0 ? minimum : 2;
  if (Array.isArray(existingPlayers) && existingPlayers.length >= min) return [...existingPlayers];
  return Array.from({ length: min }, (_, index) => `Player ${index + 1}`);
}

export function removePlayerFromRoster(players, index, minimum = 2) {
  if (!Array.isArray(players) || players.length <= minimum || !Number.isInteger(index) || index < 0 || index >= players.length) {
    return players || [];
  }
  return players.filter((_, playerIndex) => playerIndex !== index);
}

export function validatePlayerName(value, players = [], editingIndex = -1) {
  const name = typeof value === "string" ? value.trim() : "";
  if (!name) return { valid: false, name, message: "Player name cannot be empty." };
  const duplicate = players.some((player, index) => index !== editingIndex && player.toLocaleLowerCase() === name.toLocaleLowerCase());
  if (duplicate) return { valid: false, name, message: "Each player must have a unique name." };
  return { valid: true, name, message: "" };
}
