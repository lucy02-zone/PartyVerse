import { describe, expect, it } from "vitest";
import { buildCharadesGame, createMatchState, getTiltAction, getTurnDetails, getWinningTeams, matchReducer } from "./logic.js";
import { CHARADES_PROMPTS, getPromptDeck } from "./prompts.js";

const game = (overrides = {}) => buildCharadesGame({ players: ["A", "B", "C"], roundCount: 2, ...overrides });
const started = (g = game()) => matchReducer(createMatchState(g, () => 0), { type: "START" });

describe("Telugu Charades", () => {
  it("uses unique Telugu movie prompts and respects filters", () => {
    expect(CHARADES_PROMPTS.length).toBeGreaterThanOrEqual(150);
    expect(new Set(CHARADES_PROMPTS.map((x) => x.prompt)).size).toBe(CHARADES_PROMPTS.length);
    expect(getPromptDeck("Telugu Movies", 1000, { era: [2000, 2009] }).every((x) => x.year >= 2000 && x.year <= 2009)).toBe(true);
    expect(getPromptDeck("Telugu Movies", 1000, { difficulty: "Hard" }).every((x) => x.difficulty === "Hard")).toBe(true);
  });
  it("classifies tilt thresholds, cooldown, and neutral re-arming", () => {
    expect(getTiltAction(-22, true, 2000, 0)).toBe("correct");
    expect(getTiltAction(22, true, 2000, 0)).toBe("skip");
    expect(getTiltAction(22, false, 2000, 0)).toBeNull();
    expect(getTiltAction(22, true, 500, 0)).toBeNull();
    expect(getTiltAction(8, false, 2000, 0)).toBe("rearm");
  });
  it("scores a correct answer once and keeps the same player turn", () => {
    const s = started(); const next = matchReducer(s, { type: "ANSWER", correct: true });
    expect(next.teams[0].score).toBe(1); expect(next.turnIndex).toBe(0);
    expect(matchReducer(next, { type: "ANSWER", correct: true })).toBe(next);
  });
  it("advances the prompt color version only when a new prompt becomes active", () => {
    const s = started();
    expect(s.promptVersion).toBe(0);
    const answered = matchReducer(s, { type: "ANSWER", correct: true });
    expect(answered.promptVersion).toBe(1);
    expect(matchReducer(answered, { type: "ANSWER", correct: false }).promptVersion).toBe(1);
    const ready = matchReducer(answered, { type: "NEXT_PROMPT" });
    expect(ready.promptVersion).toBe(1);
    const expired = matchReducer({ ...ready, timeLeft: 1 }, { type: "TICK" });
    expect(expired.promptVersion).toBe(2);
    expect(matchReducer(expired, { type: "RESTART", game: game() }).promptVersion).toBe(0);
  });
  it("initializes power-ups and uses live match teams for the acting turn", () => {
    const g = game();
    const s = createMatchState({ ...g, teams: g.teams.map((team) => Object.fromEntries(Object.entries(team).filter(([key]) => key !== "inventory"))) }, () => 0);
    expect(getTurnDetails(s.game, 0, s.teams).team.inventory.doublePoints).toBe(1);
    const acting = matchReducer(s, { type: "START" });
    expect(acting.phase).toBe("acting");
    expect(acting.currentPrompt).toBe(s.deck[0]);
  });
  it("recovers safely when legacy match state has no inventory object", () => {
    const s = started();
    const legacy = { ...s, teams: s.teams.map((team) => Object.fromEntries(Object.entries(team).filter(([key]) => key !== "inventory"))) };
    expect(() => matchReducer(legacy, { type: "ANSWER", correct: true })).not.toThrow();
    const next = matchReducer(legacy, { type: "ANSWER", correct: true, doublePoints: true });
    expect(next.teams[0].score).toBe(2);
    expect(next.teams[0].inventory.doublePoints).toBe(0);
  });
  it("skips without scoring and moves to the next prompt", () => {
    const s = started(); const next = matchReducer(s, { type: "ANSWER", correct: false });
    expect(next.teams[0].score).toBe(0); expect(next.teams[0].skippedPrompts).toBe(1);
    expect(next.promptVersion).toBe(1);
    expect(next.currentPrompt.prompt).not.toBe(s.currentPrompt.prompt);
  });
  it("advances only on end turn and resets on restart", () => {
    const s = started(); const used = matchReducer(s, { type: "ANSWER", correct: true, doublePoints: true });
    const n = matchReducer(used, { type: "NEXT_PROMPT" });
    const ended = matchReducer(n, { type: "END_TURN" });
    expect(ended.turnIndex).toBe(1);
    const reset = matchReducer(ended, { type: "RESTART", game: game() });
    expect(reset.turnIndex).toBe(0); expect(reset.teams[0].score).toBe(0);
    expect(reset.teams[0].inventory.doublePoints).toBe(1);
  });
  it("does not skip the next prompt when a correct answer is followed by End Turn", () => {
    const s = started(); const afterAnswer = matchReducer(s, { type: "ANSWER", correct: true });
    const nextPrompt = afterAnswer.currentPrompt;
    const ready = matchReducer(afterAnswer, { type: "NEXT_PROMPT" });
    const nextTurn = matchReducer(ready, { type: "END_TURN" });
    expect(nextTurn.currentPrompt.prompt).not.toBe(nextPrompt.prompt);
    expect(nextTurn.turnIndex).toBe(1);
  });
  it("consumes each power-up at most once and grants extra time", () => {
    const s = started(); const doubled = matchReducer(s, { type: "ANSWER", correct: true, doublePoints: true });
    expect(doubled.teams[0].score).toBe(2); expect(doubled.teams[0].inventory.doublePoints).toBe(0);
    const next = matchReducer(doubled, { type: "NEXT_PROMPT" });
    const extra = matchReducer(next, { type: "EXTRA_TIME" });
    expect(extra.timeLeft).toBe(s.timeLeft + 15); expect(extra.teams[0].inventory.extraTime).toBe(0);
    const nextPrompt = matchReducer(doubled, { type: "NEXT_PROMPT" });
    const afterSecondUse = matchReducer(nextPrompt, { type: "ANSWER", correct: true, doublePoints: true });
    expect(afterSecondUse.teams[0].score).toBe(3);
  });
  it("replays cleanly after the filtered prompt deck is exhausted", () => {
    const s = started();
    const onePrompt = { ...s, deck: [s.currentPrompt], promptIndex: 0 };
    const answered = matchReducer(onePrompt, { type: "ANSWER", correct: true });
    expect(answered.currentPrompt).toBeNull();
    const ready = matchReducer(answered, { type: "NEXT_PROMPT" });
    const nextTurn = matchReducer(ready, { type: "END_TURN" });
    expect(nextTurn.currentPrompt).toBeNull();
    const replay = matchReducer(nextTurn, { type: "REPLAY_DECK" });
    expect(replay.currentPrompt.prompt).toBeTruthy();
  });
  it("freezes while paused and expires exactly once", () => {
    const s = started(); const paused = matchReducer(s, { type: "PAUSE" });
    expect(matchReducer(paused, { type: "TICK" }).timeLeft).toBe(paused.timeLeft);
    const expired = matchReducer({ ...s, timeLeft: 1 }, { type: "TICK" });
    expect(expired.turnIndex).toBe(1); expect(matchReducer(expired, { type: "END_TURN" })).toBe(expired);
  });
  it("supports power-ups, streak milestones, and ties", () => {
    let s = started(game({ roundCount: 6 }));
    for (let i = 0; i < 5; i++) { s = matchReducer(s, { type: "ANSWER", correct: true, doublePoints: i === 0 }); s = matchReducer(s, { type: "NEXT_PROMPT" }); }
    expect(s.teams[0].score).toBe(6); expect(s.teams[0].longestStreak).toBe(5);
    expect(s.achievements.some((x) => x.value === 5)).toBe(true);
    const tied = { ...s, teams: s.teams.map((t) => ({ ...t, score: 2 })) };
    expect(getWinningTeams(tied.teams)).toHaveLength(3);
  });
  it("rejects invalid player data and handles missing data", () => {
    expect(() => game({ players: [] })).toThrow();
    expect(() => game({ players: ["Alex", "alex", "Morgan"] })).toThrow(/unique/);
    expect(() => game({ players: ["Alex", null, "Morgan"] })).toThrow(/non-empty/);
    expect(game({ era: [1900, 1999] }).deck.length).toBeGreaterThan(0);
  });
});
