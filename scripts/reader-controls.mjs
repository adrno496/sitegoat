export async function readerTools(page) {
  const expanded = await page.locator(".reading-surface-expanded").isVisible();
  if (expanded)
    await page
      .getByRole("button", { name: "Réduire la lecture", exact: true })
      .click();
  return expanded;
}
export async function readerControl(page, name) {
  const expanded = await readerTools(page);
  await page.getByRole("button", { name, exact: true }).click();
  if (expanded)
    await page
      .getByRole("button", { name: "Lecture pleine page", exact: true })
      .click();
}
