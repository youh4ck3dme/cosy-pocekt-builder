// Validation Module Index
// Single entry point for all validation functionality
// 
// Architecture:
//   Validator interface -> BrowserValidator (Playwright) | StaticValidator (fallback)
//   Selection happens once at startup, not per request
//
// Environment Variables:
//   SELF_REPAIR_ENABLED=true    - Enable self-repair loop (default: true)
//   MAX_REPAIR_RETRIES=2       - Max repair attempts (default: 2)
//   VALIDATION_TIMEOUT_MS=5000  - Validation timeout (default: 5000)
//   VALIDATION_STRATEGY=auto   - auto | browser | static | none (default: auto)
//   BROWSER_POOL_SIZE=2         - Browser pool size (default: 2)

import type { Validator, ValidationResult, ValidationConfig } from './types.server';
import { getBrowserValidator } from './browser-validator.server';
import { getStaticValidator } from './static-validator.server';

// Configuration from environment
const getConfig = (): ValidationConfig => {
  const enabled = process.env.SELF_REPAIR_ENABLED !== 'false';
  const maxRetries = Number(process.env.MAX_REPAIR_RETRIES || 2);
  const timeoutMs = Number(process.env.VALIDATION_TIMEOUT_MS || 5000);
  const maxHtmlSize = Number(process.env.VALIDATION_MAX_HTML_SIZE || 500000);
  const poolSize = Number(process.env.BROWSER_POOL_SIZE || 2);
  const strategy = (process.env.VALIDATION_STRATEGY || 'auto').toLowerCase() as 'auto' | 'browser' | 'static' | 'none';

  return {
    enabled,
    maxRetries,
    timeoutMs,
    maxHtmlSize,
    browserPoolSize: poolSize,
    strategy
  };
};

// Singleton validator instance
let selectedValidator: Validator | null = null;
let strategyUsed: 'browser' | 'static' | 'none' = 'none';

/**
 * Initialize and get the validator instance.
 * Selection happens once at first call, not per request.
 * 
 * Priority:
 * 1. If strategy is 'none' -> return no-op validator
 * 2. If strategy is 'browser' -> try BrowserValidator, fall back to StaticValidator
 * 3. If strategy is 'static' -> use StaticValidator
 * 4. If strategy is 'auto' -> try BrowserValidator, fall back to StaticValidator
 */
export const getValidator = (): Validator => {
  if (selectedValidator) {
    return selectedValidator;
  }

  const config = getConfig();

  if (!config.enabled || config.strategy === 'none') {
    strategyUsed = 'none';
    // Return no-op validator that always passes
    selectedValidator = {
      validate: async (_html: string) => ({
        ok: true,
        errors: [],
        warnings: [],
        strategy: 'none',
        durationMs: 0
      }),
      healthCheck: async () => ({ ok: true, strategy: 'none' }),
      destroy: async () => {}
    };
  } else if (config.strategy === 'static') {
    strategyUsed = 'static';
    selectedValidator = getStaticValidator(config.maxHtmlSize);
  } else {
    // Try browser first (for 'browser' or 'auto')
    try {
      const browserValidator = getBrowserValidator(
        config.browserPoolSize,
        config.timeoutMs,
        config.maxHtmlSize
      );
      
      // Test if browser pool can be initialized
      // Note: We don't initialize here, just create the instance
      // Initialization happens lazily on first validate() call
      strategyUsed = 'browser';
      selectedValidator = browserValidator;
    } catch {
      // Fall back to static
      console.warn('[Validation] Browser pool initialization failed, falling back to static validator');
      strategyUsed = 'static';
      selectedValidator = getStaticValidator(config.maxHtmlSize);
    }
  }

  console.log(`[Validation] Selected strategy: ${strategyUsed}`);
  return selectedValidator;
};

/**
 * Get the current strategy being used
 */
export const getValidationStrategy = (): string => {
  return strategyUsed;
};

/**
 * Validate HTML using the selected validator
 */
export const validateHtml = async (html: string): Promise<ValidationResult> => {
  const validator = getValidator();
  return validator.validate(html);
};

/**
 * Health check for the validation system
 * Returns the strategy being used and its health status
 */
export const validationHealthCheck = async () => {
  const validator = getValidator();
  return validator.healthCheck();
};

/**
 * Destroy the validator instance (for testing or shutdown)
 */
export const destroyValidator = async (): Promise<void> => {
  if (selectedValidator) {
    await selectedValidator.destroy();
    selectedValidator = null;
    strategyUsed = 'none';
  }
};

/**
 * Reset the validator selection (for testing)
 */
export const resetValidator = (): void => {
  selectedValidator = null;
  strategyUsed = 'none';
};

/**
 * Get validation configuration
 */
export const getValidationConfig = (): ValidationConfig => {
  return getConfig();
};

// Re-export types for convenience
export type { Validator, ValidationResult, ValidationError, ValidationConfig } from './types.server';
