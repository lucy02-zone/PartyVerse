import { describe, expect, it } from "vitest";
import { createImposterRound, getCategories } from "./logic.js";

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
});
