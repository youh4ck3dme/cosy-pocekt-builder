// Static Validator - Fallback implementation without browser
// Catches ~30% of issues using regex and DOM parsing (no Playwright)

import type { Validator, ValidationResult, ValidationError } from './types.server';

/**
 * Static validator that doesn't require a browser.
 * Used as fallback when Playwright is not available.
 * 
 * Detects:
 * - Missing DOCTYPE, html, head, body tags
 * - Missing viewport meta tag
 * - Missing title tag
 * - Potential horizontal overflow patterns
 * - Common syntax issues
 */
export class StaticValidator implements Validator {
  private readonly maxHtmlSize: number;
  
  constructor(maxHtmlSize: number = 500_000) {
    this.maxHtmlSize = maxHtmlSize;
  }

  async validate(html: string): Promise<ValidationResult> {
    const startTime = Date.now();
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    // Check HTML size
    if (html.length > this.maxHtmlSize) {
      errors.push({
        type: 'syntax',
        message: `HTML size exceeds limit (${html.length} > ${this.maxHtmlSize} bytes)`,
        severity: 'critical'
      });
    }

    // Structural checks
    if (!html.includes('<!DOCTYPE html>') && !html.includes('<!doctype html>')) {
      errors.push({
        type: 'structure',
        message: 'Missing <!DOCTYPE html> declaration',
        severity: 'critical'
      });
    }

    if (!html.toLowerCase().includes('<html')) {
      errors.push({
        type: 'structure',
        message: 'Missing <html> tag',
        severity: 'critical'
      });
    }

    if (!html.toLowerCase().includes('<head>')) {
      warnings.push('Missing <head> section');
    }

    if (!html.toLowerCase().includes('<body')) {
      warnings.push('Missing <body> section');
    }

    // Viewport check
    if (!html.toLowerCase().includes('name="viewport"') && 
        !html.toLowerCase().includes("name='viewport'")) {
      warnings.push('Missing viewport meta tag - may cause mobile layout issues');
    }

    // Title check
    if (!html.toLowerCase().includes('<title>')) {
      warnings.push('Missing <title> tag');
    }

    // Horizontal overflow patterns
    const overflowPatterns = [
      // Fixed width > viewport
      /width:\s*(\d{4,}|\d{3,}[.\d]+)(px|rem|em)/i,
      // No max-width on wide elements
      /<div[^>]*style=["'][^"']*width:\s*\d+(px|rem|em)[^"']*["'][^>]*>/i,
      // Large absolute positioning
      /left:\s*(\d{4,}|\d{3,}[.\d]+)(px|rem|em)/i,
    ];

    overflowPatterns.forEach((pattern, index) => {
      if (pattern.test(html) && !/max-width:\s*100%/i.test(html)) {
        warnings.push(`Potential horizontal overflow pattern detected (pattern ${index + 1})`);
      }
    });

    // Console error patterns (static detection)
    const consoleErrorPatterns = [
      /innerHTML\s*=\s*[^>]*\+\s*userInput/i,
      /document\.write\s*\(/i,
      /eval\s*\(/i,
      /new\s+Function\s*\(/i,
    ];

    consoleErrorPatterns.forEach((pattern) => {
      if (pattern.test(html)) {
        warnings.push(`Potential security issue: ${pattern.toString().slice(0, 50)}`);
      }
    });

    // External URL detection in CSS (critical)
    const externalUrlPatterns = [
      /background-image:\s*url\(\s*['"]https?:\/\/[^'"]+['"]\s*\)/i,
      /background:\s*url\(\s*['"]https?:\/\/[^'"]+['"]\s*\)/i,
      /src:\s*url\(\s*['"]https?:\/\/[^'"]+['"]\s*\)/i,
    ];
    
    externalUrlPatterns.forEach((pattern) => {
      const matches = html.match(pattern);
      if (matches && matches.length > 0) {
        errors.push({
          type: 'network',
          message: `External URL in CSS: ${matches[0].slice(0, 100)}...`,
          severity: 'critical'
        });
      }
    });

    // External URL detection in HTML (critical)
    const externalHtmlPatterns = [
      /<img[^>]+src=['"]https?:\/\/[^'"]+['"][^>]*>/i,
      /<link[^>]+href=['"]https?:\/\/[^'"]+['"][^>]*>/i,
      /<script[^>]+src=['"]https?:\/\/[^'"]+['"][^>]*>/i,
      /<iframe[^>]+src=['"]https?:\/\/[^'"]+['"][^>]*>/i,
    ];
    
    externalHtmlPatterns.forEach((pattern) => {
      const matches = html.match(pattern);
      if (matches && matches.length > 0) {
        errors.push({
          type: 'network',
          message: `External URL in HTML: ${matches[0].slice(0, 100)}...`,
          severity: 'critical'
        });
      }
    });

    // Missing alt attribute detection (critical)
    // Simple approach: count <img tags and img tags with alt attributes
    // If there are more img tags than alt attributes, some are missing alt
    const imgCount = (html.match(/<img\b/gi) || []).length;
    const imgWithAltCount = (html.match(/<img[\s\S]*?\balt\s*=\s*(['"][^'"]*['"]|\S+)/gi) || []).length;
    
    if (imgCount > imgWithAltCount) {
      errors.push({
        type: 'structure',
        message: `Missing alt attribute on ${imgCount - imgWithAltCount} <img> tag(s)`,
        severity: 'critical'
      });
    }

    // Script tag checks
    const scriptMatches = html.match(/<script[^>]*>([\s\S]*?)<\/script>/gi) || [];
    scriptMatches.forEach((scriptTag, index) => {
      const scriptContent = scriptTag.match(/<script[^>]*>([\s\S]*?)<\/script>/i)?.[1] || '';
      
      // Check for innerHTML usage
      if (scriptContent.includes('innerHTML') && !scriptContent.includes('textContent')) {
        warnings.push(`Consider using textContent instead of innerHTML (script ${index + 1})`);
      }
      
      // Check for undefined references
      if (/\bundefined\b|\bnull\b\.\w+|\w+\.\w+\(/i.test(scriptContent)) {
        warnings.push(`Potential undefined/null reference in script ${index + 1}`);
      }
    });

    // Syntax checks
    const openTags = html.match(/<[a-z][\s\S]*?>/gi) || [];
    const closeTags = html.match(/<\/[a-z][\s\S]*?>/gi) || [];
    
    if (closeTags.length < openTags.length * 0.8) {
      warnings.push(`Potential unclosed tags (${openTags.length} opened, ${closeTags.length} closed)`);
    }

    const hasCriticalErrors = errors.some(e => e.severity === 'critical');

    return {
      ok: !hasCriticalErrors,
      errors,
      warnings,
      strategy: 'static',
      durationMs: Date.now() - startTime
    };
  }

  async healthCheck(): Promise<{ ok: boolean; strategy: string; details?: unknown }> {
    return {
      ok: true,
      strategy: 'static',
      details: {
        message: 'Static validator is always available',
        maxHtmlSize: this.maxHtmlSize
      }
    };
  }

  async destroy(): Promise<void> {
    // Static validator has no resources to clean up
    // console.log('[StaticValidator] Destroyed');
  }
}

// Singleton instance
let staticValidatorInstance: StaticValidator | null = null;

export function getStaticValidator(maxHtmlSize?: number): StaticValidator {
  if (!staticValidatorInstance) {
    staticValidatorInstance = new StaticValidator(maxHtmlSize);
  }
  return staticValidatorInstance;
}
