import fs from "node:fs";
import { chromium, webkit } from "playwright";
const file = process.argv[2];
if (!file || !fs.existsSync(file))
  throw new Error(
    "Fournissez le chemin d’un HTML réel, conservé hors du dépôt.",
  );
const baseURL = process.env.JOURNAL360_BASE_URL || "http://127.0.0.1:4173";
const original = fs.readFileSync(file);
const results = [];
for (const [engine, browserType] of Object.entries({ chromium, webkit })) {
  const browser = await browserType.launch();
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    acceptDownloads: true,
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.name));
  try {
    await page.goto(baseURL);
    await page.getByLabel("Fichiers HTML à importer").setInputFiles(file);
    await page
      .getByLabel("Titre", { exact: true })
      .fill("Édition réelle de test");
    await page
      .getByRole("button", { name: "Enregistrer dans ma bibliothèque" })
      .click();
    await page
      .getByRole("button", { name: "Lire Édition réelle de test", exact: true })
      .click();
    await page.getByRole("dialog").waitFor();
    await page.locator('.edition-frame[sandbox="allow-scripts"]').waitFor();
    if (
      (await page.locator("iframe").getAttribute("sandbox")) !== "allow-scripts"
    )
      throw new Error("Le lecteur n’est pas interactif par défaut.");
    const frame = page.frameLocator("iframe");
    async function clickInFrame(locator) {
      await locator.click();
    }

    await frame.locator("#homeStories .storycard").first().waitFor();
    for (const view of [
      "articles",
      "business",
      "sentinel",
      "actions",
      "sources",
      "accueil",
    ]) {
      await clickInFrame(frame.locator(`nav button[data-view="${view}"]`));
      await frame.locator(`main section[data-view="${view}"]`).waitFor();
    }
    await clickInFrame(frame.locator('nav button[data-view="articles"]'));
    await clickInFrame(
      frame
        .getByRole("button", { name: "Lire l’article complet →", exact: true })
        .first(),
    );
    await frame.locator('main section[data-view="lecture"]').waitFor();
    await clickInFrame(frame.locator('nav button[data-view="business"]'));
    const before = await frame.locator("#result").innerText();
    await frame.locator("#price").fill("234");
    const after = await frame.locator("#result").innerText();
    if (before === after) throw new Error("Calculatrice inactive");
    const bounds = await page.locator("iframe").boundingBox();
    if (Math.abs(bounds.width - 390) > 1 || bounds.height < 650)
      throw new Error("Écran incomplet");
    await page
      .getByRole("button", { name: "Réduire la lecture", exact: true })
      .click();
    const downloadPromise = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Original intact", exact: true })
      .click();
    const download = await downloadPromise;
    if (!fs.readFileSync(await download.path()).equals(original))
      throw new Error("Original modifié");
    await page.reload();
    await page
      .getByRole("button", { name: "Lire Édition réelle de test", exact: true })
      .click();
    await frame.locator("#homeStories .storycard").first().waitFor();
    results.push({
      engine,
      status: "PASS",
      bytes: original.length,
      nativeArticleCount: await frame
        .locator("#homeStories .storycard")
        .count(),
      fullPage: true,
      htmlZoom: await page
        .getByLabel("Échelle du HTML", { exact: true })
        .innerText(),
      tabs: true,
      articleReading: true,
      calculator: true,
      originalIntact: true,
      trustRemembered: true,
      scriptErrors: errors.length,
    });
    if (errors.length) {
      console.log("Erreurs JavaScript, moteur " + engine);
      console.log(errors.map((name) => ({ name })));
    }
  } catch {
    await page.screenshot({ path: "/tmp/journal360-real-mobile.png" });
    const child = page.frames().find((f) => f.url().startsWith("about:srcdoc"));
    if (child)
      console.log(
        await child.evaluate(() => {
          const button = document.querySelector(
            'nav button[data-view="articles"]',
          );
          const r = button.getBoundingClientRect();
          return {
            innerWidth,
            innerHeight,
            buttonRect: { x: r.x, y: r.y, width: r.width, height: r.height },
            atCenter: document.elementFromPoint(
              r.x + r.width / 2,
              r.y + r.height / 2,
            )?.tagName,
          };
        }),
      );
    throw new Error("Parcours réel incomplet : " + engine);
  } finally {
    await context.close();
    await browser.close();
  }
}
fs.writeFileSync(
  "docs/evidence/real-html.json",
  JSON.stringify(
    {
      testedAt: new Date().toISOString(),
      baseURL,
      environment:
        "Fichier réel local, deux moteurs automatisés, aucun envoi cloud ni contenu publié",
      results,
    },
    null,
    2,
  ) + "\n",
);
console.log(JSON.stringify(results, null, 2));
