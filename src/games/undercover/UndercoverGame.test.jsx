import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import UndercoverGame from "./UndercoverGame.jsx";

describe("Undercover private briefing", () => {
  it("does not render a secret mission before the player explicitly reveals it", () => {
    const players = ["Ari", "Bo", "Cam"];
    const markup = renderToStaticMarkup(createElement(MemoryRouter, { initialEntries: [{ pathname: "/play/undercover", state: { players } }] }, createElement(Routes, null, createElement(Route, { path: "/play/undercover", element: createElement(UndercoverGame) }))));
    expect(markup).toContain("PRIVATE BRIEFING");
    expect(markup).toContain("Reveal my mission");
    expect(markup).not.toContain("objectives");
    expect(markup).not.toContain("playerMission");
  });
});