import { test, expect, type Page, type Frame } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";

const question = "Comprendre les aurores boréales";
const validUrl =
  "https://www.google.com/search?hl=fr&udm=50&q=" +
  encodeURIComponent(question);
const request = (url: unknown = validUrl) => ({
  type: "journal360:google-ai:open-request",
  version: 1,
  url,
});
const capability = {
  type: "journal360:google-ai:capability-request",
  version: 1,
};
const dialog = (page: Page) =>
  page.getByRole("dialog", {
    name: "Ouvrir Google Mode IA dans votre navigateur ?",
  });
const policy = (interactive: boolean) =>
  `default-src 'none'; script-src ${interactive ? "'unsafe-inline'" : "'none'"}; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; media-src data: blob:; connect-src 'none'; object-src 'none'; frame-src 'none'; form-action 'none'; base-uri 'none'`;

declare global {
  interface Window {
    googleAiOpenCalls: {
      url: string;
      target?: string;
      features?: string;
      active: boolean;
    }[];
    previousReaderWindow: Window | null;
    replies: number;
  }
}
async function setup(page: Page, interactive = true) {
  await page.addInitScript(() => {
    window.googleAiOpenCalls = [];
    const original = window.open.bind(window);
    window.open = (url, target, features) => {
      window.googleAiOpenCalls.push({
        url: String(url),
        target,
        features,
        active: navigator.userActivation.isActive,
      });
      return original(url, target, features);
    };
  });
  const response = await page.goto("/");
  const parentPolicy = JSON.parse(
    readFileSync("vercel.json", "utf8"),
  ).headers[0].headers.find(
    (h: { key: string }) => h.key === "Content-Security-Policy",
  ).value;
  expect(response?.headers()["content-security-policy"]).toBe(parentPolicy);
  await page
    .getByLabel("Fichiers HTML à importer")
    .setInputFiles("tests/fixtures/google-ai.html");
  await page
    .getByRole("button", {
      name: "Enregistrer dans ma bibliothèque",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Lire Journal Google IA", exact: true })
    .click();
  await expect(
    page
      .frameLocator(".edition-frame")
      .getByRole("heading", { name: "Journal Google IA" }),
  ).toBeVisible();
  await expect(page.locator(".edition-frame")).toHaveAttribute(
    "sandbox",
    "allow-scripts",
  );
  await expect(page.locator("#trust-title")).toHaveCount(0);
  if (interactive) {
    await expect(
      page.frameLocator(".edition-frame").locator("#capability"),
    ).toHaveText(
      JSON.stringify({
        type: "journal360:google-ai:capability",
        version: 1,
        enabled: true,
      }),
    );
  } else {
    await page
      .getByRole("button", { name: "Désactiver JS", exact: true })
      .click();
    await expect(page.locator(".edition-frame")).toHaveAttribute("sandbox", "");
  }
}
async function enable(page: Page) {
  await page.getByRole("button", { name: "Interactif", exact: true }).click();
  await page
    .getByRole("button", {
      name: "Je fais confiance à ce fichier",
      exact: true,
    })
    .click();
  await expect(
    page.frameLocator(".edition-frame").locator("#capability"),
  ).toHaveText(
    JSON.stringify({
      type: "journal360:google-ai:capability",
      version: 1,
      enabled: true,
    }),
  );
}
async function currentFrame(page: Page): Promise<Frame> {
  const handle = await page.locator(".edition-frame").elementHandle();
  const native = await handle?.contentFrame();
  if (!native) throw new Error("Cadre de lecture absent");
  return native;
}
async function send(page: Page, payloads: unknown[]) {
  const frame = await currentFrame(page);
  await frame.evaluate(async (payloads) => {
    await new Promise<void>((resolve) => {
      const acknowledge = (event: MessageEvent) => {
        if (
          event.source === parent &&
          event.data?.type === "journal360:google-ai:capability"
        ) {
          removeEventListener("message", acknowledge);
          resolve();
        }
      };
      addEventListener("message", acknowledge);
      for (const payload of payloads) parent.postMessage(payload, "*");
      parent.postMessage(
        { type: "journal360:google-ai:capability-request", version: 1 },
        "*",
      );
    });
  }, payloads);
}

test("Google IA : mode sûr inchangé, handshake exact, confirmation et annulation sans navigation", async ({
  page,
  context,
}) => {
  const external: string[] = [];
  context.on("request", (req) => {
    if (req.url().startsWith("https://www.google.com/"))
      external.push(req.url());
  });
  await setup(page, false);
  const frame = page.frameLocator(".edition-frame");
  await expect(page.locator(".edition-frame")).toHaveAttribute("sandbox", "");
  expect(await page.locator(".edition-frame").getAttribute("srcdoc")).toContain(
    policy(false),
  );
  await frame.getByText("En savoir plus", { exact: true }).click();
  await expect(dialog(page)).toHaveCount(0);
  expect(context.pages()).toHaveLength(1);
  await enable(page);
  await expect(page.locator(".edition-frame")).toHaveAttribute(
    "sandbox",
    "allow-scripts",
  );
  expect(await page.locator(".edition-frame").getAttribute("srcdoc")).toContain(
    policy(true),
  );
  await frame.getByRole("button", { name: "Tester l’interaction" }).click();
  await page
    .getByRole("button", { name: "Dézoomer le HTML", exact: true })
    .click();
  await frame
    .getByRole("link", { name: "En savoir plus", exact: true })
    .click();
  await expect(dialog(page)).toBeVisible();
  await expect(dialog(page)).toContainText(
    "Le texte de la question sera transmis à Google.",
  );
  await expect(dialog(page).locator(".google-ai-query")).toHaveText(question);
  await expect(
    dialog(page).getByRole("button", { name: "Annuler", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(
    dialog(page).getByRole("button", {
      name: "Ouvrir Google Mode IA",
      exact: true,
    }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    dialog(page).getByRole("button", { name: "Annuler", exact: true }),
  ).toBeFocused();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(external).toEqual([]);
  expect(await page.evaluate(() => window.googleAiOpenCalls)).toEqual([]);
  await page.screenshot({
    path: `test-results/google-ai-confirm-${test.info().project.name}.png`,
  });
  await page.keyboard.press("Escape");
  await expect(dialog(page)).toHaveCount(0);
  await expect(page.locator(".reading-surface-expanded")).toBeVisible();
  await expect(page.getByLabel("Échelle du HTML", { exact: true })).toHaveText(
    "60 %",
  );
  await expect(frame.locator("#counter")).toHaveText("1");
  expect(await (await currentFrame(page)).evaluate(() => location.hash)).toBe(
    "#interaction",
  );
  await frame
    .getByRole("link", { name: "En savoir plus", exact: true })
    .click();
  await dialog(page)
    .getByRole("button", { name: "Annuler", exact: true })
    .click();
  // Editions may create their marked anchors after the original HTML is parsed.
  await (
    await currentFrame(page)
  ).evaluate((url) => {
    const dynamic = document.createElement("a");
    dynamic.textContent = "Lien IA dynamique";
    dynamic.dataset.aiLink = "google-ai-mode";
    dynamic.href = url;
    dynamic.target = "_blank";
    document.body.append(dynamic);
  }, validUrl);
  await frame
    .getByRole("link", { name: "Lien IA dynamique", exact: true })
    .click();
  await expect(dialog(page)).toBeVisible();
  await expect(dialog(page).locator(".google-ai-query")).toHaveText(question);
  await dialog(page)
    .getByRole("button", { name: "Annuler", exact: true })
    .click();
  await frame
    .getByRole("link", { name: "Lien IA dynamique", exact: true })
    .evaluate((link) => link.setAttribute("href", "https://evil.example/"));
  await frame
    .getByRole("link", { name: "Lien IA dynamique", exact: true })
    .click();
  await send(page, []);
  await expect(dialog(page)).toHaveCount(0);
  expect(external).toEqual([]);
  expect(context.pages()).toHaveLength(1);
});

test("Google IA : fenêtres étrangères, anciens cadres, types et URL hostiles refusés", async ({
  page,
  context,
}) => {
  await setup(page);
  await page.evaluate(
    ({ capability, open }) => {
      const foreign = document.createElement("iframe");
      foreign.id = "foreign-reader";
      foreign.hidden = true;
      foreign.sandbox.add("allow-scripts");
      window.addEventListener("message", (event) => {
        if (event.source === foreign.contentWindow) {
          foreign.dataset.events = String(
            Number(foreign.dataset.events || 0) + 1,
          );
        }
      });
      foreign.srcdoc = `<script>window.replies=0;addEventListener('message',()=>window.replies++);parent.postMessage(${JSON.stringify(capability)},'*');parent.postMessage(${JSON.stringify(open)},'*');parent.postMessage({type:'journal360:google-ai:capability-request',version:2},'*');parent.postMessage({type:'journal360:google-ai:question-request',version:2,question:'Texte tiers'},'*');</script>`;
      document.body.append(foreign);
      window.postMessage(open, "*");
    },
    { capability, open: request() },
  );
  await expect(page.locator("#foreign-reader")).toHaveAttribute(
    "data-events",
    "4",
  );
  expect(
    await page
      .frameLocator("#foreign-reader")
      .locator("body")
      .evaluate(() => window.replies),
  ).toBe(0);
  const invalid = [
    "https://www.google.com.evil.example/search?udm=50&q=x",
    "https://google.com.evil.example/search?udm=50&q=x",
    "javascript:alert(1)",
    "http://www.google.com/search?udm=50&q=x",
    "//www.google.com/search?udm=50&q=x",
    "https://www.google.com@evil.example/search?udm=50&q=x",
    "https://user@www.google.com/search?udm=50&q=x",
    "https://www.google.com:444/search?udm=50&q=x",
    "https://www.google.com/../search?udm=50&q=x",
    validUrl + "&url=https://evil.example",
    validUrl + "&redirect=https://evil.example",
    validUrl + "&continue=https://evil.example",
    validUrl + "&q=second",
    "https://www.google.com/search?udm=50&q=%ZZ",
    "not a URL",
    "https://www.google.com/search?udm=50&q=" + "x".repeat(2001),
    "https://www.google.com/search?udm=50&q=" + "x".repeat(4097),
  ];
  await send(page, [
    null,
    [],
    "message",
    { ...request(), version: "1" },
    { ...request(), version: 2 },
    { ...request(), type: "unknown" },
    { ...request(), extra: true },
    request({}),
    {
      type: "journal360:google-ai:question-request",
      version: 2,
      question: "x".repeat(2001),
    },
    {
      type: "journal360:google-ai:question-request",
      version: 2,
      question: "Public",
      url: validUrl,
    },
    {
      type: "journal360:google-ai:question-request",
      version: 3,
      question: "Public",
    },
    ...invalid.map(request),
  ]);
  await expect(dialog(page)).toHaveCount(0);
  expect(await page.evaluate(() => window.googleAiOpenCalls)).toEqual([]);
  await send(page, [request()]);
  await expect(dialog(page)).toBeVisible();
  await page.evaluate(() => {
    window.previousReaderWindow =
      document.querySelector<HTMLIFrameElement>(
        ".edition-frame",
      )!.contentWindow;
  });
  // Simulate a host-driven reload while its header is inert under the dialog.
  await page
    .getByRole("button", { name: "Recharger le HTML", exact: true })
    .evaluate((button: HTMLButtonElement) => button.click());
  await expect(dialog(page)).toHaveCount(0);
  await expect(
    page.frameLocator(".edition-frame").locator("#capability"),
  ).toContainText('"enabled":true');
  await page.evaluate((open) => {
    // WebKit rejects a detached WindowProxy in MessageEventInit.source.
    // Set the source property directly to exercise the same stale-source guard.
    const event = new MessageEvent("message", { origin: "null", data: open });
    Object.defineProperty(event, "source", {
      value: window.previousReaderWindow,
    });
    window.dispatchEvent(event);
  }, request());
  await send(page, []);
  await expect(dialog(page)).toHaveCount(0);
  await page
    .getByRole("button", { name: "Désactiver JS", exact: true })
    .click();
  await expect(page.locator(".edition-frame")).toHaveAttribute("sandbox", "");
  await (
    await currentFrame(page)
  ).evaluate((open) => parent.postMessage(open, "*"), request());
  // A parent message barrier ensures the preceding posted task was processed.
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        const marker = "google-ai-test-barrier";
        addEventListener("message", function done(event) {
          if (event.data === marker) {
            removeEventListener("message", done);
            resolve();
          }
        });
        window.postMessage(marker, "*");
      }),
  );
  await expect(dialog(page)).toHaveCount(0);
  expect(context.pages()).toHaveLength(1);
});

test("Google IA : seule la confirmation ouvre la question affichée, sans opener, referrer ni notes PWA", async ({
  page,
  context,
}) => {
  const requests: string[] = [];
  await context.route("https://www.google.com/**", async (route) => {
    requests.push(route.request().url());
    await route.fulfill({
      contentType: "text/html",
      body: "<!doctype html><title>Google IA simulé</title><p>Destination externe interceptée par le test</p>",
    });
  });
  await setup(page);
  await page
    .getByRole("button", { name: "Réduire la lecture", exact: true })
    .click();
  await page
    .getByLabel("Votre note", { exact: true })
    .fill("NOTE PRIVÉE À NE JAMAIS TRANSMETTRE");
  await page
    .getByRole("button", { name: "Enregistrer la note", exact: true })
    .click();
  await expect(page.locator(".note")).toContainText("NOTE PRIVÉE");
  await page
    .getByRole("button", { name: "Lecture pleine page", exact: true })
    .click();
  // A script can request a confirmation but cannot open an external destination.
  await send(page, [request()]);
  await expect(dialog(page)).toBeVisible();
  await send(page, [
    request("https://www.google.com/search?udm=50&q=Question-remplac%C3%A9e"),
  ]);
  await expect(dialog(page).locator(".google-ai-query")).toHaveText(question);
  expect(requests).toEqual([]);
  expect(await page.evaluate(() => window.googleAiOpenCalls)).toEqual([]);
  const popupEvent = context.waitForEvent("page");
  await dialog(page)
    .getByRole("button", { name: "Ouvrir", exact: true })
    .click();
  const popup = await popupEvent;
  await popup.waitForLoadState("domcontentloaded");
  expect(popup.url()).toBe(validUrl);
  expect(await popup.evaluate(() => window.opener === null)).toBe(true);
  expect(await popup.evaluate(() => document.referrer)).toBe("");
  expect(await page.evaluate(() => window.googleAiOpenCalls)).toEqual([
    {
      url: validUrl,
      target: "_blank",
      features: "noopener,noreferrer",
      active: true,
    },
  ]);
  expect(requests).toEqual([validUrl]);
  await expect(dialog(page)).toHaveCount(0);
  await expect(page.locator(".edition-frame")).toHaveAttribute(
    "sandbox",
    "allow-scripts",
  );
  await popup.close();
});

test("Google IA : lecture et confirmation hors ligne, copie HTML originale intacte", async ({
  page,
  context,
}) => {
  await setup(page);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
  await context.setOffline(true);
  await page.reload();
  await page
    .getByRole("button", { name: "Lire Journal Google IA", exact: true })
    .click();
  await expect(
    page.frameLocator(".edition-frame").locator("#capability"),
  ).toContainText('"enabled":true');
  await page
    .frameLocator(".edition-frame")
    .getByRole("link", { name: "En savoir plus", exact: true })
    .click();
  await expect(dialog(page)).toBeVisible();
  await dialog(page)
    .getByRole("button", { name: "Annuler", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Réduire la lecture", exact: true })
    .click();
  const downloadEvent = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Original intact", exact: true })
    .click();
  expect(readFileSync((await (await downloadEvent).path())!)).toEqual(
    readFileSync("tests/fixtures/google-ai.html"),
  );
  expect(await page.evaluate(() => window.googleAiOpenCalls)).toEqual([]);
  expect(context.pages()).toHaveLength(1);
});
