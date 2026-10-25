import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";
import GameCard from "./GameCard.jsx";

function renderGameCard(game) {
  return renderToStaticMarkup(createElement(MemoryRouter, null, createElement(GameCard, { game })));
}

describe("game card destinations", () => {
  it("opens Online Mafia from the Mafia card", () => {
    expect(renderGameCard({ id: "mafia", title: "Mafia", color: "plum", category: "Social", icon: "M", players: "5–15", description: "A game" }))
      .toContain('href="/play/mafia/online"');
  });

  it("keeps other game destinations unchanged", () => {
    expect(renderGameCard({ id: "charades", title: "Charades", color: "plum", category: "Party", icon: "C", players: "2+", description: "A game" }))
      .toContain('href="/game/charades"');
  });
});
