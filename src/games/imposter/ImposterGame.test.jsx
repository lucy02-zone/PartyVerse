import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ImposterGame from "./ImposterGame.jsx";

function renderImposter(players = ["Ari", "Bo", "Cam"]) {
  return renderToStaticMarkup(createElement(
    MemoryRouter,
    { initialEntries: [{ pathname: "/play/imposter", state: { players, category: "Movies" } }] },
    createElement(Routes, null,
      createElement(Route, { path: "/play/imposter", element: createElement(ImposterGame) }),
    ),
  ));
}

describe("Imposter reveal presentation", () => {
  it("starts with only the current player's identity face exposed to assistive technology", () => {
    const markup = renderImposter();
    expect(markup).toContain("SECRET IDENTITY · PLAYER 1 OF 3");
    expect(markup).toContain('class="secret-card-face secret-card-front" aria-hidden="false"');
    expect(markup).toContain('class="secret-card-face secret-card-back" aria-hidden="true" inert=""');
    expect(markup).toContain("Reveal my role");
  });

  it("keeps invalid player counts on the setup guidance screen", () => {
    const markup = renderImposter(["Ari", "Bo"]);
    expect(markup).toContain("At least three players are needed to start this game.");
    expect(markup).not.toContain("SECRET IDENTITY");
  });
});
