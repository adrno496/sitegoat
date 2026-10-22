import { test, expect, type Page } from "@playwright/test";

const question = "Question publique fictive : collisions, modèles + & % # 🙂";
const standard = (q: string) =>
  "https://www.google.com/search?" + new URLSearchParams({ hl: "fr", q });
const html = `<!doctype html><html lang="fr"><head><title>Diagnostic Google public</title></head><body><h1>Diagnostic Google public</h1><button id="prepare">En savoir plus</button><dialog id="googleDialog"><h2>Recherche</h2><textarea id="question"></textarea><a id="search" target="_blank" rel="noopener noreferrer">Recherche Google avec la question ↗</a><a id="ai" href="https://www.google.com/ai" target="_blank" rel="noopener noreferrer">Google Mode IA</a><p id="feedback"></p></dialog><script id="editionData" type="application/json">{"schemaVersion":"6.2","title":"Diagnostic Google public","items":[]}</script><script>document.querySelector('#prepare').onclick=()=>{document.querySelector('#question').value=${JSON.stringify(question)};document.querySelector('#search').href='https://www.google.com/search?'+new URLSearchParams({hl:'fr',q:document.querySelector('#question').value});document.querySelector('dialog').showModal()};document.querySelector('#ai').onclick=()=>document.querySelector('#feedback').textContent="Google Mode IA va s’ouvrir";</script></body></html>`;
const modal = (page: Page) =>
  page.getByRole("dialog", {
    name: "Ouvrir Google dans votre navigateur ?",
    exact: true,
  });
async function frame(page: Page) {
  return (await (await page
    .locator(".edition-frame")
    .elementHandle())!.contentFrame())!;
}
async function setup(page: Page) {
  await page.goto("/");
  await page.getByLabel("Fichiers HTML à importer").setInputFiles({
    name: "diagnostic-google.html",
    mimeType: "text/html",
    buffer: Buffer.from(html),
  });
  await page
    .getByRole("button", {
      name: "Enregistrer dans ma bibliothèque",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Lire Diagnostic Google public", exact: true })
    .click();
  await expect(
    page.frameLocator(".edition-frame").locator("#prepare"),
  ).toBeVisible();
  await expect(page.locator(".edition-frame")).toHaveAttribute(
    "sandbox",
    "allow-scripts",
  );
}
async function capability(page: Page) {
  return (await frame(page)).evaluate(
    () =>
      new Promise<{ nonce: string; expiresAt: number }>((resolve) => {
        const receive = (event: MessageEvent) => {
          if (
            event.source === parent &&
            event.data?.type === "journal360:google-ai:capability" &&
            event.data.version === 3
          ) {
            removeEventListener("message", receive);
            resolve(event.data);
          }
        };
        addEventListener("message", receive);
        parent.postMessage(
          { type: "journal360:google-ai:capability-request", version: 3 },
          "*",
        );
      }),
  );
}
async function send(page: Page, packets: unknown[]) {
  await (
    await frame(page)
  ).evaluate(
    (packets) =>
      new Promise<void>((resolve) => {
        const receive = (event: MessageEvent) => {
          if (
            event.source === parent &&
            event.data?.type === "journal360:google-ai:capability" &&
            event.data.version === 1
          ) {
            removeEventListener("message", receive);
            resolve();
          }
        };
        addEventListener("message", receive);
        for (const packet of packets) parent.postMessage(packet, "*");
        parent.postMessage(
          { type: "journal360:google-ai:capability-request", version: 1 },
          "*",
        );
      }),
    packets,
  );
}
const packet = (nonce: string, extra = {}) => ({
  type: "journal360:google-ai:question-request",
  version: 3,
  nonce,
  requestId: crypto.randomUUID().replaceAll("-", ""),
  question,
  ...extra,
});

test("lien Google classique dynamique : confirmation, question exacte, lien de repli et entrée IA sans question", async ({
  page,
  context,
}) => {
  const requests: string[] = [];
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (text: string) => {
          (window as unknown as { copied: string }).copied = text;
        },
      },
    }),
  );
  await context.route("https://www.google.com/**", (r) => {
    requests.push(r.request().url());
    return r.fulfill({
      contentType: "text/html",
      body: "<title>Google simulé</title>",
    });
  });
  await setup(page);
  const child = page.frameLocator(".edition-frame");
  await child.locator("#prepare").click();
  await child.locator("#search").click();
  await expect(modal(page)).toBeVisible();
  await expect(modal(page).getByRole("textbox")).toHaveValue(question);
  expect(requests).toEqual([]);
  expect(context.pages()).toHaveLength(1);
  expect((await frame(page)).url()).toBe("about:srcdoc");
  const opened = context.waitForEvent("page");
  await modal(page)
    .getByRole("button", { name: "Rechercher sur Google", exact: true })
    .click();
  const google = await opened;
  await google.waitForLoadState("domcontentloaded");
  expect(google.url()).toBe(standard(question));
  expect(
    await google.evaluate(() => opener === null && document.referrer === ""),
  ).toBe(true);
  await google.close();
  await expect(modal(page)).toBeVisible();
  await expect(modal(page).getByRole("textbox")).toHaveValue(question);
  const fallback = modal(page).getByRole("link", {
    name: "Recherche Google avec la question ↗",
    exact: true,
  });
  await expect(fallback).toHaveAttribute("href", standard(question));
  await expect(fallback).toHaveAttribute("rel", "noopener noreferrer");
  const retry = context.waitForEvent("page");
  await fallback.click();
  const retried = await retry;
  await retried.waitForLoadState("domcontentloaded");
  expect(retried.url()).toBe(standard(question));
  await retried.close();
  await modal(page)
    .getByRole("button", { name: "Annuler", exact: true })
    .click();
  await child.locator("#ai").click();
  await expect(modal(page).getByRole("textbox")).toHaveValue(question);
  await expect(child.locator("#feedback")).toHaveText("");
  await modal(page)
    .getByRole("button", { name: "Copier la question", exact: true })
    .click();
  expect(
    await page.evaluate(() => (window as unknown as { copied: string }).copied),
  ).toBe(question);
  const entry = context.waitForEvent("page");
  await modal(page)
    .getByRole("button", { name: "Ouvrir Google Mode IA", exact: true })
    .click();
  const ai = await entry;
  await ai.waitForLoadState("domcontentloaded");
  expect(ai.url()).toBe("https://www.google.com/ai");
  await ai.close();
  expect(requests).toEqual([
    standard(question),
    standard(question),
    "https://www.google.com/ai",
  ]);
  await expect(modal(page).getByRole("textbox")).toHaveValue(question);
  await page.screenshot({
    path: test.info().outputPath("google-parent-confirmation.png"),
  });
});

test("session : source exacte, origine opaque insuffisante, nonce, rejeu, expiration et renouvellement du cadre", async ({
  page,
}) => {
  await setup(page);
  const first = await capability(page),
    valid = packet(first.nonce, {
      requestId: "abcdef0123456789abcdef0123456789",
    });
  await page.evaluate((valid) => {
    const foreign = document.createElement("iframe");
    foreign.id = "foreign-google";
    foreign.hidden = true;
    foreign.sandbox.add("allow-scripts");
    addEventListener("message", (event) => {
      if (event.source === foreign.contentWindow)
        foreign.dataset.sent = String(Number(foreign.dataset.sent || 0) + 1);
    });
    foreign.srcdoc = `<script>window.replies=0;addEventListener('message',()=>window.replies++);parent.postMessage(${JSON.stringify(valid)},'*');parent.postMessage({type:'journal360:google-ai:capability-request',version:3},'*');</script>`;
    document.body.append(foreign);
    const source =
      document.querySelector<HTMLIFrameElement>(
        ".edition-frame",
      )!.contentWindow;
    dispatchEvent(
      new MessageEvent("message", {
        source,
        origin: "https://evil.example",
        data: valid,
      }),
    );
    window.postMessage(valid, "*");
  }, valid);
  await expect(page.locator("#foreign-google")).toHaveAttribute(
    "data-sent",
    "2",
  );
  expect(
    await page
      .frameLocator("#foreign-google")
      .locator("body")
      .evaluate(() => (window as unknown as { replies: number }).replies),
  ).toBe(0);
  await send(page, [
    packet("00000000-0000-0000-0000-000000000000"),
    { ...valid, nonce: undefined },
    { ...valid, extra: 1 },
    { type: "journal360:google-ai:question-request", version: 2, question },
    { ...valid, question: "x".repeat(2001) },
  ]);
  await expect(modal(page)).toHaveCount(0);
  expect(page.context().pages()).toHaveLength(1);
  await send(page, [valid]);
  await expect(modal(page)).toBeVisible();
  await modal(page)
    .getByRole("button", { name: "Annuler", exact: true })
    .click();
  await send(page, [
    valid,
    { ...valid, requestId: valid.requestId.toUpperCase() },
  ]);
  await expect(modal(page)).toHaveCount(0);
  await page.clock.install();
  await page.clock.fastForward(300001);
  await send(page, [packet(first.nonce)]);
  await expect(modal(page)).toHaveCount(0);
  const renewed = await capability(page);
  expect(renewed.nonce).not.toBe(first.nonce);
  await send(page, [packet(renewed.nonce)]);
  await expect(modal(page)).toBeVisible();
  await page.clock.fastForward(300001);
  await modal(page)
    .getByRole("button", { name: "Rechercher sur Google", exact: true })
    .click();
  await expect(modal(page)).toHaveCount(0);
  expect(page.context().pages()).toHaveLength(1);
  await page
    .locator('button[aria-label="Recharger le HTML"]')
    .evaluate((button: HTMLButtonElement) => button.click());
  const replacement = await capability(page);
  expect(replacement.nonce).not.toBe(renewed.nonce);
  await send(page, [packet(renewed.nonce)]);
  await expect(modal(page)).toHaveCount(0);
  await send(page, [packet(replacement.nonce)]);
  await expect(modal(page)).toBeVisible();
});

test("question sensible refusée, offline, copie manuelle, ouverture silencieusement bloquée et exception", async ({
  page,
  context,
}) => {
  const calls: { url: string; active: boolean }[] = [];
  await page.exposeFunction(
    "recordGoogleCall",
    (url: string, active: boolean) => {
      calls.push({ url, active });
    },
  );
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async () => {
          throw new Error("denied");
        },
      },
    });
    window.open = (url) => {
      void (
        window as unknown as {
          recordGoogleCall: (url: string, active: boolean) => Promise<void>;
        }
      ).recordGoogleCall(String(url), navigator.userActivation.isActive);
      return null;
    };
  });
  await setup(page);
  await page.frameLocator(".edition-frame").locator("#prepare").click();
  await page.frameLocator(".edition-frame").locator("#search").click();
  const editor = modal(page).getByRole("textbox");
  for (const secret of [
    "Projet AXDIA client: Exemple",
    "api_key=FAUX_EXEMPLE",
    "contact@example.test",
  ]) {
    await editor.fill(secret);
    await expect(modal(page).getByRole("alert")).toBeVisible();
    await expect(
      modal(page).getByRole("button", {
        name: "Rechercher sur Google",
        exact: true,
      }),
    ).toBeDisabled();
    await expect(
      modal(page).getByRole("button", {
        name: "Ouvrir Google Mode IA",
        exact: true,
      }),
    ).toBeDisabled();
  }
  expect(calls).toEqual([]);
  await editor.fill(question);
  await modal(page)
    .getByRole("button", { name: "Copier la question", exact: true })
    .click();
  await expect(modal(page)).toContainText("Copie indisponible");
  await editor.evaluate((element: HTMLTextAreaElement) => element.select());
  expect(
    await editor.evaluate(
      (element: HTMLTextAreaElement) =>
        element.selectionEnd - element.selectionStart,
    ),
  ).toBe(question.length);
  await context.setOffline(true);
  await modal(page)
    .getByRole("button", { name: "Rechercher sur Google", exact: true })
    .click();
  await expect(modal(page)).toContainText("Hors ligne");
  expect(calls).toEqual([]);
  await context.setOffline(false);
  await modal(page)
    .getByRole("button", { name: "Rechercher sur Google", exact: true })
    .click();
  await expect(modal(page)).toContainText("Ouverture demandée");
  await expect.poll(() => calls.length).toBe(1);
  expect(calls[0]).toEqual({ url: standard(question), active: true });
  expect(context.pages()).toHaveLength(1);
  await expect(
    modal(page).getByRole("link", {
      name: "Recherche Google avec la question ↗",
      exact: true,
    }),
  ).toHaveAttribute("href", standard(question));
  await page.evaluate(() => {
    window.open = () => {
      throw new Error("No external browser");
    };
  });
  await modal(page)
    .getByRole("button", { name: "Ouvrir Google Mode IA", exact: true })
    .click();
  await expect(modal(page)).toContainText("Ouverture indisponible");
  await expect(
    modal(page).getByRole("link", {
      name: "Ouvrir directement Google Mode IA",
      exact: true,
    }),
  ).toHaveAttribute("href", "https://www.google.com/ai");
  await expect(editor).toHaveValue(question);
});

test("HTML autonome : lien classique en nouvel onglet et entrée IA sans préremplissage revendiqué", async ({
  page,
  context,
}) => {
  await context.route("https://fixture.example.test/**", (r) =>
    r.fulfill({
      contentType: "text/html",
      body: `<html lang="fr"><title>HTML autonome synthétique</title><a id="search" href="${standard(question).replaceAll("&", "&amp;")}" target="_blank" rel="noopener noreferrer">Recherche Google avec la question ↗</a><a id="ai" href="https://www.google.com/ai" target="_blank" rel="noopener noreferrer">Copiez puis collez la question dans le Mode IA</a></html>`,
    }),
  );
  await context.route("https://www.google.com/**", (r) =>
    r.fulfill({
      contentType: "text/html",
      body: "<title>Google simulé</title>",
    }),
  );
  await page.goto("https://fixture.example.test/");
  for (const [id, url] of [
    ["search", standard(question)],
    ["ai", "https://www.google.com/ai"],
  ]) {
    const next = context.waitForEvent("page");
    await page.locator("#" + id).click();
    const popup = await next;
    await popup.waitForLoadState("domcontentloaded");
    expect(popup.url()).toBe(url);
    expect(
      await popup.evaluate(() => opener === null && document.referrer === ""),
    ).toBe(true);
    await popup.close();
  }
});
