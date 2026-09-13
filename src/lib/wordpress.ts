import { authMiddleware } from "./auth/middleware.ts";
import { createServerFn } from "@tanstack/react-start";

type SqlClient = Awaited<ReturnType<typeof import("./db.ts").getSql>>;

async function getDb(): Promise<SqlClient> {
  const { getSql } = await import("./db.ts");
  return getSql();
}

export type WordPressConnection = {
  id: string;
  siteUrl: string;
  username: string;
  label: string;
  createdAt: string;
  updatedAt: string;
  lastTestedAt: string | null;
};

type Row = {
  id: string;
  site_url: string;
  username: string;
  label: string;
  created_at: string;
  updated_at: string;
  last_tested_at: string | null;
  encrypted_password: string;
};

export type WordPressContent = {
  id: number;
  type: "post" | "page";
  title: string;
  content: string;
  excerpt: string;
  status: string;
  link: string | null;
  date: string | null;
  modified: string | null;
  slug: string;
  author: number | null;
  comments: number;
  featuredMedia: number | null;
};

type WpItem = {
  id?: number;
  date?: string;
  modified?: string;
  link?: string;
  status?: string;
  title?: { rendered?: string };
  content?: { rendered?: string };
  excerpt?: { rendered?: string };
  slug?: string;
  author?: number;
  comment_status?: string;
  comment_count?: number;
  featured_media?: number;
};

function cleanText(value: unknown, max: number): string {
  return String(value ?? "").trim().slice(0, max);
}

async function encrypt(value: string): Promise<string> {
  const { encryptWordPressPassword } = await import("./wordpress-crypto.server.ts");
  return encryptWordPressPassword(value);
}

async function decrypt(value: string): Promise<string> {
  const { decryptWordPressPassword } = await import("./wordpress-crypto.server.ts");
  return decryptWordPressPassword(value);
}

async function requireConfiguredAuth(): Promise<void> {
  if (process.env.VITE_AUTH_ENABLED === "false") {
    throw new Error("Pre pripojenie WordPressu je potrebné zapnúť prihlásenie.");
  }
}

async function requestWordPress(url: URL, username: string, password: string, init: RequestInit = {}) {
  const { validateWordPressUrl } = await import("./wordpress-validation.server.ts");
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`);
  headers.set("Accept", "application/json");
  let current = url;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    await validateWordPressUrl(current.toString());
    const response = await fetch(current, { ...init, headers, redirect: "manual" });
    if (response.status < 300 || response.status >= 400) return response;
    const location = response.headers.get("location");
    if (!location) return response;
    current = new URL(location, current);
  }
  throw new Error("Príliš veľa presmerovaní.");
}

function toConnection(row: Row): WordPressConnection {
  return {
    id: row.id,
    siteUrl: row.site_url,
    username: row.username,
    label: row.label,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastTestedAt: row.last_tested_at,
  };
}

async function validateCredentials(siteUrl: string, username: string, password: string) {
  const { validateWordPressUrl, redactWordPressError } = await import("./wordpress-validation.server.ts");
  const url = await validateWordPressUrl(siteUrl);
  if (!username || !password) throw new Error("Používateľské meno a heslo sú povinné.");
  let response: Response;
  try {
    response = await requestWordPress(new URL("/wp-json/wp/v2/users/me?context=view", url), username, password);
  } catch (error) {
    throw new Error(redactWordPressError(error));
  }

  if (!response.ok) throw new Error(response.status === 401 ? "WordPress prihlasovacie údaje nie sú správne." : `WordPress odpovedal chybou (${response.status}).`);
  return url;
}

async function connectionFor(sql: SqlClient, userId: string, id: string): Promise<Row> {
  const row = (await sql<Row>`select * from wordpress_connections where id = ${id} and user_id = ${userId}`)[0];
  if (!row?.encrypted_password) throw new Error("Pripojenie neexistuje.");
  return row;
}

function mapContent(item: WpItem, type: "post" | "page"): WordPressContent {
  return {
    id: item.id ?? 0, type, title: item.title?.rendered ?? "", content: item.content?.rendered ?? "",
    excerpt: item.excerpt?.rendered ?? "", status: item.status ?? "unknown", link: item.link ?? null,
    date: item.date ?? null, modified: item.modified ?? null, slug: item.slug ?? "",
    author: item.author ?? null, comments: item.comment_count ?? 0,
    featuredMedia: item.featured_media ?? null,
  };
}

async function wpJson(row: Row, path: string, init?: RequestInit): Promise<WpItem | WpItem[]> {
  const { validateWordPressUrl } = await import("./wordpress-validation.server");
  const url = await validateWordPressUrl(row.site_url);
  const response = await requestWordPress(new URL(`/wp-json/wp/v2/${path.replace(/^\/+/, "")}`, url), row.username, await decrypt(row.encrypted_password!), init);
  if (!response.ok) throw new Error(`WordPress odpovedal chybou (${response.status}).`);
  return (await response.json()) as WpItem | WpItem[];
}

function jsonBody(body: Record<string, unknown>): RequestInit {
  return { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

export const listWordPressConnections = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<WordPressConnection[]> => {
    await requireConfiguredAuth();
    const sql = await getDb();
    const rows = await sql<Row>`select id, site_url, username, label, created_at, updated_at, last_tested_at from wordpress_connections where user_id = ${context.userId} order by created_at desc`;
    return rows.map(toConnection);
  });

export const createWordPressConnection = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { siteUrl: string; username: string; password: string; label?: string }) => input)
  .handler(async ({ context, data }) => {
    await requireConfiguredAuth();
    const siteUrl = (await validateCredentials(data.siteUrl, cleanText(data.username, 160), data.password)).origin;
    const sql = await getDb();
    const id = crypto.randomUUID();
    const encrypted = await encrypt(data.password);
    const rows = await sql<Row>`insert into wordpress_connections (id, user_id, site_url, username, encrypted_password, label, last_tested_at) values (${id}, ${context.userId}, ${siteUrl}, ${cleanText(data.username, 160)}, ${encrypted}, ${cleanText(data.label, 120)}, current_timestamp) returning id, site_url, username, label, created_at, updated_at, last_tested_at`;
    return toConnection(rows[0]);
  });

export const connectWordPress = createWordPressConnection;

export const testWordPressConnection = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string }) => ({ id: cleanText(input?.id, 80) }))
  .handler(async ({ context, data }) => {
    await requireConfiguredAuth();
    const sql = await getDb();
    const row = await connectionFor(sql, context.userId, data.id);
    await validateCredentials(row.site_url, row.username, await decrypt(row.encrypted_password));
    await sql`update wordpress_connections set last_tested_at = current_timestamp, updated_at = current_timestamp where id = ${data.id} and user_id = ${context.userId}`;
    return { ok: true };
  });

export const updateWordPressConnection = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string; siteUrl: string; username: string; password?: string; label?: string }) => input)
  .handler(async ({ context, data }) => {
    await requireConfiguredAuth();
    const sql = await getDb();
    const existing = (await sql<Row>`select * from wordpress_connections where id = ${cleanText(data.id, 80)} and user_id = ${context.userId}`)[0];
    if (!existing?.encrypted_password) throw new Error("Pripojenie neexistuje.");
    const password = data.password?.trim() || await decrypt(existing.encrypted_password);
    const siteUrl = (await validateCredentials(data.siteUrl, cleanText(data.username, 160), password)).origin;
    const encrypted = data.password?.trim() ? await encrypt(password) : existing.encrypted_password;
    const rows = await sql<Row>`update wordpress_connections set site_url = ${siteUrl}, username = ${cleanText(data.username, 160)}, encrypted_password = ${encrypted}, label = ${cleanText(data.label, 120)}, updated_at = current_timestamp, last_tested_at = current_timestamp where id = ${existing.id} and user_id = ${context.userId} returning id, site_url, username, label, created_at, updated_at, last_tested_at`;
    return toConnection(rows[0]);
  });

export const deleteWordPressConnection = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string }) => ({ id: cleanText(input?.id, 80) }))
  .handler(async ({ context, data }) => {
    await requireConfiguredAuth();
    const sql = await getDb();
    await sql`delete from wordpress_connections where id = ${data.id} and user_id = ${context.userId}`;
    return { ok: true };
  });

export const disconnectWordPress = deleteWordPressConnection;

export const listWordPressMedia = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string }) => ({ id: cleanText(input?.id, 80) }))
  .handler(async ({ context, data }) => {
    await requireConfiguredAuth();
    const sql = await getDb();
    const row = await connectionFor(sql, context.userId, data.id);
    const response = await requestWordPress(new URL("/wp-json/wp/v2/media?per_page=50", await (await import("./wordpress-validation.server.ts")).validateWordPressUrl(row.site_url)), row.username, await decrypt(row.encrypted_password));
    if (!response.ok) throw new Error("WordPress médiá sa nepodarilo načítať.");
    const media = (await response.json()) as Array<{ id?: number; date?: string; link?: string; title?: { rendered?: string } }>;
    return media.map((item) => ({ id: item.id ?? 0, date: item.date ?? null, link: item.link ?? null, title: item.title?.rendered ?? "" }));
  });

export const uploadWordPressMedia = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string; filename: string; mimeType: string; contentBase64: string }) => input)
  .handler(async ({ context, data }) => {
    await requireConfiguredAuth();
    if (data.contentBase64.length > 10_000_000) throw new Error("Komprimovaný súbor je príliš veľký (limit 7,5 MB).");
    const sql = await getDb();
    const row = await connectionFor(sql, context.userId, cleanText(data.id, 80));
    const url = await (await import("./wordpress-validation.server.ts")).validateWordPressUrl(row.site_url);
    const response = await requestWordPress(new URL("/wp-json/wp/v2/media", url), row.username, await decrypt(row.encrypted_password), {
      method: "POST",
      headers: { "Content-Type": cleanText(data.mimeType, 100), "Content-Disposition": `attachment; filename="${cleanText(data.filename, 120).replace(/["\\]/g, "")}"` },
      body: Buffer.from(data.contentBase64, "base64"),
    });
    if (!response.ok) throw new Error(`Nahrávanie médií zlyhalo (${response.status}).`);
    return { id: (await response.json() as { id?: number }).id };
  });

export const listWordPressContent = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string; type?: "post" | "page"; status?: string; search?: string; page?: number; perPage?: number }) => ({
    id: cleanText(input?.id, 80), type: input?.type, status: cleanText(input?.status, 20),
    search: cleanText(input?.search, 120), page: Math.max(1, Number(input?.page) || 1),
    perPage: Math.min(50, Math.max(1, Number(input?.perPage) || 20)),
  }))
  .handler(async ({ context, data }): Promise<WordPressContent[]> => {
    await requireConfiguredAuth();
    const sql = await getDb();
    const row = await connectionFor(sql, context.userId, data.id);
    const types: Array<"post" | "page"> = data.type ? [data.type] : ["post", "page"];
    const results = await Promise.all(types.map(async (type) => {
      const params = new URLSearchParams({ per_page: String(data.perPage), page: String(data.page), context: "edit" });
      if (data.status && data.status !== "all") params.set("status", data.status);
      if (data.search) params.set("search", data.search);
      const items = await wpJson(row, `${type}s?${params.toString()}`);
      return (Array.isArray(items) ? items : []).map((item) => mapContent(item, type));
    }));
    return results.flat().sort((a, b) => (b.modified ?? "").localeCompare(a.modified ?? ""));
  });

export const getWordPressContent = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string; type: "post" | "page"; contentId: number }) => ({ id: cleanText(input?.id, 80), type: input.type, contentId: Number(input.contentId) }))
  .handler(async ({ context, data }): Promise<WordPressContent> => {
    await requireConfiguredAuth();
    const row = await connectionFor(await getDb(), context.userId, data.id);
    const item = await wpJson(row, `${data.type}s/${data.contentId}?context=edit`);
    return mapContent(Array.isArray(item) ? item[0] : item, data.type);
  });

export const createWordPressContent = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string; type: "post" | "page"; title: string; content: string; excerpt?: string; slug?: string; status?: string; featuredMedia?: number | null }) => input)
  .handler(async ({ context, data }): Promise<WordPressContent> => {
    await requireConfiguredAuth();
    const row = await connectionFor(await getDb(), context.userId, cleanText(data.id, 80));
    const item = await wpJson(row, `${data.type}s`, jsonBody({ title: cleanText(data.title, 300), slug: cleanText(data.slug, 200), excerpt: String(data.excerpt ?? "").slice(0, 5000), content: String(data.content ?? "").slice(0, 200000), status: ["publish", "draft", "pending", "private"].includes(data.status ?? "") ? data.status : "draft", featured_media: data.featuredMedia ?? 0 }));
    return mapContent(Array.isArray(item) ? item[0] : item, data.type);
  });

export const updateWordPressContent = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string; type: "post" | "page"; contentId: number; title: string; content: string; excerpt?: string; slug?: string; status?: string; featuredMedia?: number | null }) => input)
  .handler(async ({ context, data }): Promise<WordPressContent> => {
    await requireConfiguredAuth();
    const row = await connectionFor(await getDb(), context.userId, cleanText(data.id, 80));
    const item = await wpJson(row, `${data.type}s/${Number(data.contentId)}`, jsonBody({ title: cleanText(data.title, 300), slug: cleanText(data.slug, 200), excerpt: String(data.excerpt ?? "").slice(0, 5000), content: String(data.content ?? "").slice(0, 200000), status: ["publish", "draft", "pending", "private"].includes(data.status ?? "") ? data.status : "draft", featured_media: data.featuredMedia ?? 0 }));
    return mapContent(Array.isArray(item) ? item[0] : item, data.type);
  });

export const deleteWordPressContent = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string; type: "post" | "page"; contentId: number }) => ({ id: cleanText(input?.id, 80), type: input.type, contentId: Number(input.contentId) }))
  .handler(async ({ context, data }) => {
    await requireConfiguredAuth();
    const row = await connectionFor(await getDb(), context.userId, data.id);
    const result = await wpJson(row, `${data.type}s/${data.contentId}?force=true`, { method: "DELETE" });
    return { ok: !Array.isArray(result) };
  });

/** Export a local editor document to WordPress, creating or updating its remote counterpart. */
export const exportToWordPress = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string; type: "post" | "page"; contentId?: number; title: string; content: string; publish?: boolean }) => input)
  .handler(async ({ context, data }): Promise<WordPressContent> => {
    await requireConfiguredAuth();
    const row = await connectionFor(await getDb(), context.userId, cleanText(data.id, 80));
    const body = jsonBody({ title: cleanText(data.title, 300), content: String(data.content ?? "").slice(0, 200000), status: data.publish ? "publish" : "draft" });
    const endpoint = data.contentId ? `${data.type}s/${Number(data.contentId)}` : `${data.type}s`;
    const item = await wpJson(row, endpoint, body);
    return mapContent(Array.isArray(item) ? item[0] : item, data.type);
  });

type SerializableValue = string | number | boolean | null | undefined | SerializableValue[] | { [key: string]: SerializableValue };
export type JsonRecord = Record<string, SerializableValue>;

async function wpApiJson<T extends JsonRecord | JsonRecord[] = JsonRecord>(row: Row, path: string, init?: RequestInit): Promise<T> {
  const { validateWordPressUrl } = await import("./wordpress-validation.server.ts");
  const url = await validateWordPressUrl(row.site_url);
  const normalizedPath = path.startsWith("wp-json/") ? path : `wp-json/${path.replace(/^\/+/, "")}`;
  const response = await requestWordPress(new URL(`/${normalizedPath}`, url), row.username, await decrypt(row.encrypted_password!), init);
  if (!response.ok) throw new Error(`WordPress odpovedal chybou (${response.status}).`);
  return (await response.json()) as T;
}

export const listJetEngineCctItems = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string; cctSlug: string; page?: number; perPage?: number }) => ({
    id: cleanText(input?.id, 80),
    cctSlug: cleanText(input?.cctSlug, 80),
    page: Math.max(1, Number(input?.page) || 1),
    perPage: Math.min(100, Math.max(1, Number(input?.perPage) || 50)),
  }))
  .handler(async ({ context, data }): Promise<JsonRecord[]> => {
    await requireConfiguredAuth();
    const row = await connectionFor(await getDb(), context.userId, data.id);
    const params = new URLSearchParams({ page: String(data.page), per_page: String(data.perPage) });
    return wpApiJson<JsonRecord[]>(row, `jet-cct/${encodeURIComponent(data.cctSlug)}?${params.toString()}`);
  });

export const createJetEngineCctItem = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string; cctSlug: string; itemData: Record<string, unknown> }) => ({
    id: cleanText(input?.id, 80),
    cctSlug: cleanText(input?.cctSlug, 80),
    itemData: input?.itemData ?? {},
  }))
  .handler(async ({ context, data }): Promise<JsonRecord> => {
    await requireConfiguredAuth();
    const row = await connectionFor(await getDb(), context.userId, data.id);
    return wpApiJson<JsonRecord>(row, `jet-cct/${encodeURIComponent(data.cctSlug)}`, jsonBody(data.itemData));
  });

export const updateJetEngineCctItem = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string; cctSlug: string; itemId: number; itemData: Record<string, unknown> }) => ({
    id: cleanText(input?.id, 80),
    cctSlug: cleanText(input?.cctSlug, 80),
    itemId: Number(input?.itemId),
    itemData: input?.itemData ?? {},
  }))
  .handler(async ({ context, data }): Promise<JsonRecord> => {
    await requireConfiguredAuth();
    const row = await connectionFor(await getDb(), context.userId, data.id);
    return wpApiJson<JsonRecord>(row, `jet-cct/${encodeURIComponent(data.cctSlug)}/${data.itemId}`, jsonBody(data.itemData));
  });

export const deleteJetEngineCctItem = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string; cctSlug: string; itemId: number }) => ({
    id: cleanText(input?.id, 80),
    cctSlug: cleanText(input?.cctSlug, 80),
    itemId: Number(input?.itemId),
  }))
  .handler(async ({ context, data }): Promise<JsonRecord> => {
    await requireConfiguredAuth();
    const row = await connectionFor(await getDb(), context.userId, data.id);
    return wpApiJson<JsonRecord>(row, `jet-cct/${encodeURIComponent(data.cctSlug)}/${data.itemId}`, { method: "DELETE" });
  });

export const syncGruppaTaxonomyToWordPress = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: {
    id: string;
    taxonomies: Array<{ name: string; slug: string }>;
    terms: Array<{ name: string; slug: string; taxonomy: string }>;
  }) => input)
  .handler(async ({ context, data }): Promise<import("@/types/wordpress").GruppaSyncResult> => {
    await requireConfiguredAuth();
    const row = await connectionFor(await getDb(), context.userId, cleanText(data.id, 80));
    let syncedTaxonomies = 0;
    let syncedTerms = 0;
    const errors: string[] = [];

    for (const tax of data.taxonomies || []) {
      try {
        await wpApiJson(row, "jet-cct/taxonomy", jsonBody({ name: cleanText(tax.name, 120), slug: cleanText(tax.slug, 120), cct_status: "publish" }));
        syncedTaxonomies += 1;
      } catch (err: unknown) {
        errors.push(`Taxonómia ${tax.name}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    for (const term of data.terms || []) {
      try {
        await wpApiJson(row, "jet-cct/terms", jsonBody({ name: cleanText(term.name, 120), slug: cleanText(term.slug, 120), taxonomy: cleanText(term.taxonomy, 120), cct_status: "publish" }));
        syncedTerms += 1;
      } catch (err: unknown) {
        errors.push(`Term ${term.name}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    return {
      ok: errors.length === 0,
      syncedTaxonomies,
      syncedTerms,
      errors,
    };
  });
