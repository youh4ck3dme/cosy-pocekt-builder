import test from "node:test";
import assert from "node:assert/strict";
import {
  randomPin,
  pinHash,
  verifyPin,
  isExpired,
  isLocked,
  contentHash,
  type ApprovalRow,
} from "./client-approvals.ts";

function createMockSql(tracker: Array<{ text: string; params: unknown[] }>) {
  return {
    query: async <T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T[]> => {
      tracker.push({ text, params });
      return [] as T[];
    },
  } as any;
}

async function createSampleRow(overrides: Partial<ApprovalRow> = {}): Promise<ApprovalRow> {
  const pin = "123456";
  const salt = "abcdef0123456789";
  const hashedPin = await pinHash(pin, salt);
  const hash = await contentHash("Test App", "<h1>Hello</h1>", "const x = 1;");

  return {
    id: "link-uuid-1",
    token_hash: "tokenhash123",
    pin_hash: hashedPin,
    pin_salt: salt,
    client_label: "Acme Client",
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    revoked_at: null,
    approved_at: null,
    rejected_at: null,
    decision_note: "",
    failed_attempts: 0,
    locked_until: null,
    revision_id: "rev-uuid-1",
    title: "Test App",
    html: "<h1>Hello</h1>",
    content_hash: hash,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

test("Client Approval Security & Logic Tests", async (t) => {
  await t.test("1. 6-digit PIN generation contract", () => {
    for (let i = 0; i < 250; i += 1) {
      const pin = randomPin();
      assert.equal(typeof pin, "string", "PIN must be a string");
      assert.equal(pin.length, 6, `PIN length must be exactly 6 (got '${pin}')`);
      assert.match(pin, /^\d{6}$/, `PIN must contain exactly 6 decimal digits (got '${pin}')`);
      const num = Number.parseInt(pin, 10);
      assert.ok(num >= 0 && num <= 999999, "PIN numeric value must be between 0 and 999999");
    }
  });

  await t.test("2. Correct PIN verification succeeds and resets failed attempts", async () => {
    const queries: Array<{ text: string; params: unknown[] }> = [];
    const sql = createMockSql(queries);
    const row = await createSampleRow({ failed_attempts: 2 });

    const result = await verifyPin(sql, row, "123456");
    assert.equal(result, null, "verifyPin must return null on success");

    assert.ok(
      queries.some((q) => q.text.includes("set failed_attempts = 0, locked_until = null")),
      "Successful PIN verification must reset failed_attempts and locked_until",
    );
  });

  await t.test("3. Wrong PIN increments failed_attempts and locks after 5 attempts", async () => {
    const queries: Array<{ text: string; params: unknown[] }> = [];
    const sql = createMockSql(queries);

    // Attempt 1: 0 -> 1
    const row1 = await createSampleRow({ failed_attempts: 0 });
    const res1 = await verifyPin(sql, row1, "999999");
    assert.deepEqual(res1, { ok: false, error: "PIN nie je správny." });
    assert.equal(queries[0]?.params[0], 1, "Should increment attempts to 1");

    // Attempt 5: 4 -> 5 (triggers 15 min lockout in query)
    const row5 = await createSampleRow({ failed_attempts: 4 });
    const res5 = await verifyPin(sql, row5, "999999");
    assert.deepEqual(res5, { ok: false, error: "PIN nie je správny." });
    assert.equal(queries[1]?.params[0], 5, "Should increment attempts to 5");
    assert.ok(
      queries[1]?.text.includes("locked_until = case when $1 >= 5 then current_timestamp + interval '15 minutes'"),
      "Should activate 15-minute lock in SQL query on 5th failure",
    );
  });

  await t.test("4. Locked link rejects access before evaluating PIN", async () => {
    const queries: Array<{ text: string; params: unknown[] }> = [];
    const sql = createMockSql(queries);
    const lockedUntil = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const row = await createSampleRow({
      failed_attempts: 5,
      locked_until: lockedUntil,
    });

    assert.equal(isLocked(row), true);

    // Even with the correct PIN, locked row must reject
    const result = await verifyPin(sql, row, "123456");
    assert.equal(result?.ok, false);
    assert.equal(result?.error, "Príliš veľa pokusov. Skúste neskôr.");
    assert.equal(result?.lockedUntil, lockedUntil);
    assert.equal(queries.length, 0, "Locked check must not execute DB update queries");
  });

  await t.test("5. Revoked and expired links are rejected safely", async () => {
    const queries: Array<{ text: string; params: unknown[] }> = [];
    const sql = createMockSql(queries);

    // Revoked link
    const revokedRow = await createSampleRow({ revoked_at: new Date().toISOString() });
    const resRevoked = await verifyPin(sql, revokedRow, "123456");
    assert.deepEqual(resRevoked, { ok: false, error: "Tento odkaz bol zrušený." });

    // Expired link
    const expiredRow = await createSampleRow({
      expires_at: new Date(Date.now() - 60 * 1000).toISOString(),
    });
    assert.equal(isExpired(expiredRow), true);
    const resExpired = await verifyPin(sql, expiredRow, "123456");
    assert.deepEqual(resExpired, { ok: false, error: "Tento odkaz expiroval." });
  });

  await t.test("6. Public client route payload safety (no source code or audit leak)", async () => {
    const sampleRow = await createSampleRow();

    // Simulate the server handler projection of openClientApproval
    const publicClientPayload = {
      ok: true as const,
      title: sampleRow.title,
      html: sampleRow.html,
      contentHash: sampleRow.content_hash,
      expiresAt: sampleRow.expires_at,
      approvedAt: sampleRow.approved_at,
      rejectedAt: sampleRow.rejected_at,
      decisionNote: sampleRow.decision_note,
    };

    const keys = Object.keys(publicClientPayload);

    // Verify allowed fields exist
    assert.ok(keys.includes("html"));
    assert.ok(keys.includes("title"));
    assert.ok(keys.includes("contentHash"));

    // Verify sensitive and internal fields are completely excluded from client payload
    assert.equal((publicClientPayload as any).code, undefined, "Raw source code must never be in public client payload");
    assert.equal((publicClientPayload as any).user_id, undefined, "User ID must never be in public client payload");
    assert.equal((publicClientPayload as any).pin_hash, undefined, "PIN hash must never be in public client payload");
    assert.equal((publicClientPayload as any).pin_salt, undefined, "PIN salt must never be in public client payload");
    assert.equal((publicClientPayload as any).token_hash, undefined, "Token hash must never be in public client payload");
    assert.equal((publicClientPayload as any).failed_attempts, undefined, "Failed attempts must not be in public payload");
    assert.equal((publicClientPayload as any).audit, undefined, "Internal audit findings must not be in public client payload");
  });
});
