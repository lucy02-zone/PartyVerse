export function quizResultSummary(winners, leaderboard) {
  const winnerText = winners.length > 1 ? `${winners.join(", ")} tied` : `${winners[0] || "The group"} won`;
  const scores = leaderboard.map((player) => `${player.name}: ${player.score} points`).join(" · ");
  return `PartyVerse Quiz Battle · ${winnerText}${scores ? ` · ${scores}` : ""}`;
}

export function charadesResultSummary(winners, teams) {
  const winnerText = winners.length > 1 ? `${winners.map((team) => team.name).join(" & ")} tied` : `${winners[0]?.name || "The group"} won`;
  return `PartyVerse Charades · ${winnerText} · ${teams.map((team) => `${team.name}: ${team.score}`).join(" · ")}`;
}

export function undercoverResultSummary(result) {
  const outcome = result.winner === "civilian" ? "Civilians won" : result.winner === "undercover" ? "Undercover won" : result.winner === "tie" ? "The vote was tied" : "Round complete";
  return `PartyVerse Undercover · ${outcome}${result.eliminated ? ` · ${result.eliminated} was eliminated` : ""}`;
}

export function imposterResultSummary(result, voteCount) {
  const outcome = result.winner === "players" ? "The group caught the imposter" : result.winner === "imposter" ? "The imposter escaped the vote" : "The vote was tied";
  return `PartyVerse Find the Imposter · ${outcome} · ${voteCount} votes cast`;
}
