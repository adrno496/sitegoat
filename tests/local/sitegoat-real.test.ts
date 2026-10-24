import { it, expect } from "vitest";
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { performance } from "node:perf_hooks";
import { inspectHTML, commitImport } from "../../src/features/import";
import { hash } from "../../src/data/model";
import { LocalRepository } from "../../src/data/db";
import { indexArticles, matchesArticle } from "../../src/data/articles";
import { indexQuickNews } from "../../src/data/quickNews";
import {
  exportBackup,
  inspectBackup,
  restoreBackup,
} from "../../src/features/backup";
import { auditLoadPayload, auditHTML } from "../helpers/audit";
const root = "audits/sitegoat/implementation-2026-10-24/preuves/";
it("référence privée locale : 19 articles, 35 brèves, 5 prompts, 35 titres, réimport et restauration exacts", async () => {
  const file = process.env.SITEGOAT_AUDIT_HTML;
  if (!file) throw Error("SITEGOAT_AUDIT_HTML requis");
  const bytes = new Uint8Array(readFileSync(file));
  expect(bytes.length).toBe(282997);
  expect(await hash(bytes)).toBe(
    "8ae5eb2bea9dde338b09ba73d3b0082d278fb0ebf9d1472a9db479e6e111e45c",
  );
  const db = new LocalRepository("real-isolated-" + crypto.randomUUID()),
    fresh = new LocalRepository("real-fresh-" + crypto.randomUUID());
  try {
    const e = await inspectHTML("real.html", bytes);
    expect(e.articles).toHaveLength(19);
    expect(e.quickBriefs!.items).toHaveLength(35);
    expect(e.unified!.promptAssets).toHaveLength(5);
    expect(indexQuickNews([e])).toHaveLength(35);
    expect(
      e.unified!.items.every((i) => i.publishedAt.slice(0, 10) < "2026-10-24"),
    ).toBe(true);
    expect(
      e.quickBriefs!.items.filter((i) => i.publishedAt === "2026-10-24"),
    ).toHaveLength(1);
    for (let n = 0; n < 3; n++)
      await commitImport(
        db,
        await inspectHTML("real.html", bytes),
        bytes,
        "day",
      );
    expect(await db.editions.count()).toBe(1);
    expect(await db.originals.count()).toBe(1);
    const start = performance.now(),
      zip = await exportBackup(db),
      duration = performance.now() - start;
    await restoreBackup(
      fresh,
      await inspectBackup(new Uint8Array(await zip.arrayBuffer())),
    );
    expect(Array.from((await fresh.originals.toArray())[0].bytes)).toEqual(
      Array.from(bytes),
    );
    expect(indexArticles(await fresh.editions.toArray())).toHaveLength(19);
    writeFileSync(
      root + "real-local.json",
      JSON.stringify(
        {
          bytes: bytes.length,
          sha256: e.sha256,
          articles: 19,
          briefs: 35,
          prompts: 5,
          titles: 35,
          publicationsBeforeEdition: 19,
          briefsOn24: 1,
          reimports: 3,
          editions: 1,
          originals: 1,
          zipBytes: zip.size,
          exportMs: duration,
          restored: true,
        },
        null,
        2,
      ),
    );
  } finally {
    await db.delete();
    await fresh.delete();
  }
});
it("tous les exemples locaux inspectés comme données inertes ; performances synthétiques 100/1000 et recherche", async () => {
  const directory = process.env.SITEGOAT_EXAMPLE_DIR;
  if (!directory) throw Error("SITEGOAT_EXAMPLE_DIR requis");
  const results = [];
  for (const f of readdirSync(directory).filter((f) =>
    /^JOURNAL_360_V9.*\.html$/.test(f),
  )) {
    const bytes = new Uint8Array(readFileSync(directory + "/" + f));
    try {
      const e = await inspectHTML(f, bytes);
      results.push({
        file: f,
        status: "ACCEPTE",
        bytes: bytes.length,
        articles: e.articles.length,
        briefs: e.quickBriefs?.items.length || 0,
        prompts: e.unified?.promptAssets.length || 0,
      });
    } catch (error) {
      results.push({
        file: f,
        status: "REFUSE",
        diagnostic: String(error).slice(0, 400),
      });
    }
  }
  const loads = [];
  for (const n of [100, 1000]) {
    const bytes = auditHTML(auditLoadPayload(n)),
      times = [];
    for (let k = 0; k < 3; k++) {
      const start = performance.now(),
        e = await inspectHTML("synthetic.html", bytes),
        items = indexArticles([e]);
      expect(items).toHaveLength(n);
      const search = performance.now();
      items.filter((i) => matchesArticle(i, "synthétique"));
      times.push({
        inspectAndIndexMs: search - start,
        searchMs: performance.now() - search,
      });
    }
    loads.push({ items: n, bytes: bytes.length, times });
  }
  writeFileSync(
    root + "examples-and-performance.json",
    JSON.stringify({ examples: results, loads }, null, 2),
  );
  expect(results.length).toBeGreaterThan(0);
}, 60000);
