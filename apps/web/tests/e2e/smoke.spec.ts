import { test, expect } from '@playwright/test';

test.describe('LAST CROWN — Smoke Tests', () => {
  test('loads home page successfully with core navigation', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/LAST CROWN/i);
    await expect(page.locator('h1')).toContainText('LAST CROWN');

    // Verify main action buttons exist
    const playButton = page.getByRole('link', { name: /Battle AI Warrior/i });
    await expect(playButton).toBeVisible();

    const roomButton = page.getByRole('link', { name: /Private 2-Player Room/i });
    await expect(roomButton).toBeVisible();
  });

  test('navigates to single-player arena and mounts game container', async ({ page }) => {
    await page.goto('/play');
    // Verify container and controls bar are rendered
    await expect(page.locator('#phaser-game-canvas-root')).toBeVisible();
    await expect(page.getByRole('region', { name: /Combat Controls Reference/i })).toBeVisible();
  });

  test('navigates to private duel chamber', async ({ page }) => {
    await page.goto('/room');
    await expect(page.locator('h1')).toContainText(/Private Duel Chamber/i);
    await expect(page.getByRole('button', { name: /Create Private Room/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Enter Chamber with Code/i })).toBeVisible();
  });

  test('navigates to settings and renders controls table', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.locator('h1')).toContainText(/Settings & Controls/i);
    await expect(page.getByRole('table')).toBeVisible();
  });
});
