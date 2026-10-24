import { describe, expect, it } from "vitest";
import { buildQuizGame } from "./logic.js";
import { questionBank } from "./questions.js";

describe("quiz game selection", () => {
  it("includes puzzle-style questions in the available bank", () => {
    const hasPuzzle = questionBank.some((question) => question.type === "puzzle");

    expect(hasPuzzle).toBe(true);
  });

  it("supports building a game with puzzle questions", () => {
    const game = buildQuizGame({
      players: ["Ava", "Ben"],
      category: "All",
      difficulty: "Mixed",
      questionCount: 5,
      timeLimit: 20,
    });

    expect(game.questions.length).toBe(5);
    expect(game.questions.every((question) => question.type === "multiple-choice" || question.type === "puzzle")).toBe(true);
  });
});
