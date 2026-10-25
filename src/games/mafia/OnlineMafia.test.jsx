import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

const supabaseMock = vi.hoisted(() => ({ configured: true }));
vi.mock("../../lib/supabase.js", () => ({
  get isSupabaseConfigured() { return supabaseMock.configured; },
  requireSupabase: vi.fn(),
}));

import OnlineMafia, { OnlineMafiaLobbyRoster, OnlineMafiaPrivateRole, OnlineMafiaVotingTimer, PlayerTargetList } from "./OnlineMafia.jsx";

function renderOnlineMafia() {
  return renderToStaticMarkup(createElement(MemoryRouter, null, createElement(OnlineMafia)));
}

describe("Online Mafia entry screen", () => {
  it("offers separate create, join, and local play choices", () => {
    const markup = renderOnlineMafia();
    expect(markup).toContain("Create a Room");
    expect(markup).toContain("Join a Room");
    expect(markup).toContain('href="/game/mafia"');
  });

  it("explains the device-session model without exposing secret credentials", () => {
    const markup = renderOnlineMafia();
    expect(markup).toContain("Everyone joins on their own device.");
    expect(markup).not.toContain("service_role");
  });

  it("shows a friendly unavailable state without configuration diagnostics", () => {
    supabaseMock.configured = false;
    try {
      const markup = renderOnlineMafia();
      expect(markup).toContain("Online Mafia is taking a short break");
      expect(markup).toContain("Try again");
      expect(markup).toContain('href="/game/mafia"');
      expect(markup).not.toContain("VITE_SUPABASE");
      expect(markup).not.toContain("configuration");
    } finally {
      supabaseMock.configured = true;
    }
  });
});

describe("Online Mafia private role panel", () => {
  it("keeps the assigned role hidden until the player reveals it", () => {
    const markup = renderToStaticMarkup(createElement(OnlineMafiaPrivateRole, {
      role: "Detective",
      revealed: false,
      onReveal: vi.fn(),
    }));
    expect(markup).toContain("Your role is only visible on this device.");
    expect(markup).toContain("Reveal my role");
    expect(markup).not.toContain("Detective");
  });

  it.each([
    ["Mafia", "Work together at night"],
    ["Doctor", "Choose one living player to protect"],
    ["Detective", "Investigate one living player"],
    ["Villager", "Discuss clues with the town"],
  ])("shows a clear %s role and description after reveal", (role, description) => {
    const markup = renderToStaticMarkup(createElement(OnlineMafiaPrivateRole, {
      role,
      revealed: true,
      onReveal: vi.fn(),
    }));
    expect(markup).toContain(`<h2>${role}</h2>`);
    expect(markup).toContain(description);
    expect(markup).not.toContain("Reveal my role");
  });

  it("shows Mafia teammates only on a revealed Mafia role panel", () => {
    const markup = renderToStaticMarkup(createElement(OnlineMafiaPrivateRole, {
      role: "Mafia",
      revealed: true,
      onReveal: vi.fn(),
      teammates: [{ id: "mate-1", name: "Mina" }],
    }));
    expect(markup).toContain("Mafia teammates: Mina");
  });

  it("shows a Detective investigation result only in that player's private panel", () => {
    const markup = renderToStaticMarkup(createElement(OnlineMafiaPrivateRole, {
      role: "Detective",
      revealed: true,
      onReveal: vi.fn(),
      investigation: { playerName: "Rae", isMafia: false },
    }));
    expect(markup).toContain("Investigation: Rae is not Mafia.");
    expect(markup).not.toContain("Mafia teammates");
  });
});

describe("Online Mafia voting controls", () => {
  it("renders eligible voting targets as accessible selectable buttons, not a dropdown", () => {
    const markup = renderToStaticMarkup(createElement(PlayerTargetList, {
      targets: [{ id: "p1", name: "Asha", alive: true }, { id: "p2", name: "Dev", alive: true }],
      selectedId: "p2",
      onSelect: vi.fn(),
      label: "Select a player to vote for",
      action: "vote",
    }));
    expect(markup).toContain('role="group" aria-label="Select a player to vote for"');
    expect(markup).toContain('aria-pressed="true"');
    expect(markup).toContain('aria-label="vote for Dev"');
    expect(markup).not.toContain("<select");
  });

  it("marks eliminated targets disabled and communicates their state", () => {
    const markup = renderToStaticMarkup(createElement(PlayerTargetList, {
      targets: [{ id: "p1", name: "Asha", alive: false }],
      selectedId: "",
      onSelect: vi.fn(),
      label: "Select a night-action target",
      action: "night",
    }));
    expect(markup).toContain("disabled");
    expect(markup).toContain("eliminated");
    expect(markup).toContain(">Out</span>");
  });

  it("shows the shared deadline countdown with an urgency state at five seconds", () => {
    const markup = renderToStaticMarkup(createElement(OnlineMafiaVotingTimer, { secondsLeft: 5 }));
    expect(markup).toContain("Voting ends in 5s");
    expect(markup).toContain('class="online-mafia-vote-timer urgent"');
    expect(markup).toContain('role="progressbar"');
  });
});

describe("Online Mafia lobby removal controls", () => {
  const players = [
    { id: "host", name: "Host", ready: true },
    { id: "guest", name: "Guest", ready: false },
  ];

  it("shows remove controls only to the host and never beside the host", () => {
    const hostMarkup = renderToStaticMarkup(createElement(OnlineMafiaLobbyRoster, {
      players,
      isHost: true,
      myPlayerId: "host",
      hostPlayerId: "host",
      loading: false,
      onRemove: vi.fn(),
    }));
    expect(hostMarkup).toContain('aria-label="Remove Guest from room"');
    expect(hostMarkup).not.toContain('aria-label="Remove Host from room"');

    const guestMarkup = renderToStaticMarkup(createElement(OnlineMafiaLobbyRoster, {
      players,
      isHost: false,
      myPlayerId: "guest",
      hostPlayerId: "host",
      loading: false,
      onRemove: vi.fn(),
    }));
    expect(guestMarkup).not.toContain("online-mafia-remove");
  });
});
