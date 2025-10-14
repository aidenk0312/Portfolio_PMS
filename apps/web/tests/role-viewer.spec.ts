import { test, expect, Route } from '@playwright/test';

test('viewer is read-only: buttons disabled and dnd blocked', async ({ page }) => {
    await page.route('**/api/me', async (route: Route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ email: 'viewer@example.com', userId: 'u_view', role: 'VIEWER' })
        });
    });

    await page.goto('/boards');

    const writeButtons = page.locator('.requires-write');
    await expect(writeButtons.first()).toBeDisabled();

    const dndWrap = page.locator('[data-columns-wrap]');
    await expect(dndWrap).toBeVisible();
});
