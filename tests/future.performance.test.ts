import { expect, it } from "vitest";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { performance } from "node:perf_hooks";
import { FutureRepository, normalize } from "../src/features/future/db";
import { inspectFuture } from "../src/features/future/import";
import {
  exportFutureBackup,
  inspectFutureBackup,
  restoreFutureBackup,
} from "../src/features/future/backup";
const template = JSON.parse(
  readFileSync("public/examples/future/EXEMPLE_FUTUR_IA_v1.json", "utf8"),
);
it("1000 dossiers synthétiques : vrai import, recherche, historique, ZIP et restauration", async () => {
  const a = new FutureRepository(`perf-future-${crypto.randomUUID()}`),
    b = new FutureRepository(`perf-future-restore-${crypto.randomUUID()}`);
  const start = performance.now(),
    rss = [process.memoryUsage().rss];
  let rawBytes = 0;
  try {
    for (let batch = 0; batch < 50; batch++) {
      const candidates = [];
      for (let j = 0; j < 20; j++) {
        const p = {
          ...template,
          documentId: `synthetic-${batch * 20 + j}`,
          title: `Prospective synthétique ${batch * 20 + j}`,
        };
        const bytes = new TextEncoder().encode(JSON.stringify(p));
        rawBytes += bytes.length;
        candidates.push(await inspectFuture({ name: "load.json", bytes }));
      }
      await a.importBatch(candidates, new Set(), new Set());
    }
    const imported = performance.now();
    rss.push(process.memoryUsage().rss);
    const docs = await a.documents.orderBy("updatedAt").reverse().toArray();
    const listed = performance.now();
    expect(docs).toHaveLength(1000);
    const filtered = docs.filter((d) =>
      d.search.includes(normalize("prospective synthétique 42")),
    );
    expect(filtered.length).toBeGreaterThan(0);
    const searched = performance.now();
    const blob = await exportFutureBackup(a);
    const exported = performance.now();
    rss.push(process.memoryUsage().rss);
    const data = await inspectFutureBackup(
      new Uint8Array(await blob.arrayBuffer()),
    );
    const inspected = performance.now();
    await restoreFutureBackup(b, data);
    const restored = performance.now();
    rss.push(process.memoryUsage().rss);
    expect(await b.documents.count()).toBe(1000);
    expect(await b.originals.count()).toBe(1000);
    mkdirSync("docs/evidence/future", { recursive: true });
    writeFileSync(
      "docs/evidence/future/performance.json",
      JSON.stringify(
        {
          environment: "Node / jsdom / fake-indexeddb, not a physical phone",
          documents: 1000,
          rawBytes,
          backupBytes: blob.size,
          importMs: imported - start,
          listMetadataMs: listed - imported,
          filterMs: searched - listed,
          exportMs: exported - searched,
          inspectMs: inspected - exported,
          restoreMs: restored - inspected,
          rssBytes: rss,
          peakCheckpointRssBytes: Math.max(...rss),
        },
        null,
        2,
      ) + "\n",
    );
  } finally {
    await a.delete();
    await b.delete();
  }
}, 180000);
