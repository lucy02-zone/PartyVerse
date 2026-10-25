import { describe, expect, it } from "vitest";
import {
  ACCUSATION_REWARD, assignMissions, buildUndercoverSummary, continueGame, createUndercoverGame, DIFFICULTIES,
  finishRound, getLeaderboard, missions, resetForReplay, setMissionClaim, submitAccusation,
  submitSuspicion, validateAccusation, validateUndercoverPlayers, verifyClaim,
} from "./logic.js";

const names = ["Ari", "Bo", "Cam"];
const deterministic = () => 0.37;
const activeGame = (overrides = {}) => ({ ...createUndercoverGame(names, { duration: 120, rounds: 2, events: true }, deterministic), phase: "active", ...overrides });

describe("Undercover mission game rules", () => {
  it("validates supported player counts, trims names, and rejects case-insensitive duplicates", () => {
    expect(validateUndercoverPlayers([" Ari ", "Bo", "Cam"])).toMatchObject({ valid: true, players: ["Ari", "Bo", "Cam"] });
    expect(validateUndercoverPlayers(["Ari", " ari ", "Cam"]).valid).toBe(false);
    expect(validateUndercoverPlayers(["A", "B"]).valid).toBe(false);
    expect(validateUndercoverPlayers(Array.from({ length: 13 }, (_, i) => `P${i}`)).valid).toBe(false);
  });

  it("assigns unique structured missions and honors injected random sources", () => {
    const first = assignMissions(names, { difficulty: "Standard", categories: ["Social", "Funny"] }, deterministic);
    const second = assignMissions(names, { difficulty: "Standard", categories: ["Social", "Funny"] }, deterministic);
    expect(first.map((player) => player.mission.id)).toEqual(second.map((player) => player.mission.id));
    expect(new Set(first.map((player) => player.mission.id)).size).toBe(names.length);
    expect(first.every((player) => ["Social", "Funny"].includes(player.mission.category))).toBe(true);
    expect(missions.every((mission) => DIFFICULTIES.includes(mission.difficulty))).toBe(true);
    expect(missions.length).toBeGreaterThanOrEqual(40);
  });

  it("falls back to enough safe missions when a selected deck is too small", () => {
    const assigned = assignMissions(names, { difficulty: "Casual", categories: ["Social"] }, deterministic);
    expect(new Set(assigned.map((player) => player.mission.id)).size).toBe(3);
    const widerGroup = createUndercoverGame(Array.from({ length: 12 }, (_, index) => `Player ${index + 1}`), { difficulty: "Chaos", categories: ["Funny"], rounds: 1 }, deterministic);
    expect(widerGroup.deckFallback).toBe(true);
  });

  it("records a claim once and awards self-reported points only after approval", () => {
    let game = activeGame();
    const player = game.assignments.find((entry) => entry.mission.validation === "self-report");
    game = setMissionClaim(game, player.id);
    const scoreAfterClaim = game.assignments.find((entry) => entry.id === player.id).score;
    expect(scoreAfterClaim).toBe(0);
    expect(setMissionClaim(game, player.id)).toEqual(game);
    game = verifyClaim(game, player.id, true);
    const verifiedScore = game.assignments.find((entry) => entry.id === player.id).score;
    expect(verifiedScore).toBe(player.mission.points);
    expect(verifyClaim(game, player.id, true).assignments.find((entry) => entry.id === player.id).score).toBe(verifiedScore);
  });

  it("verifies recorded event missions once and leaves unsuccessful claims unresolved", () => {
    let game = activeGame();
    game.assignments = game.assignments.map((player, index) => ({ ...player, mission: { ...player.mission, id: index === 0 ? "event-prompt" : "avoid-accusation", validation: "game-verified", points: 2 } }));
    game.twistCompleted = true;
    const resolved = finishRound(game);
    expect(resolved.assignments[0]).toMatchObject({ claimStatus: "verified", score: 2 });
    expect(resolved.assignments[1]).toMatchObject({ claimStatus: "verified", score: 2 });
  });

  it("rejects invalid accusations and prevents self, duplicate, empty, and exhausted-token attempts", () => {
    const game = activeGame();
    const [accuser, target] = game.assignments;
    expect(validateAccusation(game, { accuserId: accuser.id, targetId: accuser.id, missionId: missions[0].id }).valid).toBe(false);
    expect(validateAccusation(game, { accuserId: accuser.id, targetId: target.id, missionId: "" }).valid).toBe(false);
    expect(validateAccusation(game, { accuserId: "other", targetId: target.id, missionId: missions[0].id }).valid).toBe(false);
    let outcome = submitAccusation(game, { accuserId: accuser.id, targetId: target.id, missionId: missions[0].id });
    expect(outcome.error).toBe("");
    expect(validateAccusation(outcome.game, { accuserId: accuser.id, targetId: target.id, missionId: missions[0].id }).valid).toBe(false);
    outcome.game.assignments[0].tokens = 0;
    expect(validateAccusation(outcome.game, { accuserId: accuser.id, targetId: game.assignments[2].id, missionId: missions[0].id }).reason).toMatch(/tokens/);
  });

  it("resolves correct and incorrect guesses, tokens, penalties, and rewards at round review", () => {
    let game = activeGame();
    const [accuser, target, third] = game.assignments;
    const correct = submitAccusation(game, { accuserId: accuser.id, targetId: target.id, missionId: target.mission.id });
    expect(correct.game.assignments[0].score).toBe(0); // hidden until the recap
    expect(correct.game.assignments[0].tokens).toBe(1);
    game = finishRound(correct.game);
    expect(game.assignments.find((player) => player.id === accuser.id).score).toBe(ACCUSATION_REWARD);
    expect(game.assignments.find((player) => player.id === target.id).score).toBe(1);

    let missed = submitAccusation(activeGame(), { accuserId: third.id, targetId: target.id, missionId: missions.find((entry) => entry.id !== target.mission.id).id });
    missed.game = finishRound(missed.game);
    expect(missed.game.assignments.find((player) => player.id === third.id).score).toBe(-1);
  });

  it("records private suspicion nominations once and resolves claims from game actions", () => {
    let game = activeGame();
    game.activeEvent = { id: "suspicion" };
    const [voter, target] = game.assignments;
    game.assignments = game.assignments.map((player) => player.id === target.id ? { ...player, mission: { ...player.mission, id: "suspicion-nominee", validation: "game-verified" } } : player);
    game = setMissionClaim(game, target.id);
    const nomination = submitSuspicion(game, voter.id, target.id);
    expect(nomination.error).toBe("");
    expect(submitSuspicion(nomination.game, voter.id, target.id).error).toMatch(/already/);
    const resolved = finishRound(nomination.game);
    expect(resolved.assignments.find((player) => player.id === target.id).claimStatus).toBe("verified");
  });

  it("handles multiple rounds, stable deterministic ties, and fresh replay assignments", () => {
    let game = activeGame();
    game = finishRound(game);
    game = continueGame(game, deterministic);
    expect(game.phase).toBe("reveal");
    expect(game.round).toBe(2);
    expect(new Set(game.assignments.map((player) => player.mission.id)).size).toBe(3);
    const tied = getLeaderboard(game.assignments.map((player) => ({ ...player, score: 4 })));
    expect(tied.map((player) => player.rank)).toEqual([1, 1, 1]);
    game = finishRound({ ...game, phase: "active", assignments: game.assignments.map((player) => ({ ...player, score: 4, mission: { ...player.mission, validation: "self-report" }, claimStatus: "disputed" })) });
    game = continueGame(game, deterministic);
    expect(game.phase).toBe("results");
    expect(buildUndercoverSummary(game).winners).toHaveLength(3);
    const replay = resetForReplay(game, deterministic);
    expect(replay.phase).toBe("reveal");
    expect(replay.round).toBe(1);
    expect(replay.assignments.every((player) => player.score === 0 && player.tokens === 2 && !player.claimed)).toBe(true);
  });

  it("supports timer-free play and disabled round events", () => {
    const game = createUndercoverGame(names, { duration: 0, events: false }, deterministic);
    expect(game.timerEnabled).toBe(false);
    expect(game.seconds).toBe(0);
    expect(game.activeEvent).toBeNull();
    expect(game.assignments.every((player) => !["event-prompt", "suspicion-nominee", "no-claim"].includes(player.mission.id))).toBe(true);
  });
});
