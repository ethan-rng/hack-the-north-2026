import { chromium } from "@playwright/test";
import { writeFile, chmod } from "node:fs/promises";
import assert from "node:assert/strict";
const origin = process.env.SMOKE_URL || "http://localhost:8787";
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 960 },
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const state = () =>
  page.evaluate(async () => (await fetch("/api/session")).json());
async function waitFor(predicate, seconds = 180) {
  let last;
  for (let i = 0; i < seconds * 2; i++) {
    const s = await state();
    last = s;
    if (predicate(s)) return s;
    await page.waitForTimeout(500);
  }
  await page.screenshot({ path: "/private/tmp/crowd-playback-failed.png" });
  throw Error(
    `State deadline exceeded: ${JSON.stringify({ setup: last?.setup, segments: last?.segments })}`,
  );
}
async function frozen(expected, ms = 2500) {
  await page.waitForTimeout(ms);
  const after = await state();
  assert.equal(after.run.time, expected.run.time);
  assert.equal(after.run.jevAccepted, expected.run.jevAccepted);
  assert.equal(after.run.jevFailed, expected.run.jevFailed);
  assert.deepEqual(after.run.people, expected.run.people);
}
async function submitEvent(description) {
  await page.getByTitle("Command palette (⌘K)").click();
  const paletteInput = page.getByPlaceholder(
    "Type a command or describe an event…",
  );
  await paletteInput.fill(description);
  await paletteInput.press("Enter");
}
async function watchImpact() {
  const brief = page.locator(".impact-brief");
  await brief.waitFor({ timeout: 30000 });
  assert.ok((await brief.locator("h2").innerText()).trim().length > 0);
  await brief
    .getByRole("button", { name: "Watch crowd response", exact: true })
    .click();
  await brief.waitFor({ state: "detached" });
}
try {
  let releaseSession;
  const sessionGate = new Promise((resolve) => {
    releaseSession = resolve;
  });
  let sessionRequested;
  const sessionStarted = new Promise((resolve) => {
    sessionRequested = resolve;
  });
  await page.route(
    "**/api/session",
    async (route) => {
      sessionRequested();
      await sessionGate;
      await route.continue();
    },
    { times: 1 },
  );
  await page.goto(origin);
  await sessionStarted;
  await page.getByRole("button", { name: "Create world" }).waitFor();
  await page
    .getByLabel("What kind of place are we exploring?")
    .fill(
      "An illustrative busy shopping mall with a shoe store, a gift shop, two food outlets, a customer service desk and a rest area.",
    );
  assert.equal(
    await page.getByRole("button", { name: "Create world" }).isDisabled(),
    true,
  );
  releaseSession();
  await page.waitForFunction(
    () => !document.querySelector(".description-footer button")?.disabled,
  );
  assert.match(
    await page.getByLabel("What kind of place are we exploring?").inputValue(),
    /busy shopping mall/,
  );
  console.log(JSON.stringify({ stage: "session-ready", preservedDraft: true }));
  await page.getByRole("button", { name: "Create world" }).click();
  let s = await waitFor(
    (s) => ["ready", "failed"].includes(s.setup.status),
    120,
  );
  assert.ok(s.environment, s.setup.message);
  assert.ok(s.environment.sources.length);
  console.log(
    JSON.stringify({
      stage: "setup",
      research: s.environment.researchStatus,
      placed: s.environment.population.filter((p) => p.placeId).length,
    }),
  );
  await page.getByRole("button", { name: "Explore scenario" }).click();
  s = await waitFor((s) => !!s.run);
  assert.equal(s.run.status, "paused");
  assert.equal(s.run.jevAccepted, 0);
  assert.equal(s.run.time, 0);
  await frozen(s);
  await page.screenshot({ path: "/private/tmp/crowd-playback-idle.png" });
  await submitEvent(
    "Announce mall-wide: all food is 50 percent off for 15 seconds.",
  );
  await page.locator(".processing-overlay").waitFor();
  s = await state();
  assert.equal(s.run.time, 0);
  assert.equal(s.run.jevAccepted, 0);
  await page.screenshot({ path: "/private/tmp/crowd-playback-processing.png" });
  const rejected = await page.evaluate(async () => {
    const r = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "A second simultaneous event" }),
    });
    return r.status;
  });
  assert.equal(rejected, 409);
  s = await waitFor(
    (s) =>
      s.segments[0]?.status === "ready" || s.segments[0]?.status === "failed",
  );
  assert.equal(s.segments[0].status, "ready", s.segments[0].message);
  assert.equal(s.run.time, 30);
  assert.equal(s.run.status, "paused");
  assert.ok(s.run.jevAccepted > 0);
  assert.ok(s.segments[0].callsMade <= 240);
  await watchImpact();
  console.log(
    JSON.stringify({
      stage: "recorded",
      seconds: s.run.time,
      calls: s.segments[0].callsMade,
      accepted: s.run.jevAccepted,
      failed: s.run.jevFailed,
      purchases: s.run.transactions.length,
    }),
  );
  await page
    .getByRole("button", { name: "Pause playback", exact: true })
    .waitFor();
  await page.getByLabel("Playback speed").selectOption("4");
  await page.waitForTimeout(1000);
  await page
    .getByRole("button", { name: "Pause playback", exact: true })
    .click();
  const pausedValue = await page
    .getByLabel("Simulation timeline", { exact: true })
    .inputValue();
  await page.waitForTimeout(500);
  assert.equal(
    await page.getByLabel("Simulation timeline", { exact: true }).inputValue(),
    pausedValue,
  );
  await frozen(s);
  const slider = page.getByLabel("Simulation timeline", { exact: true });
  await slider.focus();
  await slider.press("Home");
  assert.equal(Number(await slider.inputValue()), 0);
  assert.equal(
    await page
      .getByRole("button", { name: "Process event", exact: true })
      .count(),
    0,
  );
  await page.getByRole("button", { name: "People", exact: true }).click();
  await page.locator(".entity-scroll button").first().click();
  await page.getByRole("heading", { name: "Alex", exact: true }).waitFor();
  await page.screenshot({ path: "/private/tmp/crowd-playback-history.png" });
  await slider.focus();
  await slider.press("End");
  assert.equal(Number(await slider.inputValue()), 30);
  await page.getByLabel("Playback speed").selectOption("0.5");
  await page
    .getByRole("button", { name: "Play recording", exact: true })
    .click();
  await page.waitForTimeout(800);
  await page
    .getByRole("button", { name: "Pause playback", exact: true })
    .click();
  assert.ok(Number(await slider.inputValue()) < 2);
  await page.getByRole("button", { name: "Jump to latest state" }).click();
  await submitEvent("A dinosaur enters the central plaza for 20 seconds.");
  s = await waitFor(
    (s) =>
      s.segments[1]?.status === "ready" || s.segments[1]?.status === "failed",
  );
  assert.equal(s.segments[1].status, "ready", s.segments[1].message);
  assert.equal(s.run.time, 60);
  await watchImpact();
  await page
    .getByRole("button", { name: "Pause playback", exact: true })
    .waitFor();
  await page.getByLabel("Playback speed").selectOption("4");
  await page.screenshot({ path: "/private/tmp/crowd-playback-playing.png" });
  await page
    .getByRole("button", { name: "Play recording", exact: true })
    .waitFor({ timeout: 20000 });
  assert.equal(Number(await slider.inputValue()), 60);
  await frozen(s);
  await page.reload();
  await page
    .getByRole("button", { name: "Play recording", exact: true })
    .waitFor();
  await page.waitForTimeout(1500);
  assert.equal(
    Number(
      await page
        .getByLabel("Simulation timeline", { exact: true })
        .inputValue(),
    ),
    60,
  );
  assert.equal(
    await page
      .getByRole("button", { name: "Pause playback", exact: true })
      .count(),
    0,
  );
  await page.screenshot({ path: "/private/tmp/crowd-playback-final.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "/private/tmp/crowd-playback-mobile.png",
    fullPage: true,
  });
  await writeFile(
    "/private/tmp/crowd-playback-state.json",
    JSON.stringify(s, null, 2),
  );
  await context.storageState({
    path: "/private/tmp/crowd-playback-session.json",
  });
  await chmod("/private/tmp/crowd-playback-session.json", 0o600);
  const oldRun = s.run.runId;
  await page.getByRole("button", { name: "Reset baseline" }).click();
  const reset = await waitFor((s) => s.run?.runId !== oldRun);
  assert.equal(reset.run.time, 0);
  assert.equal(reset.run.jevAccepted, 0);
  assert.equal(reset.segments.length, 0);
  assert.deepEqual(reset.run.products, reset.environment.products);
  await frozen(reset);
  const stale = await page.evaluate(
    async ({ oldRun }) => {
      const r = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: "An old request",
          runId: oldRun,
          expectedTime: 60,
        }),
      });
      return r.status;
    },
    { oldRun },
  );
  assert.equal(stale, 409);
  console.log(
    JSON.stringify({
      stage: "PASS",
      segments: s.segments.map((x) => ({
        duration: x.ticksDone,
        calls: x.callsMade,
      })),
      scrub: true,
      speeds: true,
      autoPause: true,
      idleCalls: 0,
      reconnect: true,
      reset: true,
      errors,
    }),
  );
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
