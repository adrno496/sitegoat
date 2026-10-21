// A prefix of the original text, never a generated summary. Decimal points and
// French abbreviations do not end a sentence. Keep complete sentences even long.
export function summaryPreview(text: string, maxSentences = 2): string {
  const value = text.trim();
  let count = 0;
  const end = /[.!?…]+(?:[ \u00a0\u202f]*[»”"')\]])*(?:\s+|$)/gu;
  for (const m of value.matchAll(end)) {
    const before = value.slice(0, m.index + 1);
    if (
      /(?:\b(?:M|Mme|Mlle|Dr|Pr|etc|env|cf|art|n°)\.|\b[A-Z]\.)$/u.test(before)
    )
      continue;
    count++;
    if (count === maxSentences)
      return value.slice(0, m.index + m[0].trimEnd().length);
  }
  return value;
}
