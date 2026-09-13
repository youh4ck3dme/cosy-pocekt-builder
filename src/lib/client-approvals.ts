import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "./auth/middleware.ts";

type SqlClient = Awaited<ReturnType<typeof import("./db.ts").getSql>>;

export type ApprovalRow = {
  id: string;
  token_hash: string;
  pin_hash: string;
  pin_salt: string;
  client_label: string;
  expires_at: string;
  revoked_at: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  decision_note: string;
  failed_attempts: number;
  locked_until: string | null;
  revision_id: string;
  title: string;
  html: string;
  content_hash: string;
  created_at: string;
};

export type ClientApprovalDraft = {
  id: string;
  url: string;
  pin: string;
  expiresAt: string;
  title: string;
};

export type ClientApprovalPreview =
  | { ok: false; error: string; lockedUntil?: string }
  | {
      ok: true;
      title: string;
      html: string;
      contentHash: string;
      expiresAt: string;
      approvedAt: string | null;
      rejectedAt: string | null;
      decisionNote: string;
    };

function clean(value: unknown, max: number): string {
  return String(value ?? "").trim().slice(0, max);
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return bytesToHex(new Uint8Array(digest));
}

function randomHex(bytes: number): string {
  const data = new Uint8Array(bytes);
  crypto.getRandomValues(data);
  return bytesToHex(data);
}

export async function contentHash(title: string, html: string, code: string): Promise<string> {
  return sha256(JSON.stringify({ title, html, code }));
}

export async function pinHash(pin: string, salt: string): Promise<string> {
  return sha256(`${salt}:${pin}`);
}

export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function randomToken(): string {
  return randomHex(32);
}

export function randomPin(): string {
  const data = new Uint32Array(1);
  crypto.getRandomValues(data);
  const n = (data[0] ?? 0) % 1_000_000;
  return n.toString().padStart(6, "0");
}

async function getDb(): Promise<SqlClient> {
  const { getSql } = await import("./db.ts");
  return getSql();
}

export async function findByToken(sql: SqlClient, token: string): Promise<ApprovalRow | null> {
  const rows = await sql.query<ApprovalRow>(
    `select l.*, r.title, r.html, r.content_hash, r.created_at
       from client_approval_links l
       join project_revisions r on r.id = l.revision_id
      where l.token_hash = $1
      limit 1`,
    [await sha256(token)],
  );
  return rows[0] ?? null;
}

export function isExpired(row: ApprovalRow): boolean {
  return Date.parse(row.expires_at) <= Date.now();
}

export function isLocked(row: ApprovalRow): boolean {
  return Boolean(row.locked_until && Date.parse(row.locked_until) > Date.now());
}

export async function verifyPin(sql: SqlClient, row: ApprovalRow, pin: string): Promise<ClientApprovalPreview | null> {
  if (row.revoked_at) return { ok: false, error: "Tento odkaz bol zrušený." };
  if (isExpired(row)) return { ok: false, error: "Tento odkaz expiroval." };
  if (isLocked(row)) return { ok: false, error: "Príliš veľa pokusov. Skúste neskôr.", lockedUntil: row.locked_until ?? undefined };

  const valid = safeEqual(await pinHash(pin, row.pin_salt), row.pin_hash);
  if (!valid) {
    const nextAttempts = row.failed_attempts + 1;
    await sql.query(
      `update client_approval_links
          set failed_attempts = $1,
              locked_until = case when $1 >= 5 then current_timestamp + interval '15 minutes' else locked_until end
        where id = $2`,
      [nextAttempts, row.id],
    );
    return { ok: false, error: "PIN nie je správny." };
  }

  if (row.failed_attempts > 0 || row.locked_until) {
    await sql.query("update client_approval_links set failed_attempts = 0, locked_until = null where id = $1", [row.id]);
  }

  return null;
}

export const createClientApprovalLink = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { title: string; html: string; code?: string; clientLabel?: string; days?: number }) => ({
    title: clean(input?.title, 160) || "Untitled project",
    html: String(input?.html ?? ""),
    code: String(input?.code ?? input?.html ?? ""),
    clientLabel: clean(input?.clientLabel, 120),
    days: Math.min(30, Math.max(1, Number(input?.days) || 7)),
  }))
  .handler(async ({ context, data }): Promise<ClientApprovalDraft> => {
    if (!data.html.trim()) throw new Error("Najprv vytvorte alebo načítajte projekt.");
    if (data.html.length > 750_000) throw new Error("Projekt je príliš veľký na klientské schválenie.");

    const sql = await getDb();
    const revisionId = crypto.randomUUID();
    const linkId = crypto.randomUUID();
    const token = randomToken();
    const pin = randomPin();
    const salt = randomHex(16);
    const hash = await contentHash(data.title, data.html, data.code);
    const expiresAt = new Date(Date.now() + data.days * 24 * 60 * 60 * 1000).toISOString();

    await sql.query(
      `with revision as (
          insert into project_revisions (id, user_id, title, html, code, content_hash)
          values ($1, $2, $3, $4, $5, $6)
          returning id
        )
        insert into client_approval_links
          (id, user_id, revision_id, token_hash, pin_hash, pin_salt, client_label, expires_at)
        select $7, $2, revision.id, $8, $9, $10, $11, $12
          from revision`,
      [
        revisionId,
        context.userId,
        data.title,
        data.html,
        data.code,
        hash,
        linkId,
        await sha256(token),
        await pinHash(pin, salt),
        salt,
        data.clientLabel,
        expiresAt,
      ],
    );

    return {
      id: linkId,
      url: `/client/${token}`,
      pin,
      expiresAt,
      title: data.title,
    };
  });

export const openClientApproval = createServerFn({ method: "POST" })
  .validator((input: { token: string; pin: string }) => ({
    token: clean(input?.token, 200),
    pin: clean(input?.pin, 12),
  }))
  .handler(async ({ data }): Promise<ClientApprovalPreview> => {
    const sql = await getDb();
    const row = await findByToken(sql, data.token);
    if (!row) return { ok: false, error: "Odkaz neexistuje alebo expiroval." };
    const pinError = await verifyPin(sql, row, data.pin);
    if (pinError) return pinError;
    return {
      ok: true,
      title: row.title,
      html: row.html,
      contentHash: row.content_hash,
      expiresAt: row.expires_at,
      approvedAt: row.approved_at,
      rejectedAt: row.rejected_at,
      decisionNote: row.decision_note,
    };
  });

export const decideClientApproval = createServerFn({ method: "POST" })
  .validator((input: { token: string; pin: string; decision: "approved" | "rejected"; note?: string }) => ({
    token: clean(input?.token, 200),
    pin: clean(input?.pin, 12),
    decision: input?.decision === "rejected" ? "rejected" as const : "approved" as const,
    note: clean(input?.note, 1000),
  }))
  .handler(async ({ data }) => {
    const sql = await getDb();
    const row = await findByToken(sql, data.token);
    if (!row) return { ok: false, error: "Odkaz neexistuje alebo expiroval." };
    const pinError = await verifyPin(sql, row, data.pin);
    if (pinError) return pinError;

    if (data.decision === "approved") {
      await sql.query(
        `update client_approval_links
            set approved_at = coalesce(approved_at, current_timestamp),
                rejected_at = null,
                decision_note = $1
          where id = $2`,
        [data.note, row.id],
      );
    } else {
      await sql.query(
        `update client_approval_links
            set rejected_at = coalesce(rejected_at, current_timestamp),
                approved_at = null,
                decision_note = $1
          where id = $2`,
        [data.note, row.id],
      );
    }
    return { ok: true, decision: data.decision };
  });

export type ClientApprovalStatusResult = {
  hasLink: boolean;
  status: "none" | "pending" | "approved" | "rejected";
  clientLabel?: string;
  createdAt?: string;
  expiresAt?: string;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  failedAttempts?: number;
  isLocked?: boolean;
};

export const getClientApprovalStatus = createServerFn({ method: "GET" })
  .validator((input: { linkId?: string }) => ({
    linkId: clean(input?.linkId, 100),
  }))
  .handler(async ({ data }): Promise<ClientApprovalStatusResult> => {
    if (!data.linkId) {
      return { hasLink: false, status: "none" };
    }
    const sql = await getDb();
    const rows = await sql.query(
      `select client_label, expires_at, revoked_at, approved_at, rejected_at,
              failed_attempts, locked_until, created_at
         from client_approval_links
        where id = $1
        limit 1`,
      [data.linkId],
    );
    if (!rows.length) return { hasLink: false, status: "none" };
    const r = rows[0] as {
      client_label: string;
      expires_at: string;
      revoked_at: string | null;
      approved_at: string | null;
      rejected_at: string | null;
      failed_attempts: number;
      locked_until: string | null;
      created_at: string;
    };
    let status: "none" | "pending" | "approved" | "rejected" = "pending";
    if (r.approved_at) status = "approved";
    else if (r.rejected_at) status = "rejected";
    else if (r.revoked_at || new Date(r.expires_at).getTime() < Date.now()) status = "none";

    const isLocked = Boolean(r.locked_until && new Date(r.locked_until).getTime() > Date.now());

    return {
      hasLink: true,
      status,
      clientLabel: r.client_label,
      createdAt: r.created_at,
      expiresAt: r.expires_at,
      approvedAt: r.approved_at,
      rejectedAt: r.rejected_at,
      failedAttempts: Number(r.failed_attempts || 0),
      isLocked,
    };
  });

