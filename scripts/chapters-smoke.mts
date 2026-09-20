// Deterministic browser regression: serves recorded fixtures, never calls inference.
import { chromium, expect } from "@playwright/test";
import assert from "node:assert/strict";
import {
  compileEnvironment,
  fallbackConfiguration,
} from "../src/core/generation";
import {
  activateEvent,
  applyDecision,
  createTicket,
  tick,
} from "../src/core/engine";
import {
  captureFrame,
  newScenario,
  newSegment,
  settlePopulation,
} from "../src/core/playback";
import type { Event, Recording, SessionSnapshot } from "../src/core/types";

const env = settlePopulation(
  compileEnvironment(
    fallbackConfiguration("Mall"),
    "Mall",
    [],
    "unavailable",
    "chapter-test",
  ),
);
const run = newScenario(env);
const recordings: Record<string, Recording> = {};
const segments: SessionSnapshot["segments"] = [];
// Record a real leave/return lifecycle using deterministic choices.
run.status = "running";
const person = run.people[0];
for (const text of [
  "Everyone is invited to leave",
  "A new promotion invites shoppers back",
]) {
  const segment = newSegment(run, text);
  const event: Event = {
    id: segment.eventId,
    originalText: text,
    title: text,
    description: text,
    status: "interpreting",
    startTimeSeconds: run.time,
    durationSeconds: 30,
    position: { x: 0, z: 0 },
    effects: [
      { kind: "announcement", targetId: null, value: 1, subjectKey: null },
    ],
    approximationNotes: [],
    visual: "marker",
    submittedAt: Date.now(),
  };
  run.events.push(event);
  activateEvent(env, run, event);
  const frames = [captureFrame(run)];
  const ticket = createTicket(env, run, person)!;
  const choice =
    ticket.choices.find((candidate) => candidate.type === "wait") ??
    ticket.choices[0];
  assert.ok(applyDecision(env, run, ticket, choice.id));
  for (let i = 0; i < 30; i++) {
    tick(env, run);
    frames.push(captureFrame(run));
  }
  Object.assign(segment, { status: "ready", endTime: run.time, ticksDone: 30 });
  segments.push(segment);
  recordings[segment.id] = { segmentId: segment.id, runId: run.runId, frames };
}
assert.equal(person.presence, "inside");
run.status = "paused";
const failed = newSegment(run, "An unsupported event");
failed.status = "failed";
failed.message = "No supported effects";
segments.push(failed);
const snapshot: SessionSnapshot = {
  environment: env,
  run,
  segments,
  results: [],
  setup: {
    id: env.setupId,
    status: "ready",
    message: "Ready",
    description: "Mall",
    startedAt: Date.now(),
  },
};
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors: string[] = [];
  const writes: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.routeWebSocket("**/api/live", () => {});
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    if (route.request().method() !== "GET") writes.push(url.pathname);
    const payload =
      url.pathname === "/api/recording"
        ? recordings[url.searchParams.get("segmentId")!]
        : snapshot;
    await route.fulfill({ json: payload });
  });
  await page.goto(process.env.SMOKE_URL || "http://127.0.0.1:8766");
  const sidebar = page.locator("#environment-entities");
  const sidebarToggle = page.getByRole("button", {
    name: "Expand sidebar",
    exact: true,
  });
  await expect(sidebar).toBeHidden();
  await expect(sidebar).toHaveCSS("transition-duration", "0.25s, 0.18s, 0s");
  await expect(sidebarToggle).toHaveAttribute("aria-expanded", "false");
  await sidebarToggle.click();
  await expect(sidebar).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Collapse sidebar", exact: true }),
  ).toHaveAttribute("aria-expanded", "true");
  await page
    .getByRole("button", { name: "Collapse sidebar", exact: true })
    .click();
  await expect(sidebar).toBeHidden();
  const slider = page.getByRole("slider", {
    name: "Simulation timeline",
    exact: true,
  });
  const chapters = page.getByRole("navigation", { name: "Event chapters" });
  const first = chapters.getByRole("button", { name: /Chapter 1/ });
  const second = chapters.getByRole("button", { name: /Chapter 2/ });
  await expect(slider).toHaveValue("60");
  await expect(second).toBeEnabled();
  await expect(
    chapters.getByRole("button", { name: /Chapter 3.*Failed/ }),
  ).toBeDisabled();
  await first.click();
  await expect(slider).toHaveValue("0");
  await expect(page.locator(".timeline-note")).toHaveCount(0);
  await expect(first).toHaveAttribute("aria-current", "step");
  await second.click();
  await expect(slider).toHaveValue("30");
  await expect(second).toHaveAttribute("aria-current", "step");
  await page.getByRole("button", { name: /^Checkpoint 1:/ }).click();
  await expect(slider).toHaveValue("0");
  await page
    .getByRole("button", { name: "Play recording", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Pause playback", exact: true }),
  ).toBeVisible();
  await second.click();
  await expect(slider).toHaveValue("30");
  await expect(
    page.getByRole("button", { name: "Play recording", exact: true }),
  ).toBeVisible();
  const sceneBox = await page.locator(".world-pane").boundingBox();
  const panelBox = await page.locator(".event-composer").boundingBox();
  assert.ok(
    sceneBox && panelBox && sceneBox.y + sceneBox.height <= panelBox.y + 1,
    "Scene and controls must occupy separate panes",
  );
  await expect(page.locator(".event-suggestions")).toHaveCount(0);
  await expect(page.locator(".event-prompt")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Process event", exact: true }),
  ).toHaveCount(0);
  await expect(page.locator(".timeline-chapter-track")).toHaveCount(0);
  await expect(page.locator(".place-label")).toHaveCount(0);
  const visiblePeople = run.people.filter(
    (person) => person.presence === "inside",
  ).length;
  const stateIcons = page.locator(".person-state-icons");
  assert.ok((await stateIcons.count()) < visiblePeople);
  assert.ok((await stateIcons.count()) > 0);
  await expect(
    page.locator(".person-state-icons .person-state-icon"),
  ).toHaveCount(0);
  for (const action of ["Walking", "Waiting", "Resting", "Leaving"])
    await expect(page.locator(`[title="${action}"]`)).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Checkpoint / })).toHaveCount(
    2,
  );
  const zoom = page.getByLabel("Scene zoom", { exact: true });
  await expect(zoom).toHaveText("Zoom 175%");
  const canvas = page.locator("canvas");
  await canvas.hover();
  await page.mouse.wheel(0, -200);
  await expect(zoom).not.toHaveText("Zoom 175%");
  assert.ok(Number((await zoom.innerText()).match(/(\d+)%/)![1]) > 175);
  const metricsBox = await page.locator(".world-metrics").boundingBox();
  const composerBox = await page.locator(".event-composer").boundingBox();
  assert.ok(
    metricsBox &&
      composerBox &&
      metricsBox.y + metricsBox.height < composerBox.y,
    "Chapter panel must not cover scene metrics",
  );
  await page.screenshot({ path: "/private/tmp/crowd-chapters-desktop.png" });
  await page.reload();
  await expect(slider).toHaveValue("60");
  await expect(second).toBeEnabled();
  await first.click();
  await expect(slider).toHaveValue("0");
  await page.setViewportSize({ width: 390, height: 844 });
  await second.click();
  await expect(slider).toHaveValue("30");
  await page.screenshot({
    path: "/private/tmp/crowd-chapters-mobile.png",
    fullPage: true,
  });
  assert.deepEqual(writes, []);
  assert.deepEqual(errors, []);
  console.log(
    "PASS: chapter labels, checkpoints, active highlight, pause-on-seek, refresh, mobile, failed chapter, no inference writes; deterministic leave/re-entry recording.",
  );
} finally {
  await browser.close();
}
