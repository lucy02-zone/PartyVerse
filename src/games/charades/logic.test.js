import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import CharadesGame from "./CharadesGame.jsx";
import RoomSetup from "../../pages/RoomSetup.jsx";
import { buildCharadesGame, createDefaultPlayers, createMatchState, getLeaderboard, getTiltAction, getTurnDetails, getWinningTeams, matchReducer, removePlayerFromRoster } from "./logic.js";
import { CHARADES_PROMPTS, getPromptDeck } from "./prompts.js";

const game = (overrides = {}) => buildCharadesGame({ players: ["A", "B", "C"], roundCount: 2, ...overrides });
const started = (g = game()) => matchReducer(createMatchState(g, () => 0), { type: "START" });

describe("Telugu Charades", () => {
  it("opens setup with two normal editable default players and accepts them unchanged", () => {
    const roster = createDefaultPlayers();
    expect(roster).toEqual(["Player 1", "Player 2"]);
    expect(buildCharadesGame({ players: roster }).players).toEqual(roster);
    const markup = renderToStaticMarkup(createElement(MemoryRouter, { initialEntries: ["/game/charades"] }, createElement(Routes, null, createElement(Route, { path: "/game/:gameId", element: createElement(RoomSetup) }))));
    expect(markup).toContain("Player 1");
    expect(markup).toContain("Player 2");
  });
  it("enforces the two-player floor while allowing extra players to be removed", () => {
    expect(() => buildCharadesGame({ players: ["Only one"] })).toThrow(/2 to 16/);
    expect(removePlayerFromRoster(["Player 1", "Player 2"], 0)).toEqual(["Player 1", "Player 2"]);
    expect(removePlayerFromRoster(["A", "B", "C"], 1)).toEqual(["A", "C"]);
  });
  it("persists edited names through game creation and replay configuration", () => {
    const edited = createDefaultPlayers().map((name, index) => index === 0 ? "Rina" : name);
    const g = buildCharadesGame({ players: edited, roundCount: 2, turnDuration: 45, era: [2010, 2019] });
    const replay = matchReducer(createMatchState(g, () => 0), { type: "RESTART", game: g });
    expect(g.players).toEqual(["Rina", "Player 2"]);
    expect(replay.game.players).toEqual(g.players);
    expect(replay.game.roundCount).toBe(2);
    expect(replay.game.turnDuration).toBe(45);
    expect(replay.game.era).toEqual([2010, 2019]);
    expect(replay.teams.every((team) => team.score === 0)).toBe(true);
  });
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
  it("keeps Ready idle until GO and accepts GO only once", () => {
    const ready = createMatchState(game(), () => 0);
    expect(ready.phase).toBe("preparation");
    expect(ready.timeLeft).toBe(ready.game.turnDuration);
    expect(matchReducer(ready, { type: "TICK" })).toBe(ready);
    expect(matchReducer(ready, { type: "ANSWER", correct: true })).toBe(ready);
    const acting = matchReducer(ready, { type: "START" });
    expect(acting.phase).toBe("acting");
    expect(matchReducer(acting, { type: "START" })).toBe(acting);
    expect(acting.timeLeft).toBe(ready.game.turnDuration);
  });
  it("renders the current player on Ready without exposing any movie title", () => {
    const entry = { pathname: "/play/charades", state: { players: ["Rina", "Ari", "Sam"] } };
    const currentPrompt = createMatchState(buildCharadesGame(entry.state), () => 0).currentPrompt.prompt;
    const originalRandom = Math.random;
    let markup;
    try {
      Math.random = () => 0;
      markup = renderToStaticMarkup(createElement(MemoryRouter, { initialEntries: [entry] }, createElement(CharadesGame)));
    } finally { Math.random = originalRandom; }
    expect(markup).toContain("Ready, Rina?");
    expect(markup).toContain(">GO</button>");
    expect(markup).not.toContain(currentPrompt);
  });
  it("moves from an ended acting turn to the next player's Ready state", () => {
    const acting = started();
    const ended = matchReducer(acting, { type: "END_TURN", reason: "ended" });
    expect(ended.phase).toBe("preparation");
    expect(ended.turnIndex).toBe(1);
    expect(getTurnDetails(ended.game, ended.turnIndex, ended.teams).actingPlayer).toBe("B");
    expect(ended.timeLeft).toBe(ended.game.turnDuration);
  });
  it("schedules each player once per round and ends on the final scheduled turn", () => {
    const g = game({ players: ["A", "B", "C"], roundCount: 2 });
    const schedule = Array.from({ length: g.totalTurns }, (_, index) => getTurnDetails(g, index).actingPlayer);
    expect(schedule).toEqual(["A", "B", "C", "A", "B", "C"]);
    let s = createMatchState(g, () => 0);
    for (let turn = 0; turn < g.totalTurns; turn++) {
      s = matchReducer(s, { type: "START" });
      s = matchReducer(s, { type: "END_TURN", reason: "ended" });
    }
    expect(s.phase).toBe("results");
    expect(s.turnIndex).toBe(g.totalTurns - 1);
    expect(s.teams.map((team) => team.turnsPlayed)).toEqual([2, 2, 2]);
    expect(matchReducer(s, { type: "END_TURN" })).toBe(s);
    expect(matchReducer(s, { type: "TICK" })).toBe(s);
  });
  it("keeps correct and skipped prompts in the current player's turn", () => {
    let s = started();
    s = matchReducer(s, { type: "ANSWER", correct: true });
    expect(s.turnIndex).toBe(0);
    s = matchReducer(s, { type: "NEXT_PROMPT" });
    s = matchReducer(s, { type: "ANSWER", correct: false });
    expect(s.turnIndex).toBe(0);
    expect(s.teams[0].correctAnswers).toBe(1);
    expect(s.teams[0].skippedPrompts).toBe(1);
  });
  it("advances a timed-out turn exactly once and finishes immediately when it is last", () => {
    const g = game({ players: ["A", "B"], roundCount: 1 });
    let s = matchReducer(createMatchState(g, () => 0), { type: "START" });
    s = { ...s, turnIndex: 1, timeLeft: 1 };
    s = matchReducer(s, { type: "TICK" });
    expect(s.phase).toBe("results");
    expect(s.turnIndex).toBe(1);
    expect(s.teams[1].turnsPlayed).toBe(1);
    expect(matchReducer(s, { type: "TICK" })).toBe(s);
    expect(matchReducer(s, { type: "END_TURN", reason: "timeout" })).toBe(s);
  });
  it("sorts the final leaderboard and preserves tied top scores", () => {
    const ranked = getLeaderboard([{ id: "a", score: 2 }, { id: "b", score: 5 }, { id: "c", score: 5 }]);
    expect(ranked.map((team) => team.id)).toEqual(["b", "c", "a"]);
    expect(getWinningTeams(ranked)).toHaveLength(2);
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
