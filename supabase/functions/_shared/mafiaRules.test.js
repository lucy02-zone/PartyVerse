import { describe, expect, it } from "vitest";
import { assignServerRoles, generateRoomCode, secureRandomInt } from "./mafiaRules.js";

describe("online Mafia server-only setup helpers", () => {
  it.each([
    [5, 1], [6, 1], [7, 2], [10, 2], [11, 3], [15, 3],
  ])("assigns the documented role counts for %i players", (count, mafiaCount) => {
    const players = Array.from({ length: count }, (_, index) => `player-${index}`);
    const assignments = assignServerRoles(players);
    expect(assignments.map(({ playerId }) => playerId).sort()).toEqual([...players].sort());
    expect(assignments.filter(({ role }) => role === "Mafia")).toHaveLength(mafiaCount);
    expect(assignments.filter(({ role }) => role === "Doctor")).toHaveLength(1);
    expect(assignments.filter(({ role }) => role === "Detective")).toHaveLength(1);
    expect(assignments.filter(({ role }) => role === "Villager")).toHaveLength(count - mafiaCount - 2);
  });

  it("rejects invalid, out-of-range, and duplicate role rosters", () => {
    expect(() => assignServerRoles(["a", "b", "c", "d"])).toThrow(/5 to 15/);
    expect(() => assignServerRoles(Array.from({ length: 16 }, (_, i) => `p${i}`))).toThrow(/5 to 15/);
    expect(() => assignServerRoles(["a", "b", "c", "d", "d"])).toThrow(/unique/);
    expect(() => secureRandomInt(0)).toThrow(/random range/);
  });

  it("creates room codes from the six-character unambiguous alphabet", () => {
    for (let index = 0; index < 25; index += 1) {
      expect(generateRoomCode()).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    }
  });
});
