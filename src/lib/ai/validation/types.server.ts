// Validation Types for Self-Repair Loop
// Single source of truth for all validation-related types

export interface ValidationError {
  type: 'console' | 'overflow' | 'syntax' | 'structure' | 'network' | 'timeout';
  message: string;
  severity: 'critical' | 'warning';
  details?: Record<string, unknown>;
}

export interface ValidationResult {
  ok: boolean;
  errors: ValidationError[];
  warnings: string[];
  strategy: 'browser' | 'static' | 'none';
  durationMs: number;
}

export interface Validator {
  validate(html: string): Promise<ValidationResult>;
  healthCheck(): Promise<{ ok: boolean; strategy: string; details?: unknown }>;
  destroy(): Promise<void>;
}

export interface BrowserPool {
  getPage(): Promise<{ page: unknown; context: unknown }>;
  releasePage(page: unknown, context: unknown): Promise<void>;
  destroy(): Promise<void>;
  size: number;
  activePages: number;
}

export interface ValidationConfig {
  enabled: boolean;
  maxRetries: number;
  timeoutMs: number;
  maxHtmlSize: number;
  browserPoolSize: number;
  strategy: 'auto' | 'browser' | 'static' | 'none';
}

// Factory function type for getting validator
export type ValidatorFactory = () => Validator;
