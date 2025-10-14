import { test, expect, Route, Page } from '@playwright/test';

const resolveKanbanPath = () => {
    const pref = process.env.KANBAN_PATH || '/boards';
    const candidates = [pref, '/kanban', '/app/boards', '/app/kanban'];
    return Array.from(new Set(candidates));
};

async function openKanban(page: Page, role: 'OWNER' | 'VIEWER') {
    await page.route('**/api/me', async (route: Route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                email: role === 'OWNER' ? 'owner@example.com' : 'viewer@example.com',
                userId: role === 'OWNER' ? 'u_owner' : 'u_view',
                role,
            }),
        });
    });

    const paths = resolveKanbanPath();
    for (const p of paths) {
        const meReq = page.waitForResponse((res) => res.url().includes('/api/me')).catch(() => null);
        await page.goto(p, { waitUntil: 'domcontentloaded' });
        await meReq;
        try {
            await page.waitForSelector('main[data-ui-scope="kanban"]', { timeout: 1500 });
            return;
        } catch {}
    }
    throw new Error(`Kanban page not found. Tried: ${paths.join(', ')}`);
}

test('VIEWER: requires-write disabled + DnD wrapper visible', async ({ page }) => {
    await openKanban(page, 'VIEWER');
    const writeEls = page.locator('.requires-write');
    await expect(writeEls.first()).toBeDisabled();
    await expect(page.locator('[data-columns-wrap]')).toBeVisible();
});

test('OWNER: requires-write enabled', async ({ page }) => {
    await openKanban(page, 'OWNER');
    const writeEls = page.locator('.requires-write');
    await expect(writeEls.first()).toBeEnabled();
});
