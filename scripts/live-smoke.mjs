import { chromium } from "@playwright/test";
import { writeFile } from "node:fs/promises";
const origin = process.env.SMOKE_URL || "http://localhost:8787";
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 960 },
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
async function state() {
  return page.evaluate(async () => (await fetch("/api/session")).json());
}
async function waitFor(test, seconds = 90) {
  for (let i = 0; i < seconds; i++) {
    const s = await state();
    if (test(s)) return s;
    await page.waitForTimeout(1000);
  }
  throw Error("Timed out awaiting state");
}
try {
  await page.goto(origin);
  await page.getByRole("button", { name: "Create world" }).waitFor();
  await page.waitForTimeout(3000);
  await page.screenshot({
    path: "/private/tmp/crowd-onboarding.png",
    fullPage: true,
  });
  await page
    .getByLabel("What kind of place are we exploring?")
    .fill(
      "A busy fictional amusement park with two rides, a gift shop, food stalls, a rest garden and a central plaza.",
    );
  await page.getByRole("button", { name: "Create world" }).click();
  console.log("Setup submitted");
  const ready = await waitFor(
    (s) => s.setup.status === "ready" || s.setup.status === "failed",
  );
  await writeFile(
    "/private/tmp/crowd-live-state.json",
    JSON.stringify(ready, null, 2),
  );
  console.log(
    JSON.stringify({
      stage: "ready",
      status: ready.setup.status,
      research: ready.environment?.researchStatus,
      sources: ready.environment?.sources.length,
      name: ready.environment?.name,
      assumptions: ready.environment?.assumptions.slice(0, 2),
    }),
  );
  if (!ready.environment) throw Error(ready.setup.message);
  await page.screenshot({ path: "/private/tmp/crowd-ready.png" });
  await page.getByRole("button", { name: "Start simulation" }).click();
  let s = await waitFor((s) => s.run?.jevAccepted > 0, 40);
  console.log(
    JSON.stringify({
      stage: "live",
      accepted: s.run.jevAccepted,
      failed: s.run.jevFailed,
      time: s.run.time,
    }),
  );
  const fps = await page.evaluate(
    () =>
      new Promise((resolve) => {
        let count = 0;
        const started = performance.now();
        function frame(now) {
          count++;
          if (now - started >= 2500)
            resolve(Math.round((count * 1000) / (now - started)));
          else requestAnimationFrame(frame);
        }
        requestAnimationFrame(frame);
      }),
  );
  console.log(
    JSON.stringify({
      stage: "render-benchmark",
      fps,
      viewport: "1440x960",
      people: 40,
    }),
  );
  await page.getByRole("button", { name: "People", exact: true }).click();
  await page.locator(".entity-scroll button").first().click();
  await page.screenshot({ path: "/private/tmp/crowd-person.png" });
  s = await waitFor((s) => s.run?.time >= 45, 60);
  console.log(
    JSON.stringify({
      stage: "baseline",
      time: s.run.time,
      decisions: s.run.jevAccepted,
      failures: s.run.jevFailed,
      transactions: s.run.transactions.length,
      services: Object.values(s.run.metrics).reduce(
        (n, m) => n + m.serviceCompletions,
        0,
      ),
    }),
  );
  await page.getByRole("button", { name: "Finish run", exact: true }).click();
  await page.getByRole("button", { name: "Reset baseline" }).click();
  const shop = ready.environment.places.find((p) =>
    p.capabilities.includes("purchase"),
  );
  await page
    .getByLabel("Describe an event")
    .fill(`Announce 20 percent off at ${shop.name} for 20 seconds.`);
  await page.getByRole("button", { name: "Introduce event" }).click();
  s = await waitFor(
    (s) => s.run?.events[0]?.status !== "interpreting" && s.run?.events.length,
    30,
  );
  console.log(JSON.stringify({ stage: "promotion", event: s.run.events[0] }));
  await page
    .getByLabel("Describe an event")
    .fill("A dinosaur enters the central plaza for 20 seconds.");
  await page.getByRole("button", { name: "Introduce event" }).click();
  s = await waitFor(
    (s) =>
      s.run?.events[1]?.status !== "interpreting" && s.run?.events.length === 2,
    30,
  );
  console.log(
    JSON.stringify({
      stage: "dinosaur",
      status: s.run.events[1].status,
      visual: s.run.events[1].visual,
      effects: s.run.events[1].effects,
    }),
  );
  await page.screenshot({ path: "/private/tmp/crowd-dinosaur.png" });
  s = await waitFor((s) => s.results.length === 2, 65);
  await page
    .locator(".inspector-tabs")
    .getByRole("button", { name: "Compare", exact: true })
    .click();
  await page.screenshot({ path: "/private/tmp/crowd-comparison.png" });
  console.log(
    JSON.stringify({
      stage: "comparison",
      durations: s.results.map((r) => r.duration),
      results: s.results.map((r) => r.totals),
      errors,
    }),
  );
  await context.storageState({
    path: "/private/tmp/crowd-browser-session.json",
  });
  await writeFile(
    "/private/tmp/crowd-live-final.json",
    JSON.stringify(s, null, 2),
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "/private/tmp/crowd-mobile.png",
    fullPage: true,
  });
  if (errors.length) throw Error(errors.join(";"));
  if (s.results[0].duration !== s.results[1].duration)
    throw Error("Comparison duration mismatch");
  if (!ready.environment.sources.length)
    throw Error("Research did not return live sources");
  if (
    s.run.events.some(
      (e) => e.status === "failed" || e.status === "unsupported",
    )
  )
    throw Error("Event did not activate");
} finally {
  await browser.close();
}
