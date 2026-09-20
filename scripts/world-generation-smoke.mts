// Offline renderer smoke check: npm run build, then node --import tsx scripts/world-generation-smoke.mts.
// All requests are fulfilled locally; no inference calls or external credentials are used.
import { chromium } from "@playwright/test";
import { readFile } from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import {
  compileEnvironment,
  fallbackConfiguration,
} from "../src/core/generation";
import { newScenario, settlePopulation } from "../src/core/playback";
import type { SessionSnapshot, VenueKind } from "../src/core/types";

const browser = await chromium.launch({
  headless: true,
  channel: process.env.WORLD_BROWSER_CHANNEL,
});
const mime: Record<string, string> = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
  ".txt": "text/plain",
};
try {
  for (const kind of [
    "airport",
    "mall",
    "neighborhood",
    "park",
    "small_venue",
  ] as VenueKind[]) {
    const data = fallbackConfiguration(`An illustrative ${kind}`);
    data.venueKind = kind;
    data.name = `Layout check: ${kind}`;
    data.places[0].styleId = "terminal-modern";
    data.places[1].styleId = "cafe";
    if (kind === "airport") {
      data.places[4].name = "Gate A";
      data.places[5].name = "Gate B";
      data.places[4].styleId = "airport-gate";
      data.places[5].styleId = "jetbridge";
    }
    const environment = settlePopulation(
      compileEnvironment(data, data.name, [], "unavailable", kind),
    );
    const state: SessionSnapshot = {
      setup: {
        id: kind,
        status: "ready",
        description: data.name,
        message: "Offline fixture",
        startedAt: 0,
      },
      environment,
      run: newScenario(environment),
      results: [],
      segments: [],
    };
    const page = await browser.newPage({
      viewport: { width: 1440, height: 960 },
    });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.routeWebSocket("**/api/live", (socket) =>
      socket.send(JSON.stringify(state)),
    );
    await page.route("**/*", async (route) => {
      const url = new URL(route.request().url());
      if (url.pathname.startsWith("/api/"))
        return route.fulfill({ json: state });
      const relative =
        url.pathname === "/"
          ? "index.html"
          : decodeURIComponent(url.pathname).replace(/^\/+/, "");
      const file = path.resolve("out", relative);
      if (!file.startsWith(path.resolve("out") + path.sep))
        return route.abort();
      try {
        await route.fulfill({
          body: await readFile(file),
          contentType: mime[path.extname(file)] ?? "application/octet-stream",
        });
      } catch {
        await route.fulfill({ status: 404, body: "Not found" });
      }
    });
    await page.goto("http://localhost:4173/");
    try {
      await page
        .locator("canvas")
        .waitFor({ state: "visible", timeout: 30000 });
    } catch (error) {
      await page.screenshot({ path: "/private/tmp/crowd-world-failed.png" });
      console.error(
        JSON.stringify({
          errors,
          body: (await page.locator("body").innerText()).slice(0, 2500),
        }),
      );
      throw error;
    }
    await page.waitForTimeout(800);
    assert.equal(
      await page.getByText("3D rendering is unavailable").count(),
      0,
    );
    assert.deepEqual(errors, []);
    await page.screenshot({ path: `/private/tmp/crowd-world-${kind}.png` });
    console.log(
      JSON.stringify({
        venue: kind,
        canvas: true,
        people: environment.population.length,
        pendingArrivals: environment.population.filter(
          (p) => p.presence === "not_arrived",
        ).length,
        pageErrors: errors,
      }),
    );
    await page.close();
  }
} finally {
  await browser.close();
}
