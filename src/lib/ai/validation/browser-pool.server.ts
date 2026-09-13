// Browser Pool for Playwright
// One Chromium instance per process, N contexts, page.close() after each validation
// Designed for VPS/Docker deployment with long-running process

import { chromium, Browser, BrowserContext, Page } from 'playwright';
import type { BrowserPool } from './types.server';

interface PoolPage {
  context: BrowserContext;
  page: Page | null;
  inUse: boolean;
  lastUsed: number;
}

export class PlaywrightBrowserPool implements BrowserPool {
  private browser: Browser | null = null;
  private pages: PoolPage[] = [];
  private readonly poolSize: number;
  private readonly timeoutMs: number;
  private destroying = false;
  
  constructor(poolSize: number = 2, timeoutMs: number = 5000) {
    this.poolSize = Math.max(1, poolSize);
    this.timeoutMs = timeoutMs;
  }

  /**
   * Initialize the browser pool
   * Uses sandboxed Chromium with disabled GPU, no sandbox, no network access
   */
  async init(): Promise<boolean> {
    if (this.browser || this.destroying) {
      return this.browser !== null;
    }

    try {
      this.browser = await chromium.launch({
        headless: true,
        args: [
          '--disable-gpu',
          '--no-sandbox',
          '--disable-dev-shm-usage',
          '--disable-setuid-sandbox',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          // Block all external network traffic
          '--proxy-server=127.0.0.1:9999', // Non-existent proxy to block network
        ],
        // Additional security settings
        ignoreDefaultArgs: [
          '--enable-automation',
        ],
        // Set timeout for browser launch
        timeout: this.timeoutMs,
      });

      // Create initial pool of contexts
      for (let i = 0; i < this.poolSize; i++) {
        const context = await this.browser.newContext({
          // Block all network requests
          proxy: { server: '127.0.0.1:9999' },
          // Disable cookies
          ignoreHTTPSErrors: true,
          // Disable JavaScript dialogs
          javaScriptEnabled: true,
          // Disable service workers
          serviceWorkers: 'block',
        });
        
        this.pages.push({ page: null, context, inUse: false, lastUsed: Date.now() });
      }

      // Setup graceful shutdown
      this.setupShutdownHooks();
      
      return true;
    } catch (error) {
      console.error('[BrowserPool] Failed to initialize:', error);
      await this.destroy();
      return false;
    }
  }

  /**
   * Get a page from the pool
   * Creates new context if pool is exhausted
   */
  async getPage(): Promise<{ page: Page; context: BrowserContext }> {
    if (this.destroying) {
      throw new Error('[BrowserPool] Pool is destroying');
    }

    if (!this.browser) {
      const initialized = await this.init();
      if (!initialized) {
        throw new Error('[BrowserPool] Failed to initialize browser pool');
      }
    }

    // Find available page
    let pageEntry = this.pages.find(p => !p.inUse);
    
    if (!pageEntry) {
      // Create new context and page if pool is full
      const context = await this.browser!.newContext({
        proxy: { server: '127.0.0.1:9999' },
        ignoreHTTPSErrors: true,
        javaScriptEnabled: true,
        serviceWorkers: 'block',
      });
      
      pageEntry = { page: null, context, inUse: false, lastUsed: Date.now() };
      
      this.pages.push(pageEntry);
    }

    // Mark as in use
    pageEntry.inUse = true;
    pageEntry.lastUsed = Date.now();
    pageEntry.page = await pageEntry.context.newPage();

    return { page: pageEntry.page, context: pageEntry.context };
  }

  /**
   * Release a page back to the pool
   * Closes the page to free memory
   */
  async releasePage(page: Page, context: BrowserContext): Promise<void> {
    if (this.destroying) {
      try {
        await page.close();
        await context.close();
      } catch {
        // Ignore errors during shutdown
      }
      return;
    }

    try {
      await page.close();
    } catch (error) {
      console.warn('[BrowserPool] Error releasing page:', error);
    }

    // Find and update the page entry
    const pageEntry = this.pages.find(p => p.page === page);
    if (pageEntry) {
      pageEntry.inUse = false;
      pageEntry.page = null;
      pageEntry.lastUsed = Date.now();
    }
  }

  /**
   * Clean up unused pages and contexts
   */
  private async cleanup(): Promise<void> {
    const now = Date.now();
    const MAX_IDLE_TIME = 60_000; // 1 minute
    
    for (let i = this.pages.length - 1; i >= this.poolSize; i--) {
      const pageEntry = this.pages[i];
      if (!pageEntry.inUse && (now - pageEntry.lastUsed) > MAX_IDLE_TIME) {
        try {
          await pageEntry.page?.close();
          await pageEntry.context.close();
          this.pages.splice(i, 1);
        } catch (error) {
          console.warn('[BrowserPool] Error cleaning up page:', error);
        }
      }
    }
  }

  /**
   * Get pool statistics
   */
  get size(): number {
    return this.poolSize;
  }

  get activePages(): number {
    return this.pages.filter(p => p.inUse).length;
  }

  get totalPages(): number {
    return this.pages.length;
  }

  /**
   * Setup graceful shutdown hooks
   */
  private setupShutdownHooks(): void {
    const shutdown = async (signal: string) => {
      console.log(`[BrowserPool] Received ${signal}, shutting down gracefully...`);
      this.destroying = true;
      
      // Wait for active pages to complete
      const maxWaitTime = 10_000; // 10 seconds
      const startTime = Date.now();
      
      while (this.activePages > 0 && Date.now() - startTime < maxWaitTime) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      await this.destroy();
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGHUP', () => shutdown('SIGHUP'));
  }

  /**
   * Destroy the browser pool
   */
  async destroy(): Promise<void> {
    if (this.destroying) {
      return;
    }
    
    this.destroying = true;
    
    try {
      // Close all pages
      for (const pageEntry of this.pages) {
        try {
          await pageEntry.page?.close().catch(() => {});
          await pageEntry.context.close().catch(() => {});
        } catch {
          // Ignore errors during cleanup
        }
      }
      
      this.pages = [];
      
      // Close browser
      if (this.browser) {
        await this.browser.close().catch(() => {});
        this.browser = null;
      }
      
      console.log('[BrowserPool] Destroyed successfully');
    } catch (error) {
      console.error('[BrowserPool] Error during destroy:', error);
    } finally {
      this.destroying = false;
    }
  }
}

// Singleton instance
let browserPoolInstance: PlaywrightBrowserPool | null = null;

export function getBrowserPool(poolSize?: number, timeoutMs?: number): PlaywrightBrowserPool {
  if (!browserPoolInstance) {
    browserPoolInstance = new PlaywrightBrowserPool(poolSize, timeoutMs);
  }
  return browserPoolInstance;
}

// Reset for testing
export function resetBrowserPool(): void {
  if (browserPoolInstance) {
    // Don't actually destroy in tests, just reset reference
    browserPoolInstance = null;
  }
}
