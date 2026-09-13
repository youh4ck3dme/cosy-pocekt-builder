import test from "node:test";
import assert from "node:assert/strict";
import { validateEnv } from "./validate-env.mjs";

test("Environment Validation Tests", async (t) => {
  await t.test("production: fails when DATABASE_URL is missing", () => {
    const result = validateEnv({
      mode: "production",
      env: {
        NODE_ENV: "production",
        VITE_AUTH_ENABLED: "false",
      },
    });

    assert.equal(result.ok, false);
    assert.ok(result.errors.some((e) => e.includes("DATABASE_URL is required in production")));
  });

  await t.test("production: fails when DATABASE_URL is not a postgres string", () => {
    const result = validateEnv({
      mode: "production",
      env: {
        NODE_ENV: "production",
        DATABASE_URL: "mysql://localhost/test",
        VITE_AUTH_ENABLED: "false",
      },
    });

    assert.equal(result.ok, false);
    assert.ok(result.errors.some((e) => e.includes("PostgreSQL connection string starting with postgres://")));
  });

  await t.test("production: fails when BETTER_AUTH_SECRET is too short with auth enabled", () => {
    const result = validateEnv({
      mode: "production",
      env: {
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://user:pass@host/db",
        VITE_AUTH_ENABLED: "true",
        BETTER_AUTH_SECRET: "too-short-secret",
        BETTER_AUTH_URL: "https://example.com",
      },
    });

    assert.equal(result.ok, false);
    assert.ok(result.errors.some((e) => e.includes("at least 32 characters long")));
  });

  await t.test("production: passes with valid PostgreSQL URL and Better Auth credentials", () => {
    const result = validateEnv({
      mode: "production",
      env: {
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://user:pass@ep-cool.neon.tech/neondb?sslmode=require",
        VITE_AUTH_ENABLED: "true",
        BETTER_AUTH_SECRET: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        BETTER_AUTH_URL: "https://cosy.h4ck3d.me",
        MISTRAL_API_KEY: "sk-test123456",
      },
    });

    assert.equal(result.ok, true);
    assert.equal(result.errors.length, 0);
  });

  await t.test("development: tolerates missing DATABASE_URL with PGLite fallback note", () => {
    const result = validateEnv({
      mode: "development",
      env: {
        NODE_ENV: "development",
        VITE_AUTH_ENABLED: "true",
      },
    });

    assert.equal(result.ok, true);
    assert.ok(result.info.some((i) => i.includes("PGLite fallback")));
  });
});
