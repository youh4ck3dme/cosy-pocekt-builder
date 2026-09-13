import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import { AsyncLocalStorage } from "node:async_hooks";
import { uploadWordPressMedia } from "./wordpress.ts";
import { getSql } from "./db.ts";

const GLOBAL_STORAGE_KEY = Symbol.for("tanstack-start:start-storage-context");
const globalObj = globalThis as Record<symbol, AsyncLocalStorage<unknown>>;
if (!globalObj[GLOBAL_STORAGE_KEY]) {
  globalObj[GLOBAL_STORAGE_KEY] = new AsyncLocalStorage();
}
const startStorage = globalObj[GLOBAL_STORAGE_KEY];

function withServerContext<T>(fn: () => Promise<T>): Promise<T> {
  const mockReq = new Request("https://cozy.h4ck3d.me/api", {
    headers: {
      host: "cozy.h4ck3d.me",
      "sec-fetch-site": "same-origin",
    },
  });
  return startStorage.run({ request: mockReq }, fn);
}

describe("WordPress Media Upload (src/lib/wordpress.ts)", () => {
  const originalFetch = globalThis.fetch;
  const originalAuthEnabled = process.env.VITE_AUTH_ENABLED;
  const originalCryptoKey = process.env.WORDPRESS_ENCRYPTION_KEY;

  beforeEach(() => {
    process.env.VITE_AUTH_ENABLED = "true";
    process.env.WORDPRESS_ENCRYPTION_KEY = "test-media-upload-encryption-secret";
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    if (originalAuthEnabled !== undefined) {
      process.env.VITE_AUTH_ENABLED = originalAuthEnabled;
    } else {
      delete process.env.VITE_AUTH_ENABLED;
    }
    if (originalCryptoKey !== undefined) {
      process.env.WORDPRESS_ENCRYPTION_KEY = originalCryptoKey;
    } else {
      delete process.env.WORDPRESS_ENCRYPTION_KEY;
    }
  });

  it("1. rejects oversized Base64 payload exceeding 10,000,000 chars", async () => {
    const hugePayload = "A".repeat(10_000_001);
    await assert.rejects(
      () =>
        withServerContext(() =>
          uploadWordPressMedia({
            data: {
              id: "conn-123",
              filename: "photo.webp",
              mimeType: "image/webp",
              contentBase64: hugePayload,
            },
          }),
        ),
      /Komprimovaný súbor je príliš veľký/,
    );
  });

  it("2. fails safely when connection ID does not exist for the user", async () => {
    await assert.rejects(
      () =>
        withServerContext(() =>
          uploadWordPressMedia({
            data: {
              id: "non-existent-id-9999",
              filename: "test.webp",
              mimeType: "image/webp",
              contentBase64: "dGVzdA==",
            },
          }),
        ),
      /Pripojenie neexistuje/,
    );
  });

  it("3. sanitizes dangerous quotes and backslashes from filename in Content-Disposition", async () => {
    // Setup in-memory connection in DB
    const sql = await getSql();
    const testUserId = "dev-user";
    const connId = "test-media-sanitize-conn";

    // Ensure clean state
    await sql`delete from wordpress_connections where id = ${connId}`;
    const { encryptWordPressPassword } = await import("./wordpress-crypto.server.ts");
    const encryptedPwd = encryptWordPressPassword("sample-app-pwd");

    await sql`
      insert into wordpress_connections (
        id, user_id, site_url, username, encrypted_password, label, created_at, updated_at
      ) values (
        ${connId}, ${testUserId}, 'https://1.1.1.1', 'admin', ${encryptedPwd}, 'Test Site', NOW(), NOW()
      )
    `;

    let capturedHeaders: Headers | undefined;
    let capturedBody: Buffer | undefined;

    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = input.toString();
      if (url.includes("/wp-json/wp/v2/media")) {
        capturedHeaders = new Headers(init?.headers);
        capturedBody = init?.body as Buffer;
        return new Response(JSON.stringify({ id: 1042 }), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response("Not found", { status: 404 });
    }) as typeof fetch;

    const evilFilename = 'malicious"; attack=\\evil; filename="hack.png';
    const payloadBytes = Buffer.from("fake-webp-bytes");

    await withServerContext(() =>
      uploadWordPressMedia({
        data: {
          id: connId,
          filename: evilFilename,
          mimeType: "image/webp",
          contentBase64: payloadBytes.toString("base64"),
        },
      }),
    );

    assert.ok(capturedHeaders, "Headers must be captured");
    assert.equal(capturedHeaders.get("Content-Type"), "image/webp");

    const contentDisposition = capturedHeaders.get("Content-Disposition") || "";
    // Verify quotes and backslashes are stripped from filename inside header
    assert.ok(!contentDisposition.includes('\\'));
    assert.equal(contentDisposition, 'attachment; filename="malicious; attack=evil; filename=hack.png"');

    // Verify payload body is reconstructed from base64
    assert.ok(capturedBody instanceof Buffer);
    assert.equal(capturedBody.toString(), "fake-webp-bytes");

    // Cleanup
    await sql`delete from wordpress_connections where id = ${connId}`;
  });

  it("4. rejects upload when VITE_AUTH_ENABLED is false", async () => {
    process.env.VITE_AUTH_ENABLED = "false";
    await assert.rejects(
      () =>
        withServerContext(() =>
          uploadWordPressMedia({
            data: {
              id: "conn-123",
              filename: "photo.webp",
              mimeType: "image/webp",
              contentBase64: "dGVzdA==",
            },
          }),
        ),
      /Pre pripojenie WordPressu je potrebné zapnúť prihlásenie/,
    );
  });
});
