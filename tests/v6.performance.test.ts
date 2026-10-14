import { expect, it } from "vitest";
import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import { performance } from "node:perf_hooks";
import { LocalRepository } from "../src/data/db";
import { currentEditions } from "../src/data/day";
import { inspectHTML, commitImport } from "../src/features/import";
import {
  exportBackup,
  inspectBackup,
  restoreBackup,
} from "../src/features/backup";
import { v6Bytes } from "./helpers/v6";
const measurements: object[] = [];
for (const days of [30, 180, 365])
  it(`charge synthétique ${days} jours × 3 versions, ZIP et restauration vide`, async () => {
    const repository = new LocalRepository(`perf-${crypto.randomUUID()}`);
    const fresh = new LocalRepository(`perf-restore-${crypto.randomUUID()}`);
    const start = performance.now();
    const checkpoints: number[] = [process.memoryUsage().rss];
    let rawBytes = 0;
    try {
      for (let day = 0; day < days; day++) {
        const date = new Date(Date.UTC(2025, 0, day + 1))
          .toISOString()
          .slice(0, 10);
        for (const revision of [1, 2, 3]) {
          // Incompressible synthetic load. No real journal, photo or private data.
          const bytes = v6Bytes({
            date,
            revision,
            padding: randomBytes(32 * 1024).toString("base64"),
          });
          rawBytes += bytes.length;
          await commitImport(
            repository,
            await inspectHTML("synthetic.html", bytes),
            bytes,
            "day",
          );
        }
      }
      const imported = performance.now();
      checkpoints.push(process.memoryUsage().rss);
      const snapshot = await repository.snapshot();
      const viewStart = performance.now();
      expect(currentEditions(snapshot.editions)).toHaveLength(days);
      const viewMs = performance.now() - viewStart;
      await repository.reading(snapshot.editions[0].id, "edition", {
        favorite: true,
      });
      await repository.notes.add({
        id: crypto.randomUUID(),
        editionId: snapshot.editions[0].id,
        kind: "note",
        body: "Note synthétique",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      const zipStart = performance.now();
      const zip = await exportBackup(repository);
      const zipDone = performance.now();
      checkpoints.push(process.memoryUsage().rss);
      const parsed = await inspectBackup(
        new Uint8Array(await zip.arrayBuffer()),
      );
      const inspected = performance.now();
      await restoreBackup(fresh, parsed);
      const restored = performance.now();
      checkpoints.push(process.memoryUsage().rss);
      expect(await fresh.editions.count()).toBe(days * 3);
      expect(await fresh.originals.count()).toBe(days * 3);
      expect(await fresh.notes.count()).toBe(1);
      expect((await fresh.states.toArray())[0].favorite).toBe(true);
      // inspectBackup has checked every original byte count and SHA-256.
      measurements.push({
        days,
        versions: days * 3,
        rawBytes,
        zipBytes: zip.size,
        importMs: imported - start,
        groupingMs: viewMs,
        exportMs: zipDone - zipStart,
        inspectMs: inspected - zipDone,
        restoreMs: restored - inspected,
        maxCheckpointRssBytes: Math.max(...checkpoints),
        checkpointsRssBytes: checkpoints,
      });
      writeFileSync(
        "docs/evidence/v6/performance.json",
        JSON.stringify(
          {
            environment:
              "Node + jsdom + fake-indexeddb; RAM aux points de contrôle, pas pic garanti ni appareil mobile; remplissage aléatoire 32 KiB/version",
            measurements,
          },
          null,
          2,
        ),
      );
    } finally {
      await repository.delete();
      await fresh.delete();
    }
  });
