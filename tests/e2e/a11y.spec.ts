import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Settle entrance animations so axe measures resting colors, not mid-fade blends.
test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
});

// Public, no-auth pages. We fail only on serious/critical WCAG 2 A/AA
// violations (moderate/minor are reported but don't block).
const PAGES = [
  "/",
  "/browse",
  "/how-it-works",
  "/concierge",
  "/signin",
  "/terms",
  "/privacy",
];

async function seriousViolations(page: import("@playwright/test").Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  return results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
}

function report(path: string, serious: Awaited<ReturnType<typeof seriousViolations>>) {
  if (!serious.length) return;
  console.log(
    `\n${path} violations:\n` +
      serious
        .map(
          (v) =>
            `  • ${v.id} (${v.nodes.length})\n` +
            v.nodes
              .slice(0, 4)
              .map(
                (n) =>
                  `      ${n.target.join(" ")} → ${JSON.stringify(n.any[0]?.data ?? {})}`,
              )
              .join("\n"),
        )
        .join("\n"),
  );
}

for (const path of PAGES) {
  test(`a11y: ${path}`, async ({ page }) => {
    await page.goto(path);
    const serious = await seriousViolations(page);
    report(path, serious);
    expect(serious.map((v) => v.id)).toEqual([]);
  });
}

test("a11y: a listing detail page", async ({ page }) => {
  await page.goto("/browse");
  await page.getByText("Rolex Submariner Date").first().click();
  await expect(page).toHaveURL(/\/listing\//);
  await expect(page).toHaveTitle(/Rolex/); // let the SPA-nav <title> settle first
  const serious = await seriousViolations(page);
  report("/listing", serious);
  expect(serious.map((v) => v.id)).toEqual([]);
});
