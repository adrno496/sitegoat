// Fully synthetic cumulative journals: four daily releases, no V6 metadata needed.
export function dailyFile(
  hour = "08",
  date = "2026-10-15",
  extra: Record<string, unknown> = {},
) {
  const hours = ["08", "12", "16", "21", "22", "23"];
  const items = hours
    .slice(0, hours.indexOf(hour) + 1)
    .map((time, i) => ({
      id: `a${i}`,
      event_id: `event-${i}`,
      title: `Article public fictif ${time}h`,
      category: "Science",
      plain: `Cumul synthétique ${i + 1}.`,
    }));
  const data = {
    title: `Journal synthétique ${date} ${hour}h`,
    editionDate: date,
    items,
    ...extra,
  };
  return {
    name: `LE_JOURNAL_360_${date}_EDITION_${hour}H.html`,
    html: `<!doctype html><html lang="fr"><head><title>${data.title}</title></head><body><h1>${data.title}</h1><p id="release">Édition ${hour}h, ${items.length} articles cumulés.</p><button id="counter" onclick="this.textContent=String(++window.count)">0</button><script>window.count=0</script><script id="editionData" type="application/json">${JSON.stringify(data).replaceAll("<", "\\u003c")}</script></body></html>`,
  };
}
