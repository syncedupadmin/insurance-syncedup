const { test, expect } = require('@playwright/test');

/**
 * Minimal Playwright tests to prevent regressions in portal functionality
 * These tests complement the audit crawler by providing focused regression testing
 */

const PORTALS = [
  { path: '/login.html', name: 'Login Portal', expectTitle: /Login|Insurance/ },
  { path: '/_admin/', name: 'Admin Portal', expectTitle: /Admin|Dashboard/ },
  { path: '/_agent/', name: 'Agent Portal', expectTitle: /Agent|Dashboard/ },
  { path: '/_customer-service/', name: 'Customer Service Portal', expectTitle: /Customer|Service/ },
  { path: '/_leaderboard/', name: 'Leaderboard Portal', expectTitle: /Leaderboard|Performance/ },
  { path: '/_manager/', name: 'Manager Portal', expectTitle: /Manager|Dashboard/ },
  { path: '/_super-admin/', name: 'Super Admin Portal', expectTitle: /Super|Admin/ }
];

test.describe('Portal Smoke Tests', () => {
  PORTALS.forEach(portal => {
    test(`${portal.name} should load without critical errors`, async ({ page }) => {
      const consoleErrors = [];
      const networkFailures = [];

      // Collect console errors
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push({
            text: msg.text(),
            location: msg.location()
          });
        }
      });

      // Collect network failures
      page.on('requestfailed', request => {
        networkFailures.push({
          url: request.url(),
          method: request.method(),
          failure: request.failure()
        });
      });

      // Monitor 4xx/5xx responses
      page.on('response', response => {
        if (response.status() >= 400) {
          networkFailures.push({
            url: response.url(),
            status: response.status(),
            statusText: response.statusText()
          });
        }
      });

      // Navigate to portal
      const response = await page.goto(portal.path, {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      // Check basic page load
      expect(response.status()).toBeLessThan(400);

      // Check page has content
      await expect(page).toHaveTitle(portal.expectTitle);

      // Verify page is not completely broken
      const bodyContent = await page.textContent('body');
      expect(bodyContent.length).toBeGreaterThan(10);

      // Log errors for debugging but don't fail tests on minor issues
      if (consoleErrors.length > 0) {
        console.warn(`Console errors in ${portal.name}:`, consoleErrors);
      }

      if (networkFailures.length > 0) {
        console.warn(`Network failures in ${portal.name}:`, networkFailures);
      }

      // Only fail on critical issues that prevent basic functionality
      const criticalErrors = consoleErrors.filter(error =>
        error.text.includes('Script error') ||
        error.text.includes('ReferenceError') ||
        error.text.includes('TypeError') && error.text.includes('Cannot read')
      );

      expect(criticalErrors.length).toBe(0);
    });

    test(`${portal.name} basic interactivity works`, async ({ page }) => {
      await page.goto(portal.path);

      // Test that basic elements are present and clickable
      const buttons = await page.$$('button, [role="button"]');
      const links = await page.$$('a[href], [role="link"]');
      const inputs = await page.$$('input, select, textarea');

      // Should have some interactive elements
      expect(buttons.length + links.length + inputs.length).toBeGreaterThan(0);

      // Test first visible button if present
      if (buttons.length > 0) {
        const firstButton = buttons[0];
        const isVisible = await firstButton.isVisible();
        if (isVisible) {
          const text = await firstButton.textContent();
          if (!text?.toLowerCase().includes('logout')) {
            await expect(firstButton).toBeEnabled();
          }
        }
      }

      // Test first form input if present
      if (inputs.length > 0) {
        const firstInput = inputs[0];
        const isVisible = await firstInput.isVisible();
        const type = await firstInput.getAttribute('type');

        if (isVisible && type !== 'hidden') {
          await firstInput.focus();
          // Input should be focusable
          expect(await firstInput.evaluate(el => document.activeElement === el)).toBe(true);
        }
      }
    });
  });
});

test.describe('Critical Portal Functionality', () => {
  test('Login portal has essential form elements', async ({ page }) => {
    await page.goto('/login.html');

    // Should have username/email input
    const usernameInput = await page.$('input[type="email"], input[name*="user"], input[name*="email"], input[id*="user"], input[id*="email"]');
    expect(usernameInput).toBeTruthy();

    // Should have password input
    const passwordInput = await page.$('input[type="password"]');
    expect(passwordInput).toBeTruthy();

    // Should have submit button
    const submitButton = await page.$('button[type="submit"], input[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
    expect(submitButton).toBeTruthy();
  });

  test('Portal navigation does not break on rapid clicks', async ({ page }) => {
    await page.goto('/_agent/');

    // Find navigation links
    const navLinks = await page.$$('nav a, .nav a, [role="navigation"] a');

    if (navLinks.length > 1) {
      // Rapidly click between first two nav items
      for (let i = 0; i < 3; i++) {
        try {
          await navLinks[0].click({ timeout: 1000 });
          await page.waitForTimeout(100);
          await navLinks[1].click({ timeout: 1000 });
          await page.waitForTimeout(100);
        } catch (error) {
          // Log but don't fail - this tests resilience
          console.warn('Navigation stress test error:', error.message);
        }
      }

      // Page should still be responsive
      const bodyText = await page.textContent('body');
      expect(bodyText.length).toBeGreaterThan(10);
    }
  });

  test('Portals handle missing resources gracefully', async ({ page }) => {
    // Block some resources to test graceful degradation
    await page.route('**/*.{png,jpg,jpeg,gif,svg}', route => route.abort());

    await page.goto('/_admin/');

    // Page should still load and be functional without images
    await expect(page).toHaveTitle(/Admin|Dashboard/);

    const bodyText = await page.textContent('body');
    expect(bodyText.length).toBeGreaterThan(50);
  });
});

test.describe('Security and Performance', () => {
  test('Portals do not expose sensitive information in console', async ({ page }) => {
    const sensitivePatterns = [
      /password/i,
      /secret/i,
      /token/i,
      /api[_-]?key/i,
      /private[_-]?key/i
    ];

    const consoleMessages = [];
    page.on('console', msg => consoleMessages.push(msg.text()));

    await page.goto('/_super-admin/');
    await page.waitForTimeout(2000);

    const suspiciousMessages = consoleMessages.filter(message =>
      sensitivePatterns.some(pattern => pattern.test(message))
    );

    expect(suspiciousMessages.length).toBe(0);
  });

  test('Portal pages load within reasonable time', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/_agent/', { waitUntil: 'networkidle' });

    const loadTime = Date.now() - startTime;

    // Should load within 10 seconds (generous for slower systems)
    expect(loadTime).toBeLessThan(10000);
  });
});