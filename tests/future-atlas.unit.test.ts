import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { validateFuture } from "../src/features/future/import";
import {
  contentCounts,
  timelineItems,
  timelinePeriods,
  periodFor,
  preparationCounts,
  scenarioEvidence,
} from "../src/features/future/selectors";
import { personalSchema } from "../src/features/future/schema";
const fixture = () =>
  validateFuture(
    JSON.parse(
      readFileSync("public/examples/future/EXEMPLE_FUTUR_IA_v1.json", "utf8"),
    ),
  );
describe("Atlas: données fidèles sans mutation", () => {
  it("préserve les textes, années, preuves et liens exacts des trois trajectoires", () => {
    const p = fixture(),
      before = JSON.stringify(p);
    const items = timelineItems(p);
    expect(items.map((m) => m.id).sort()).toEqual(
      p.scenarios.flatMap((s) => s.milestones.map((m) => m.id)).sort(),
    );
    expect(items.every((m, i) => i === 0 || m.year >= items[i - 1].year)).toBe(
      true,
    );
    expect(timelinePeriods(p)).toEqual(["2027", "2030", "2035", "2040+"]);
    expect(contentCounts(p)).toEqual({
      observations: 0,
      hypotheses: 10,
      actions: 3,
    });
    expect(scenarioEvidence(p, "scenario-moderate")).toEqual([
      "https://example.org/illustration",
    ]);
    expect(JSON.stringify(p)).toBe(before);
  });
  it("gère zéro, un et de nombreux éléments, y compris les années hors des repères", () => {
    const p = fixture();
    p.scenarios = [];
    p.signals = [];
    p.actions = [];
    p.visualization.links = [];
    expect(contentCounts(p)).toEqual({
      observations: 0,
      hypotheses: 0,
      actions: 0,
    });
    expect(timelineItems(p)).toEqual([]);
    expect(timelinePeriods(p)).toEqual(["2027", "2030", "2035", "2040+"]);
    p.scenarios = [fixture().scenarios[0]];
    p.scenarios[0].signalIds = [];
    p.scenarios[0].milestones = [
      { ...p.scenarios[0].milestones[0], year: 2028 },
    ];
    expect(timelinePeriods(p)).toContain("2028");
    p.scenarios[0].milestones = Array.from({ length: 100 }, (_, i) => ({
      ...p.scenarios[0].milestones[0],
      id: "many-" + i,
      year: 2040 + (i % 61),
    }));
    expect(timelineItems(p)).toHaveLength(100);
    expect(periodFor(2100)).toBe("2040+");
    expect(contentCounts(p).hypotheses).toBe(101);
  });
  it("compte seulement les statuts personnels des actions encore présentes, sans compter les brouillons", () => {
    const p = fixture(),
      personal = personalSchema.parse({
        documentId: p.documentId,
        updatedAt: new Date().toISOString(),
        actions: {
          "action-now": { status: "done", result: "test" },
          "action-3m": { status: "abandoned", result: "" },
          "ancienne-action": { status: "done", result: "" },
        },
      });
    expect(preparationCounts(p, personal)).toEqual({
      todo: 1,
      doing: 0,
      done: 1,
      abandoned: 1,
    });
  });
  it("détecte les deux injections de données demandées, puis accepte le dossier conforme", () => {
    const p = fixture();
    p.scenarios[0].milestones[0].status = "observed";
    p.scenarios[0].milestones[0].observedAt = "2026-10-16";
    p.scenarios[0].milestones[0].evidenceUrls = [
      "https://example.org/illustration",
    ];
    expect(() => validateFuture(p, new Date("2026-10-17T12:00:00Z"))).toThrow(
      /jalon futur/,
    );
    const q = fixture();
    q.signals[0].evidenceUrls = ["https://example.org/preuve-absente"];
    expect(() => validateFuture(q)).toThrow(/provenance.sources/);
    expect(() => validateFuture(fixture())).not.toThrow();
  });
});
