import { hydrateQuickBriefs } from "../src/features/hydrateQuickBriefs";
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import {
  inspectHTML,
  commitImport,
  isolatedHTML,
} from "../src/features/import";
import { quickBriefsSchema, indexQuickBriefs } from "../src/data/quickBriefs";
import { LocalRepository } from "../src/data/db";
import { hash } from "../src/data/model";
import { indexArticles } from "../src/data/articles";
import { resolveDay, assessVersion } from "../src/data/day";
import { exportBackup, inspectBackup } from "../src/features/backup";
import { publicGoogleUrl } from "../src/features/PublicGoogleLink";
import { v9Fixture } from "./helpers/v9";
import JSZip from "jszip";

describe("V9 compagnon distinct et conservation", () => {
  it("importe un snapshot tardif seul sans altérer V7 ni les originaux, exporte et restaure", async () => {
    const { p, q, bytes } = v9Fixture();
    const e = await inspectHTML("test.html", bytes);
    expect(e.unified).toEqual(p);
    expect(e.quickBriefs).toEqual(q);
    expect(indexArticles([e])).toHaveLength(p.items.length);
    expect(indexQuickBriefs([e])).toHaveLength(1);
    expect(assessVersion(e, [e]).snapshot?.autonomy).toBe("AUTONOMOUS");
    const db = new LocalRepository("v9-" + crypto.randomUUID());
    try {
      const imported = await commitImport(db, e, bytes, "day");
      expect(await hash((await db.originals.get(imported.id))!.bytes)).toBe(
        await hash(bytes),
      );
      await db.editions.update(imported.id, { quickBriefs: undefined });
      expect(await hydrateQuickBriefs(db, await db.editions.toArray())).toEqual(
        { recovered: 1, errors: [] },
      );
      expect((await db.editions.get(imported.id))!.quickBriefs).toEqual(q);
      const blob = await exportBackup(db);
      const backup = await inspectBackup(
        new Uint8Array(await blob.arrayBuffer()),
      );
      expect(backup.editions[0].quickBriefs).toEqual(q);
      const zip = await JSZip.loadAsync(await blob.arrayBuffer());
      const manifest = JSON.parse(
        await zip.file("manifest.json")!.async("string"),
      );
      delete manifest.editions[0].quickBriefs;
      zip.file("manifest.json", JSON.stringify(manifest));
      const old = await inspectBackup(
        await zip.generateAsync({ type: "uint8array" }),
      );
      expect(old.editions[0].quickBriefs).toEqual(q);
      manifest.editions[0].quickBriefs = { ...q, items: [] };
      zip.file("manifest.json", JSON.stringify(manifest));
      await expect(
        inspectBackup(await zip.generateAsync({ type: "uint8array" })),
      ).rejects.toThrow("différent de l’original");
    } finally {
      await db.delete();
    }
  });
  it("refuse champs inconnus, doublons, dates, identités, mauvais MIME et promotions absentes", async () => {
    const { q, bytes } = v9Fixture();
    const html = new TextDecoder().decode(bytes);
    expect(quickBriefsSchema.safeParse({ ...q, surprise: true }).success).toBe(
      false,
    );
    for (const wrong of [
      { ...q, items: [q.items[0], q.items[0]] },
      { ...q, editionDate: "2026-10-20" },
      { ...q, items: [{ ...q.items[0], publishedAt: "2099-01-01" }] },
      { ...q, items: [{ ...q.items[0], relatedArticleEventId: "missing" }] },
    ]) {
      await expect(
        inspectHTML(
          "test.html",
          new TextEncoder().encode(
            html.replace(JSON.stringify(q), JSON.stringify(wrong)),
          ),
        ),
      ).rejects.toThrow();
    }
    await expect(
      inspectHTML(
        "test.html",
        new TextEncoder().encode(
          html.replace(
            'id="quickBriefsData" type="application/json"',
            'id="quickBriefsData" type="text/javascript"',
          ),
        ),
      ),
    ).rejects.toThrow("inerte");
  });
  it("cumul hors ordre : variantes, omissions et promotion par identité sans titre dédupliqué", async () => {
    const a = v9Fixture("08:00"),
      b = v9Fixture("10:00", "Correction du titre");
    const earlier = await inspectHTML("08.html", a.bytes),
      later = await inspectHTML("10.html", b.bytes);
    const index = indexQuickBriefs([earlier, later]);
    expect(index).toHaveLength(1);
    expect(index[0].item.title).toBe("Correction du titre");
    expect(index[0].history).toHaveLength(1);
    later.quickBriefs!.items = [];
    expect(indexQuickBriefs([later, earlier])).toHaveLength(1);
    later.quickBriefs!.items = [
      {
        ...earlier.quickBriefs!.items[0],
        relatedArticleEventId: later.unified!.items[0].eventId,
      },
    ];
    expect(indexQuickBriefs([earlier, later])[0].promoted).toBe(true);
    expect(resolveDay([earlier, later]).current?.editionSlot).toBe("10:00");
  });
  it.each([100, 600])(
    "accepte %i brèves distinctes sans plafond de quantité ni troncature",
    async (count) => {
      const { q, bytes } = v9Fixture();
      const expanded = {
        ...q,
        items: Array.from({ length: count }, (_, n) => ({
          ...q.items[0],
          eventId: `synthetic.event.${n}`,
          title: `Nouvelle distincte SYNTHÉTIQUE ${n}`,
        })),
      };
      const html = new TextDecoder()
        .decode(bytes)
        .replace(
          JSON.stringify(q).replaceAll("<", "\\u003c"),
          JSON.stringify(expanded).replaceAll("<", "\\u003c"),
        );
      expect(
        new TextEncoder().encode(JSON.stringify(expanded)).length,
      ).toBeLessThan(512 * 1024);
      const e = await inspectHTML(
        "quantity.html",
        new TextEncoder().encode(html),
      );
      expect(e.quickBriefs!.items).toHaveLength(count);
      expect(indexQuickBriefs([e])).toHaveLength(count);
      expect(e.unified!.items).toHaveLength(8);
    },
  );
  it("Google utilise uniquement une question publique contrôlée et encodée", () => {
    const q = "sources publiques : énergie & IA + France ?";
    expect(new URL(publicGoogleUrl(q)).searchParams.get("q")).toBe(q);
    for (const s of [
      undefined,
      "client=secret",
      "token=sk-proj-private",
      "/Users/personne/secret",
      "SENTINEL audit client",
      "user@example.org",
    ])
      expect(publicGoogleUrl(s)).toBe("https://www.google.com/");
  });
});
const real = process.env.SITEGOAT_V9_REAL_HTML;
it.skipIf(!real || !existsSync(real!))(
  "HTML V9 fourni : validation réelle, 19 brèves, 18 articles, 4 SHA exacts",
  async () => {
    const bytes = new Uint8Array(readFileSync(real!)),
      e = await inspectHTML(
        "JOURNAL_360_V9_2026-10-22_EDITION_16H_AUTONOME.html",
        bytes,
      );
    expect(e.sha256).toBe(
      "857eb0dda47f6988c5ca304e1d92e2076e9fa013e0d7f86dcb535b3cde0f33e1",
    );
    expect(e.quickBriefs?.items).toHaveLength(19);
    expect(e.unified?.items).toHaveLength(18);
    expect(e.unified?.economicSnapshots).toHaveLength(10);
    expect(e.unified?.futureInsights).toHaveLength(9);
    for (const p of e.unified!.promptAssets)
      expect(await hash(new TextEncoder().encode(p.content))).toBe(p.sha256);
    const doc = new DOMParser().parseFromString(
      isolatedHTML(bytes, true, undefined, e),
      "text/html",
    );
    expect(
      doc
        .querySelector('meta[http-equiv="Content-Security-Policy"]')
        ?.getAttribute("content"),
    ).toContain("connect-src 'none'");
    expect(doc.querySelector("#articlesList")).toBeTruthy();
  },
);
