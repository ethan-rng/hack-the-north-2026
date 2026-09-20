import { request } from "@playwright/test";
import { writeFile } from "node:fs/promises";
const client = await request.newContext({
  baseURL: process.env.SMOKE_URL || "http://localhost:8787",
});
async function state() {
  return (await client.get("/api/session")).json();
}
async function waitFor(check, seconds = 90) {
  for (let i = 0; i < seconds; i++) {
    const s = await state();
    if (check(s)) return s;
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw Error("Timed out awaiting state");
}
try {
  await client.get("/api/session");
  await client.post("/api/setup", {
    data: {
      description:
        "Toronto Pearson Terminal 1: an illustrative terminal area with two gate zones, a security checkpoint modeled as a free timed service, a cafe, a gift shop and a rest area. Use compact assumed demo service times.",
    },
  });
  const ready = await waitFor((s) =>
    ["ready", "failed"].includes(s.setup.status),
  );
  if (!ready.environment) throw Error(ready.setup.message);
  const env = ready.environment;
  console.log(
    JSON.stringify({
      stage: "airport-ready",
      name: env.name,
      research: env.researchStatus,
      sources: env.sources.length,
      services: env.services,
    }),
  );
  await client.post("/api/start");
  const before = await state();
  if (
    before.run.time !== 0 ||
    before.run.status !== "paused" ||
    before.run.jevAccepted !== 0
  )
    throw Error("Airport did not open frozen");
  const gates = env.places.filter((p) =>
    /\bgate\b/i.test([p.name, p.typeLabel, ...p.tags].join(" ")),
  );
  if (gates.length < 2) throw Error("Need two generated gate zones");
  const response = await client.post("/api/events", {
    data: {
      text: `A sign at ${gates[0].name} says journey CC101 now departs from ${gates[1].name}. The new departure deadline is 120 seconds from now.`,
    },
  });
  if (!response.ok()) throw Error(await response.text());
  let s = await waitFor(
    (s) => ["ready", "failed"].includes(s.segments[0]?.status),
    190,
  );
  if (s.segments[0].status !== "ready") throw Error(s.segments[0].message);
  if (s.run.time !== 30 || s.run.status !== "paused")
    throw Error("Segment did not pause at 30 seconds");
  const event = s.run.events[0];
  const recording = await (
    await client.get(`/api/recording?segmentId=${s.segments[0].id}`)
  ).json();
  const initial = recording.frames[0];
  if (initial.time !== 0) throw Error("Missing initial event frame");
  const present = initial.people.filter((p) => p.presence !== "exited");
  if (!present.every((p) => p.knownEventIds.includes(event.id)))
    throw Error("Event did not reach everyone immediately");
  if ("awareness" in event || "radius" in event)
    throw Error("Event still carries a configurable awareness or radius");
  const goalChange = event.effects.find((e) => e.kind === "goal_update");
  if (!goalChange) throw Error("No goal update");
  for (const p of present) {
    const previous = before.run.people.find((person) => person.id === p.id);
    for (const goal of p.goals) {
      const oldGoal = previous.goals.find((g) => g.id === goal.id);
      const expected =
        oldGoal.status === "pending" &&
        oldGoal.subjectKey === goalChange.subjectKey
          ? goalChange.targetId
          : oldGoal.targetId;
      if (goal.targetId !== expected)
        throw Error("Incorrect targeted goal update");
    }
  }
  console.log(
    JSON.stringify({
      stage: "global-awareness",
      immediatelyAware: present.length,
    }),
  );
  console.log(
    JSON.stringify({
      stage: "gate-change",
      event: s.run.events[0],
      affected: s.run.people.filter((p) =>
        p.knownFacts.some((f) => f.subjectKey === "CC101"),
      ).length,
      unrelated: s.run.people.filter(
        (p) =>
          !p.goals.some((g) => g.subjectKey === "CC101") &&
          p.knownFacts.length > 0,
      ).length,
    }),
  );
  if (!s.run.events[0].effects.some((e) => e.kind === "goal_update"))
    throw Error("No goal update");
  await new Promise((resolve) => setTimeout(resolve, 2500));
  const idle = await state();
  if (
    idle.run.time !== s.run.time ||
    idle.run.jevAccepted !== s.run.jevAccepted
  )
    throw Error("Idle airport kept running");
  const completed = env.services
    .filter((s) => s.kind === "timed")
    .reduce(
      (n, service) => n + s.run.metrics[service.placeId].serviceCompletions,
      0,
    );
  console.log(
    JSON.stringify({
      stage: "airport-recorded",
      time: s.run.time,
      decisions: s.run.jevAccepted,
      failures: s.run.jevFailed,
      purchases: s.run.transactions.length,
      timedCompletions: completed,
    }),
  );
  await client.post("/api/finish");
  s = await state();
  await writeFile(
    "/private/tmp/crowd-airport.json",
    JSON.stringify(s, null, 2),
  );
  if (completed === 0) throw Error("No non-retail service completed");
  if (!s.run.transactions.length) throw Error("No live purchase completed");
  if (s.environment.researchStatus !== "succeeded")
    throw Error("Research incomplete");
} finally {
  await client.dispose();
}
