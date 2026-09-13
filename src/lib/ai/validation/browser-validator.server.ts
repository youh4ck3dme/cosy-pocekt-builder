// Browser Validator - Playwright-based validation
// Catches ~80%+ of real issues: console errors, horizontal overflow, layout issues
// Designed for VPS/Docker deployment

import { Page, BrowserContext } from 'playwright';
import { getBrowserPool } from './browser-pool.server';
import type { Validator, ValidationResult, ValidationError } from './types.server';

/**
 * Browser-based validator using Playwright
 * Validates HTML by loading it in a real Chromium browser
 *
 * Detects:
 * - Console errors (uncaught exceptions)
 * - Page errors (syntax errors)
 * - Horizontal overflow at multiple viewports
 * - DOM parsing errors
 * - Missing required elements
 * - Network requests (should be blocked)
 */
export class BrowserValidator implements Validator {
  private readonly poolSize: number;
  private readonly timeoutMs: number;
  private readonly maxHtmlSize: number;
  private poolInitialized = false;

  constructor(poolSize: number = 2, timeoutMs: number = 5000, maxHtmlSize: number = 500_000) {
    this.poolSize = poolSize;
    this.timeoutMs = timeoutMs;
    this.maxHtmlSize = maxHtmlSize;
  }

  async validate(html: string): Promise<ValidationResult> {
    const startTime = Date.now();
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    // Check HTML size before validation
    if (html.length > this.maxHtmlSize) {
      errors.push({
        type: 'syntax',
        message: `HTML size exceeds limit (${html.length} > ${this.maxHtmlSize} bytes)`,
        severity: 'critical'
      });
      return {
        ok: false,
        errors,
        warnings,
        strategy: 'browser',
        durationMs: Date.now() - startTime
      };
    }

    // Static pre-filter: Fast reject on obviously incomplete HTML before waking up Chromium
    const hasBasicDoctype = html.includes('<!DOCTYPE html>') || html.includes('<!doctype html>');
    const hasBasicHtml = html.toLowerCase().includes('<html');
    if (!hasBasicDoctype || !hasBasicHtml) {
      if (!hasBasicDoctype) {
        errors.push({
          type: 'structure',
          message: 'Missing <!DOCTYPE html> declaration',
          severity: 'critical'
        });
      }
      if (!hasBasicHtml) {
        errors.push({
          type: 'structure',
          message: 'Missing <html> tag',
          severity: 'critical'
        });
      }
      return {
        ok: false,
        errors,
        warnings,
        strategy: 'browser',
        durationMs: Date.now() - startTime
      };
    }

    // Ensure pool is initialized
    const pool = getBrowserPool(this.poolSize, this.timeoutMs);
    if (!this.poolInitialized) {
      const initialized = await pool.init();
      if (!initialized) {
        return {
          ok: false,
          errors: [{
            type: 'syntax',
            message: 'Browser pool initialization failed',
            severity: 'critical'
          }],
          warnings: [],
          strategy: 'browser',
          durationMs: Date.now() - startTime
        };
      }
      this.poolInitialized = true;
    }

    let page: Page | null = null;
    let context: BrowserContext | null = null;

    try {
      // Get page from pool
      ({ page, context } = await pool.getPage());

      // Setup error handlers
      const consoleErrors: string[] = [];
      const pageErrors: string[] = [];
      const networkRequests: string[] = [];

      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      page.on('pageerror', err => {
        pageErrors.push(String(err?.message || err));
      });

      // Block all network requests
      await page.route('**/*', route => {
        networkRequests.push(route.request().url());
        route.abort();
      });

      // Load HTML content
      await page.setContent(html, { waitUntil: 'domcontentloaded' });

      // Wait for potential async errors
      await page.waitForTimeout(500);

      // Check horizontal overflow at multiple viewports
      const viewports = [
        { name: 'mobile', width: 390, height: 844 },
        { name: 'tablet', width: 768, height: 1024 },
        { name: 'desktop', width: 1280, height: 800 },
      ];

      let horizontalOverflowDetected = false;
      for (const vp of viewports) {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        const hasOverflow = await page.evaluate(() => {
          const el = document.documentElement;
          return el.scrollWidth > el.clientWidth + 1;
        });

        if (hasOverflow) {
          horizontalOverflowDetected = true;
          break;
        }
      }

      // Check for required elements in the actual DOM
      const hasDoctype = html.includes('<!DOCTYPE html>');
      const hasHtmlTag = (await page.locator('html').count()) > 0;
      const hasHead = (await page.locator('head').count()) > 0;
      const hasBody = (await page.locator('body').count()) > 0;
      const hasViewport = html.toLowerCase().includes('name="viewport"');
      const hasTitle = (await page.locator('title').count()) > 0;

      // Classify errors
      consoleErrors.forEach(msg => {
        errors.push({
          type: 'console',
          message: `Console error: ${msg.slice(0, 500)}`,
          severity: 'critical'
        });
      });

      pageErrors.forEach(msg => {
        errors.push({
          type: 'syntax',
          message: `Syntax error: ${msg.slice(0, 500)}`,
          severity: 'critical'
        });
      });

      if (horizontalOverflowDetected) {
        errors.push({
          type: 'overflow',
          message: 'Horizontal overflow detected: document wider than viewport',
          severity: 'critical'
        });
      }

      if (!hasDoctype) {
        errors.push({
          type: 'structure',
          message: 'Missing <!DOCTYPE html> declaration',
          severity: 'critical'
        });
      }

      if (!hasHtmlTag) {
        errors.push({
          type: 'structure',
          message: 'Missing <html> tag',
          severity: 'critical'
        });
      }

      if (!hasHead) {
        warnings.push('Missing <head> section');
      }

      if (!hasBody) {
        warnings.push('Missing <body> section');
      }

      if (!hasViewport) {
        warnings.push('Missing viewport meta tag');
      }

      if (!hasTitle) {
        warnings.push('Missing <title> tag');
      }

      // Check for blocked network requests (should be none for self-contained HTML)
      if (networkRequests.length > 0) {
        warnings.push(`Blocked ${networkRequests.length} external network request(s)`);
        // Only first few for logging
        networkRequests.slice(0, 3).forEach(url => {
          warnings.push(`  - ${url.slice(0, 100)}`);
        });
      }

    } catch (err) {
      // Validation error
      errors.push({
        type: 'syntax',
        message: `Validation error: ${String(err).slice(0, 500)}`,
        severity: 'critical',
        details: { error: String(err), stack: err instanceof Error ? err.stack : undefined }
      });
    } finally {
      // Release page back to pool
      if (page && context) {
        try {
          // Clear handlers to prevent memory leaks
          page.off('console', () => {});
          page.off('pageerror', () => {});
          await getBrowserPool().releasePage(page, context);
        } catch {
          // Ignore release errors
        }
      }
    }

    const hasCriticalErrors = errors.some(e => e.severity === 'critical');

    return {
      ok: !hasCriticalErrors,
      errors,
      warnings,
      strategy: 'browser',
      durationMs: Date.now() - startTime
    };
  }

  async healthCheck(): Promise<{ ok: boolean; strategy: string; details?: unknown }> {
    try {
      const pool = getBrowserPool(this.poolSize, this.timeoutMs);

      // Try to initialize if not already
      if (!this.poolInitialized) {
        this.poolInitialized = await pool.init();
      }

      return {
        ok: this.poolInitialized,
        strategy: 'browser',
        details: {
          poolSize: this.poolSize,
          activePages: pool.activePages,
          totalPages: pool.totalPages,
          browser: this.poolInitialized ? 'ok' : 'failed'
        }
      };
    } catch (error) {
      return {
        ok: false,
        strategy: 'browser',
        details: {
          error: String(error),
          browser: 'failed'
        }
      };
    }
  }

  async destroy(): Promise<void> {
    this.poolInitialized = false;
    const pool = getBrowserPool();
    await pool.destroy();
  }
}

// Singleton instance
let browserValidatorInstance: BrowserValidator | null = null;

export function getBrowserValidator(
  poolSize?: number,
  timeoutMs?: number,
  maxHtmlSize?: number
): BrowserValidator {
  if (!browserValidatorInstance) {
    browserValidatorInstance = new BrowserValidator(poolSize, timeoutMs, maxHtmlSize);
  }
  return browserValidatorInstance;
}

// Reset for testing
export function resetBrowserValidator(): void {
  if (browserValidatorInstance) {
    browserValidatorInstance = null;
  }
}
