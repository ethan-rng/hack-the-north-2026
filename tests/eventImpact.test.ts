import { describe, expect, it } from "vitest";
import {
  captureFrame,
  newScenario,
  newSegment,
  settlePopulation,
} from "../src/core/playback";
import {
  compileEnvironment,
  fallbackConfiguration,
} from "../src/core/generation";
import { buildEventImpact } from "../src/ui/eventImpact";

describe("event impact brief", () => {
  it("describes a recorded segment with its event title, deltas and people stories", () => {
    const environment = settlePopulation(
      compileEnvironment(
        fallbackConfiguration("Impact test"),
        "Impact test",
        [],
        "unavailable",
        "impact-test",
      ),
    );
    const run = newScenario(environment);
    const segment = newSegment(run, "A safety alert is announced");
    run.events.push({
      id: segment.eventId,
      originalText: segment.originalText,
      title: "Safety alert announced",
      description: "People are asked to leave the area.",
      status: "active",
      startTimeSeconds: 0,
      durationSeconds: 30,
      position: { x: 0, z: 0 },
      effects: [{ kind: "threat", targetId: null, value: 1, subjectKey: null }],
      approximationNotes: [],
      visual: "marker",
      submittedAt: Date.now(),
    });
    const before = captureFrame(run);
    const mover = run.people[0];
    const leaver = run.people[1];
    mover.placeId = environment.places[1].id;
    mover.currentAction = {
      ...mover.currentAction!,
      type: "flee",
      label: "Running away",
    };
    leaver.presence = "exited";
    delete leaver.placeId;
    const service = Object.values(run.services)[0];
    service.queue.push({
      personId: mover.id,
      actionId: "impact-queue",
      joinedAt: 1,
    });
    run.metrics[environment.places[0].id].purchases = 2;
    run.metrics[environment.places[0].id].revenue = 900;
    run.jevAccepted = 4;
    const after = captureFrame(run);

    const impact = buildEventImpact(environment, segment, {
      segmentId: segment.id,
      runId: run.runId,
      frames: [before, after],
    });

    expect(impact?.headline).toBe("Safety alert announced");
    expect(impact?.metrics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "People queued", delta: "+1" }),
        expect.objectContaining({ label: "Purchases", delta: "+2" }),
        expect.objectContaining({ label: "Revenue", delta: "+$9.00" }),
      ]),
    );
    expect(impact?.metrics.map((metric) => metric.label)).not.toContain(
      "People inside",
    );
    expect(impact?.consequences).toEqual(
      expect.arrayContaining([
        "1 person is running away",
        "1 person left the venue",
      ]),
    );
    expect(impact?.stories.map((story) => story.name)).toEqual(
      expect.arrayContaining([mover.displayName, leaver.displayName]),
    );
  });

  it.each(["marker", "ufo"] as const)(
    "does not invent crowd movement from an effect or %s visual",
    (visual) => {
      const environment = settlePopulation(
        compileEnvironment(
          fallbackConfiguration("Impact test"),
          "Impact test",
          [],
          "unavailable",
          "no-reaction",
        ),
      );
      const run = newScenario(environment);
      const segment = newSegment(run, "An offer is announced");
      run.events.push({
        id: segment.eventId,
        originalText: segment.originalText,
        title: "An offer is announced",
        description: "A shop announces an offer.",
        status: "active",
        startTimeSeconds: 0,
        durationSeconds: 30,
        position: { x: 0, z: 0 },
        effects: [
          {
            kind: "discount",
            targetId: run.products[0].id,
            value: 10,
            subjectKey: null,
          },
        ],
        approximationNotes: [],
        visual,
        submittedAt: 0,
      });
      const before = captureFrame(run);
      run.time = 30;
      const impact = buildEventImpact(environment, segment, {
        segmentId: segment.id,
        runId: run.runId,
        frames: [before, captureFrame(run)],
      })!;
      expect(impact.headline).toBe("An offer is announced");
      expect(impact.consequences).toEqual(["0 individual decisions recorded"]);
      expect(impact.summary).toBe(
        "Over 30 simulated seconds: 0 individual decisions recorded.",
      );
      expect(
        impact.metrics.every((metric) => metric.delta === "No change"),
      ).toBe(true);
      expect(impact.stories).toEqual([]);
    },
  );
});
