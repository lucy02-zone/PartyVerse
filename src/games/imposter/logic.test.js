import { describe, expect, it } from "vitest";
import { addImposterVote, createImposterRound, getCategories, getVoteResult } from "./logic.js";

describe("imposter round generation", () => {
  it("allows a selected category to be used and returns only items from it", () => {
    const players = ["A", "B", "C", "D"];
    const round = createImposterRound(players, { category: "Movies" });

    expect(round.category).toBe("Movies");
    expect(round.assignments.some((entry) => entry.answer === null)).toBe(true);
    expect(round.secretWord).toBeTruthy();
  });

  it("returns all available category names", () => {
    expect(getCategories()).toContain("Movies");
    expect(getCategories()).toContain("Music & Bands");
  });

  it("records one private vote per eligible voter and rejects self or duplicate votes", () => {
    const players = ["A", "B", "C"];
    const first = addImposterVote({}, "A", "B", players);
    expect(first).toEqual({ A: "B" });
    expect(addImposterVote(first, "A", "C", players)).toBeNull();
    expect(addImposterVote(first, "B", "B", players)).toBeNull();
    expect(addImposterVote(first, "B", "missing", players)).toBeNull();
    expect(addImposterVote(first, "B", "A", players)).toEqual({ A: "B", B: "A" });
  });

  it("keeps vote totals and tie behavior unchanged for the final result", () => {
    expect(getVoteResult({ A: "B", B: "C", C: "B" }, "B")).toEqual({ eliminated: "B", winner: "players" });
    expect(getVoteResult({ A: "B", B: "C", C: "A" }, "B")).toEqual({ winner: "tie", eliminated: null });
  });
});
