// Keep every accepted local state within the dedicated backup/restore envelope.
// Original bytes are counted from immutable, hash-checked version metadata.
export function assertFutureBackupBudget(data: {
  versions: { size: number }[];
  contents: unknown[];
  personal: unknown[];
  changes: unknown[];
}) {
  const manifest = JSON.stringify({
    format: "journal360.future.backup",
    version: 1,
    generatedAt: new Date().toISOString(),
    versions: data.versions,
    contents: data.contents,
    personal: data.personal,
    changes: data.changes,
  });
  const metadataBytes = new TextEncoder().encode(manifest).length;
  if (
    data.versions.length > 3000 ||
    data.personal.length > 3000 ||
    data.changes.length > 50000 ||
    metadataBytes > 32 * 1024 * 1024 ||
    metadataBytes + data.versions.reduce((total, v) => total + v.size, 0) >
      150 * 1024 * 1024
  )
    throw Error(
      "Limite de sauvegarde Le Futur atteinte : écriture annulée, données existantes conservées. Aucune suppression automatique.",
    );
  return metadataBytes;
}
