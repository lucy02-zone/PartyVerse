import { describe, expect, it, vi } from "vitest";
import { filterGames, chooseRandomGame, getGamePath, GAME_FILTERS } from "./gameDiscovery.js";

const games = ["imposter", "mafia", "undercover", "quiz", "charades"].map((id) => ({ id }));

describe("game discovery helpers", () => {
  it("only exposes filters with a trustworthy matching game", () => {
    expect(GAME_FILTERS.map(({ id }) => id)).toEqual(["all", "bluffing", "social-deduction", "word-games", "trivia", "acting"]);
    expect(filterGames(games, "social-deduction").map(({ id }) => id)).toEqual(["imposter", "mafia", "undercover"]);
    expect(filterGames(games, "word-games").map(({ id }) => id)).toEqual(["undercover"]);
  });

  it("returns no games for an unmatched category and all games for all", () => {
    expect(filterGames(games, "unlisted")).toEqual([]);
    expect(filterGames(games, "all")).toBe(games);
  });

  it("selects a bounded random game and handles an empty collection", () => {
    expect(chooseRandomGame(games, vi.fn(() => 0))).toBe(games[0]);
    expect(chooseRandomGame(games, vi.fn(() => 0.999))).toBe(games[4]);
    expect(chooseRandomGame([], vi.fn(() => 0.5))).toBeNull();
  });

  it("routes to existing setup destinations without starting a game", () => {
    expect(getGamePath(games[1])).toBe("/play/mafia/online");
    expect(getGamePath(games[2])).toBe("/game/undercover");
    expect(getGamePath(null)).toBe("/");
  });
});
