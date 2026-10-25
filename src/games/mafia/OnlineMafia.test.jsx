import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

const supabaseMock = vi.hoisted(() => ({ configured: true }));
vi.mock("../../lib/supabase.js", () => ({
  get isSupabaseConfigured() { return supabaseMock.configured; },
  requireSupabase: vi.fn(),
}));

import OnlineMafia from "./OnlineMafia.jsx";

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
