import { db } from "../data/db";
interface LaunchFile {
  getFile: () => Promise<File>;
}
interface LaunchQueue {
  setConsumer: (consumer: (params: { files: LaunchFile[] }) => void) => void;
}
export function registerFileHandling(onError: (message: string) => void) {
  const queue = (window as unknown as { launchQueue?: LaunchQueue })
    .launchQueue;
  if (!queue) return false;
  queue.setConsumer((params) => {
    void (async () => {
      if (params.files.length > 20)
        throw new Error("Ouvrez au maximum 20 fichiers à la fois.");
      const pending = [];
      let size = 0;
      for (const handle of params.files) {
        const f = await handle.getFile();
        if (!/\.html?$/i.test(f.name) || !f.size || f.size > 10 * 1024 * 1024)
          throw new Error("Fichier HTML attendu, de 10 Mo maximum.");
        size += f.size;
        if (size > 100 * 1024 * 1024)
          throw new Error("Import limité à 100 Mo par sélection.");
        pending.push({
          id: crypto.randomUUID(),
          filename: f.name,
          bytes: new Uint8Array(await f.arrayBuffer()),
          createdAt: new Date().toISOString(),
        });
      }
      if (pending.length) await db.pending.bulkAdd(pending);
    })().catch((e) =>
      onError(
        e instanceof Error ? e.message : "Impossible d’ouvrir le fichier.",
      ),
    );
  });
  return true;
}
