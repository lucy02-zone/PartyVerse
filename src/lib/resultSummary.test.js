import { describe, expect, it } from "vitest";
import { charadesResultSummary, imposterResultSummary, quizResultSummary, undercoverResultSummary } from "./resultSummary.js";

describe("public game result summaries", () => {
  it("summarizes quiz winners and real scores", () => {
    expect(quizResultSummary(["Rina"], [{ name: "Rina", score: 5 }])).toBe("PartyVerse Quiz Battle · Rina won · Rina: 5 points");
  });

  it("summarizes Charades scores and tied winners", () => {
    expect(charadesResultSummary([{ name: "Blue" }, { name: "Gold" }], [{ name: "Blue", score: 2 }, { name: "Gold", score: 2 }])).toContain("Blue & Gold tied");
  });

  it("does not disclose hidden roles or clue words", () => {
    expect(undercoverResultSummary({ winner: "civilian", eliminated: "Rina", secretWord: "secret" })).not.toContain("secret");
    expect(imposterResultSummary({ winner: "players", imposterId: "Rina", secretWord: "secret" }, 4)).toBe("PartyVerse Find the Imposter · The group caught the imposter · 4 votes cast");
  });
});
