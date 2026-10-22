export function createMafiaRound(players) {
  if (!Array.isArray(players) || players.length < 5) {
    throw new Error("At least 5 players are required.");
  }

  const shuffledPlayers = [...players];

  for (let i = shuffledPlayers.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));

    [shuffledPlayers[i], shuffledPlayers[j]] = [
      shuffledPlayers[j],
      shuffledPlayers[i],
    ];
  }

  const mafiaCount = shuffledPlayers.length >= 8 ? 2 : 1;
  const mafiaPlayers = shuffledPlayers.slice(0, mafiaCount);

  return {
    mafiaCount,
    mafiaPlayers,
    assignments: shuffledPlayers.map((player) => ({
      player,
      role: mafiaPlayers.includes(player) ? "mafia" : "villager",
    })),
  };
}

export function getVoteResult(votes, mafiaPlayers) {
  const counts = {};

  for (const votedPlayer of Object.values(votes)) {
    if (!votedPlayer) continue;
    counts[votedPlayer] = (counts[votedPlayer] || 0) + 1;
  }

  if (Object.keys(counts).length === 0) {
    return { winner: "tie", eliminated: null };
  }

  const maxVotes = Math.max(...Object.values(counts));
  const leaders = Object.keys(counts).filter(
    (player) => counts[player] === maxVotes
  );

  if (leaders.length !== 1) {
    return { winner: "tie", eliminated: null };
  }

  const eliminated = leaders[0];
  const isMafia = mafiaPlayers.includes(eliminated);

  return {
    eliminated,
    winner: isMafia ? "villagers" : "mafia",
  };
}
