import { it, expect } from "vitest";
import JSZip from "jszip";
import { LocalRepository } from "../src/data/db";
import { inspectHTML } from "../src/features/import";
import { exportBackup, inspectBackup } from "../src/features/backup";
import { v9Fixture } from "./helpers/v9";

it("SG-07 : projection substituée rejetée, original et notes personnels conservés", async () => {
 const db = new LocalRepository(`sg07-${crypto.randomUUID()}`);
 try {
  const {bytes} = v9Fixture();const e=await inspectHTML("test.html", bytes);e.title="Titre personnel";
  await db.saveEdition(e,bytes);await db.notes.add({id:crypto.randomUUID(),editionId:e.id,body:"Note locale",kind:"note",createdAt:e.importedAt,updatedAt:e.importedAt});
  const before=await db.snapshot();
  const clean=await exportBackup(db);expect((await inspectBackup(new Uint8Array(await clean.arrayBuffer()))).editions[0].title).toBe("Titre personnel");
  for (const field of ["summary","publishedAt","source","article"]) {
   const z=await JSZip.loadAsync(await clean.arrayBuffer());const m=JSON.parse(await z.file("manifest.json")!.async("string"));
   if(field==='source') m.editions[0].unified.items[0].sourceRecords[0].url='https://example.org/substitue';
   else if(field==='article') m.editions[0].articles[0].text='Substitué';
   else m.editions[0].unified.items[0][field]=field==='publishedAt'?'2026-10-01T00:00:00Z':'Substitué';
   z.file("manifest.json",JSON.stringify(m));
   await expect(inspectBackup(await z.generateAsync({type:"uint8array"}))).rejects.toThrow('Projection');
   expect(await db.snapshot()).toEqual(before);
  }
 } finally {await db.delete();}
});

