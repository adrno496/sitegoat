import type { Page } from "@playwright/test";
export async function readerTools(page: Page) {
  const expanded = await page.locator(".reading-surface-expanded").isVisible();
  if (expanded)
    await page
      .getByRole("button", { name: "Réduire la lecture", exact: true })
      .click();
  return expanded;
}
// Real user flow: options live outside the unobstructed reading surface.
export async function readerControl(page: Page, name: string) {
  const expanded = await readerTools(page);
  await page.getByRole("button", { name, exact: true }).click();
  if (expanded)
    await page
      .getByRole("button", { name: "Lecture pleine page", exact: true })
      .click();
}
