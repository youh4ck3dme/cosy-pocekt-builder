#!/usr/bin/env node
/**
 * Environment Variable Validator for Cosy Pocket Builder.
 *
 * Validates production invariants and configurations:
 * - In production: DATABASE_URL must be provided and valid (Postgres/Neon connection string).
 * - In production: BETTER_AUTH_SECRET must be provided and >= 32 chars when auth is enabled.
 * - In production: BETTER_AUTH_URL must be a valid HTTP/HTTPS URL when auth is enabled.
 * - In development: tolerates missing DATABASE_URL with a clear note about PGLite fallback.
 */

export const KNOWN_VARS = {
  DATABASE_URL: {
    secret: true,
    requiredInProd: true,
    description: "PostgreSQL connection string with SSL (e.g. Neon, Supabase)",
    example: "postgresql://username:password@ep-sample-123456.eu-central-1.aws.neon.tech/neondb?sslmode=require",
  },
  NODE_ENV: {
    secret: false,
    requiredInProd: true,
    description: "Runtime environment mode ('production' or 'development')",
    example: "production",
  },
  VITE_AUTH_ENABLED: {
    secret: false,
    requiredInProd: true,
    description: "Toggle authentication & persistent database mode ('true' or 'false')",
    example: "true",
  },
  BETTER_AUTH_SECRET: {
    secret: true,
    requiredInProd: true, // when VITE_AUTH_ENABLED !== 'false'
    description: "Cryptographic secret (min 32 chars) for signing session cookies",
    example: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
  },
  BETTER_AUTH_URL: {
    secret: false,
    requiredInProd: true, // when VITE_AUTH_ENABLED !== 'false'
    description: "Canonical public origin of the deployed application",
    example: "https://cosy.h4ck3d.me",
  },
  MISTRAL_API_KEY: {
    secret: true,
    requiredInProd: false,
    description: "API key for Mistral AI generation (mistral-large-latest)",
    example: "sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  },
  XAI_API_KEY: {
    secret: true,
    requiredInProd: false,
    description: "API key for xAI / Grok AI generation",
    example: "xai-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  },
  RESEND_API_KEY: {
    secret: true,
    requiredInProd: false,
    description: "API key for transactional emails with client approval links",
    example: "re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  },
};

/**
 * Validates an environment map.
 *
 * @param {Object} options
 * @param {Record<string, string | undefined>} [options.env] Environment variables map
 * @param {"production" | "development"} [options.mode] Validation mode
 * @returns {{ ok: boolean, errors: string[], warnings: string[], info: string[] }}
 */
export function validateEnv({ env = process.env, mode } = {}) {
  const errors = [];
  const warnings = [];
  const info = [];

  const effectiveMode = mode || (env.NODE_ENV === "production" ? "production" : "development");
  const isProd = effectiveMode === "production";
  const authEnabled = env.VITE_AUTH_ENABLED !== "false";

  // 1. DATABASE_URL validation
  const dbUrl = (env.DATABASE_URL || "").trim();
  if (!dbUrl) {
    if (isProd) {
      errors.push(
        "DATABASE_URL is required in production. Cannot run without a persistent PostgreSQL database (e.g. Neon)."
      );
    } else {
      info.push("DATABASE_URL is not set. Local development will use embedded PGLite fallback.");
    }
  } else {
    if (!/^postgres(ql)?:\/\//i.test(dbUrl)) {
      errors.push("DATABASE_URL must be a valid PostgreSQL connection string starting with postgres:// or postgresql://");
    }
  }

  // 2. Authentication variables validation (when auth is enabled)
  if (authEnabled && isProd) {
    const authSecret = (env.BETTER_AUTH_SECRET || "").trim();
    if (!authSecret) {
      errors.push("BETTER_AUTH_SECRET is required in production when authentication is enabled.");
    } else if (authSecret.length < 32) {
      errors.push(`BETTER_AUTH_SECRET must be at least 32 characters long (current length: ${authSecret.length}).`);
    }

    const authUrl = (env.BETTER_AUTH_URL || "").trim();
    if (!authUrl) {
      warnings.push("BETTER_AUTH_URL is recommended in production to prevent cookie/origin mismatch.");
    } else if (!/^https?:\/\//i.test(authUrl)) {
      errors.push("BETTER_AUTH_URL must be a valid HTTP or HTTPS URL (e.g. https://cosy.h4ck3d.me).");
    }
  }

  // 3. AI provider check
  const mistralKey = (env.MISTRAL_API_KEY || "").trim();
  const xaiKey = (env.XAI_API_KEY || "").trim();
  if (!mistralKey && !xaiKey) {
    warnings.push("Neither MISTRAL_API_KEY nor XAI_API_KEY is configured. AI generation will be unavailable.");
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    info,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const isStrict = args.includes("--strict") || process.env.STRICT_PROD === "1";
  const modeArg = args.find((a) => a.startsWith("--mode="));
  const mode = modeArg ? modeArg.split("=")[1] : undefined;

  const result = validateEnv({ mode });

  console.log(`\n=== Environment Validation (${mode || process.env.NODE_ENV || "development"}) ===\n`);

  for (const msg of result.info) {
    console.log(`ℹ  INFO: ${msg}`);
  }
  for (const msg of result.warnings) {
    console.warn(`⚠  WARNING: ${msg}`);
  }
  for (const msg of result.errors) {
    console.error(`✖  ERROR: ${msg}`);
  }

  if (!result.ok) {
    console.error(`\nEnvironment validation failed with ${result.errors.length} error(s).\n`);
    if (isStrict || mode === "production" || process.env.NODE_ENV === "production") {
      process.exit(1);
    }
  } else {
    console.log("\n✔  Environment validation passed successfully.\n");
  }
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("validate-env.mjs")) {
  main().catch((err) => {
    console.error("Validation script error:", err);
    process.exit(1);
  });
}
