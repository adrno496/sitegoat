import type { Page } from "@playwright/test";
export async function navigate(page: Page, label: string) {
  label = label === "Réglages" ? "Paramètres" : label;
  const reduce = page.getByRole("button", {
    name: "Réduire la lecture",
    exact: true,
  });
  if (await reduce.isVisible()) await reduce.click();
  const root = page.locator(
    (await page.locator(".sidebar").isVisible()) ? ".sidebar" : ".mobile-nav",
  );
  const button = root.getByRole("button", { name: label, exact: true });
  if (!(await button.isVisible()))
    await root
      .getByRole("button", { name: "Autres espaces", exact: true })
      .click();
  await button.click();
}
export async function openReadingTools(page: Page) {
  const tools = page.locator(".v9-reading-tools");
  if ((await tools.getAttribute("open")) === null && (await tools.isVisible()))
    await tools.locator("summary").click();
}
export async function diagnostics(page: Page) {
  await navigate(page, "Paramètres");
  const root = page.locator(".import-diagnostics");
  if ((await root.getAttribute("open")) === null)
    await root.locator("summary").first().click();
  return root;
}
