import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import RoomSetup from "./RoomSetup.jsx";
import { createDefaultPlayers, getPlayerColor, PLAYER_COLOR_PALETTE, removePlayerFromRoster, validatePlayerName } from "../utils/playerSetup.js";

function renderSetup(gameId) {
  return renderToStaticMarkup(createElement(MemoryRouter, { initialEntries: [`/game/${gameId}`] }, createElement(Routes, null, createElement(Route, { path: "/game/:gameId", element: createElement(RoomSetup) }))));
}

function contrastRatio(hexA, hexB) {
  const luminance = (hex) => {
    const [r, g, b] = hex.slice(1).match(/../g).map((channel) => parseInt(channel, 16) / 255).map((channel) => channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4);
    return .2126 * r + .7152 * g + .0722 * b;
  };
  const a = luminance(hexA);
  const b = luminance(hexB);
  return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
}

describe("shared player setup", () => {
  it.each([
    ["charades", 2],
    ["quiz", 2],
    ["imposter", 3],
    ["undercover", 3],
    ["mafia", 5],
  ])("starts %s with its valid default roster", (gameId, minimum) => {
    const markup = renderSetup(gameId);
    expect(markup).toContain(`${minimum} /`);
    for (let index = 1; index <= minimum; index += 1) expect(markup).toContain(`Player ${index}`);
    expect(markup).not.toContain(`Player ${minimum + 1}`);
  });

  it("offers mission-based rules on the existing Undercover setup route", () => {
    const markup = renderSetup("undercover");
    expect(markup).toContain("Set your secret missions");
    expect(markup).toContain("Mission settings");
    expect(markup).toContain("Mission categories");
    expect(markup).toContain("Accusation tokens");
    expect(markup).toContain("Include optional round events");
  });

  it("restores an existing roster and creates enough defaults for a stricter game", () => {
    expect(createDefaultPlayers(2, ["Rina", "Dev"])).toEqual(["Rina", "Dev"]);
    expect(createDefaultPlayers(3, ["Rina", "Dev"])).toEqual(["Player 1", "Player 2", "Player 3"]);
  });

  it("enforces the selected game's minimum and validates names", () => {
    expect(removePlayerFromRoster(["Player 1", "Player 2", "Player 3"], 2, 3)).toHaveLength(3);
    expect(removePlayerFromRoster(["A", "B", "C", "D"], 1, 3)).toEqual(["A", "C", "D"]);
    expect(validatePlayerName("  ", ["A"]).valid).toBe(false);
    expect(validatePlayerName(" a ", ["A", "B"], 1).message).toMatch(/unique/);
    expect(validatePlayerName("Rina", ["Player 1", "Player 2"], 0)).toMatchObject({ valid: true, name: "Rina" });
  });

  it("assigns six stable, named colors and readable foregrounds by player index", () => {
    expect(PLAYER_COLOR_PALETTE.map((color) => color.name)).toEqual(["Beige", "Teal", "Pine Green", "Deep Aubergine", "Sky Blue", "Terracotta"]);
    expect(new Set(PLAYER_COLOR_PALETTE.map((color) => color.background)).size).toBe(6);
    expect(PLAYER_COLOR_PALETTE.every((color) => color.foreground)).toBe(true);
    expect(PLAYER_COLOR_PALETTE.every((color) => contrastRatio(color.background, color.foreground) >= 4.5)).toBe(true);
    expect(getPlayerColor(0)).toEqual(getPlayerColor(6));
    expect(getPlayerColor(5)).not.toEqual(getPlayerColor(4));
  });
});
