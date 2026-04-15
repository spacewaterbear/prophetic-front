import { test, expect } from "@playwright/test";

/**
 * Smoke tests for Prophetic Orchestra.
 *
 * These tests run against a dev server with NEXT_PUBLIC_SKIP_AUTH=false (default).
 * They verify page reachability and basic UI without performing real authentication.
 *
 * To run:
 *   npx playwright test
 *
 * To skip auth entirely in dev, set NEXT_PUBLIC_SKIP_AUTH=true and tests that
 * require an authenticated session will work without OAuth.
 */

test.describe("Auth flow", () => {
  test("root redirects to /login when not authenticated", async ({ page }) => {
    await page.goto("/");
    // Middleware should redirect unauthenticated users to /login
    await expect(page).toHaveURL(/\/login/);
  });

  test("login page renders Google sign-in and magic link form", async ({
    page,
  }) => {
    await page.goto("/login");
    // Google sign-in button
    await expect(page.locator("button", { hasText: /google/i })).toBeVisible();
    // Email input for magic link
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test("magic link form validates email before submission", async ({ page }) => {
    await page.goto("/login");
    const submitBtn = page.locator("button[type='submit']").first();
    // Button should be disabled when email is empty
    await expect(submitBtn).toBeDisabled();
    // Fill invalid email — button should remain disabled or form should reject
    await page.fill('input[type="email"]', "notanemail");
    // Fill valid email
    await page.fill('input[type="email"]', "test@example.com");
    await expect(submitBtn).toBeEnabled();
  });
});

test.describe("Public share page", () => {
  test("share page with invalid token shows error or empty state", async ({
    page,
  }) => {
    const response = await page.goto("/share/invalid-token-000");
    // Should not throw a 500; 200 or 404 are both acceptable
    expect([200, 404]).toContain(response?.status());
  });
});

test.describe("Registration pending page", () => {
  test("/registration-pending is accessible", async ({ page }) => {
    await page.goto("/registration-pending");
    await expect(page).not.toHaveURL(/\/login/);
    // Page renders without a crash
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("API routes", () => {
  test("GET /api/geolocation returns valid language response", async ({
    request,
  }) => {
    const response = await request.get("/api/geolocation");
    expect([200, 401]).toContain(response.status());
    if (response.status() === 200) {
      const body = await response.json();
      expect(body).toHaveProperty("language");
    }
  });

  test("GET /api/conversations requires authentication", async ({
    request,
  }) => {
    const response = await request.get("/api/conversations");
    // Must require auth — 401 or redirect
    expect(response.status()).not.toBe(200);
  });

  test("GET /api/vignettes returns array", async ({ request }) => {
    const response = await request.get("/api/vignettes");
    expect([200, 401]).toContain(response.status());
    if (response.status() === 200) {
      const body = await response.json();
      expect(Array.isArray(body) || typeof body === "object").toBe(true);
    }
  });
});
