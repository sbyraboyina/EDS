/**
 * Text Area Block Tests — NVIDIA Contact Page EDS POC
 *
 * Validates the Kaizen TextArea block, authored like cards: one field per row,
 * fields set with the Google Docs paragraph-style menu (Heading 3 = label,
 * Heading 4 = help, Normal text = placeholder) plus an "[auto, large]" line.
 *
 * NOTE: requires the KUI bundle to export TextArea. Run `npm run build:kui`
 * after pulling these changes if the bundle is stale.
 *
 * Run only this suite:  npx playwright test text-area
 */

import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:3001';

async function waitForBlocksLoaded(page) {
  await page.waitForFunction(() => {
    const blocks = [...document.querySelectorAll('[data-block-name]')];
    return blocks.length > 0 && blocks.every((b) => b.dataset.blockStatus === 'loaded');
  }, { timeout: 15000 });
}

test.describe('Text Area Block', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE);
    await waitForBlocksLoaded(page);
  });

  test('CSS responds 200: /blocks/text-area/text-area.css', async ({ request }) => {
    const resp = await request.get(`${BASE}/blocks/text-area/text-area.css`);
    expect(resp.status()).toBe(200);
  });

  test('text-area block is decorated and loaded', async ({ page }) => {
    const block = page.locator('.text-area.block');
    await expect(block).toHaveCount(1);
    await expect(block).toHaveAttribute('data-block-status', 'loaded');
  });

  test('renders one field per authored row', async ({ page }) => {
    await expect(page.locator('.text-area.block .text-area-field')).toHaveCount(3);
    await expect(page.locator('.text-area.block textarea')).toHaveCount(3);
  });

  test('reads an unstyled single-column row line by line', async ({ page }) => {
    const field = page.locator('.text-area.block .text-area-field').nth(2);
    await expect(field.locator('label')).toContainText('How did you hear about us?');
    await expect(field.locator('textarea')).toHaveAttribute('placeholder', 'Events, press, or a partner');
  });

  test('reads label, placeholder and help from paragraph styles', async ({ page }) => {
    const field = page.locator('.text-area.block .text-area-field').first();
    await expect(field.locator('label')).toContainText('Message');
    await expect(field.locator('textarea')).toHaveAttribute('placeholder', 'Enter a value');
    await expect(field.locator('.text-area-help')).toContainText('Tell us how we can help.');
  });

  test('reads a "Placeholder:" prefixed paragraph', async ({ page }) => {
    const field = page.locator('.text-area.block .text-area-field').nth(1);
    await expect(field.locator('label')).toContainText('Company details');
    await expect(field.locator('textarea')).toHaveAttribute('placeholder', 'Company, team size, region');
  });

  test('applies per-row option tokens', async ({ page }) => {
    const shells = page.locator('.text-area.block .nv-input-shell');
    await expect(shells.first()).toHaveClass(/large/);
    await expect(shells.nth(1)).toHaveClass(/small/);

    // the option lines must not leak into the rendered output
    await expect(page.locator('.text-area.block')).not.toContainText('[auto, large]');
    await expect(page.locator('.text-area.block')).not.toContainText('[manual, small]');
  });

  test('typing updates each textarea independently', async ({ page }) => {
    const first = page.locator('.text-area.block textarea').first();
    const second = page.locator('.text-area.block textarea').nth(1);

    await first.fill('Hello NVIDIA');
    await expect(first).toHaveValue('Hello NVIDIA');
    await expect(second).toHaveValue('');
  });
});
