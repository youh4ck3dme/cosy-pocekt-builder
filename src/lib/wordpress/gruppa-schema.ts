import type { GruppaTaxonomyCct, GruppaTermCct } from "@/types/wordpress";

/**
 * Source of Truth schema mapping derived from:
 * - B05_taxonomy.json (Custom Content Type ID: 13, slug: "taxonomy")
 * - B06_terms.json (Custom Content Type ID: 14, slug: "terms")
 */

export const GRUPPA_TAXONOMY_SCHEMA = {
  id: "13",
  cctSlug: "taxonomy",
  name: "Taxonómia",
  adminColumns: ["_ID", "name", "slug"],
  fields: {
    gruppa_cms: {
      type: "html",
      name: "gruppa_cms",
      title: "Taxonómia | Taxonomy CCT",
      required: false,
    },
    name: {
      type: "text",
      name: "name",
      title: "Názov taxonómie",
      required: true,
    },
    slug: {
      type: "text",
      name: "slug",
      title: "Slug adresa",
      required: true,
    },
  },
} as const;

export const GRUPPA_TERMS_SCHEMA = {
  id: "14",
  cctSlug: "terms",
  name: "Položky",
  adminColumns: ["_ID", "taxonomy", "name", "slug"],
  fields: {
    gruppa_cms: {
      type: "html",
      name: "gruppa_cms",
      title: "Položky | Terms CCT",
      required: false,
    },
    taxonomy: {
      type: "select",
      name: "taxonomy",
      title: "Taxonómia",
      optionsSource: "query",
      queryId: "31",
      queryValueField: "name",
      queryLabelField: "name",
      required: true,
    },
    name: {
      type: "text",
      name: "name",
      title: "Názov položky",
      required: true,
    },
    slug: {
      type: "text",
      name: "slug",
      title: "Slug adresa",
      required: true,
    },
  },
} as const;

export const JETENGINE_CCT_VERSION = "1.2.2";
export const JETENGINE_QUERY_VERSION = "1.1";

/**
 * JetEngine Query Builder ID: 31 ("taxonomy_query")
 * Connects CCT "terms" (14) field "taxonomy" to CCT "taxonomy" (13)
 */
export const GRUPPA_QUERY_31 = {
  id: "31",
  name: "taxonomy_query",
  queryType: "custom-content-type",
  contentType: "taxonomy",
  orderby: "_ID",
  order: "ASC",
  status: "publish",
} as const;

/**
 * Returns JetEngine CCT JSON Export payload (version 1.2.2) for Taxonomy (ID 13)
 */
export function exportGruppaTaxonomyCctJson() {
  return {
    version: JETENGINE_CCT_VERSION,
    status: JETENGINE_CCT_VERSION,
    id: GRUPPA_TAXONOMY_SCHEMA.id,
    slug: GRUPPA_TAXONOMY_SCHEMA.cctSlug,
    args: {
      name: GRUPPA_TAXONOMY_SCHEMA.name,
      slug: GRUPPA_TAXONOMY_SCHEMA.cctSlug,
      admin_columns: GRUPPA_TAXONOMY_SCHEMA.adminColumns,
    },
    meta_fields: [
      {
        title: GRUPPA_TAXONOMY_SCHEMA.fields.gruppa_cms.title,
        name: GRUPPA_TAXONOMY_SCHEMA.fields.gruppa_cms.name,
        type: GRUPPA_TAXONOMY_SCHEMA.fields.gruppa_cms.type,
      },
      {
        title: GRUPPA_TAXONOMY_SCHEMA.fields.name.title,
        name: GRUPPA_TAXONOMY_SCHEMA.fields.name.name,
        type: GRUPPA_TAXONOMY_SCHEMA.fields.name.type,
        is_required: GRUPPA_TAXONOMY_SCHEMA.fields.name.required,
      },
      {
        title: GRUPPA_TAXONOMY_SCHEMA.fields.slug.title,
        name: GRUPPA_TAXONOMY_SCHEMA.fields.slug.name,
        type: GRUPPA_TAXONOMY_SCHEMA.fields.slug.type,
        is_required: GRUPPA_TAXONOMY_SCHEMA.fields.slug.required,
      },
    ],
  };
}

/**
 * Returns JetEngine CCT JSON Export payload (version 1.2.2) for Terms (ID 14)
 */
export function exportGruppaTermsCctJson() {
  return {
    version: JETENGINE_CCT_VERSION,
    status: JETENGINE_CCT_VERSION,
    id: GRUPPA_TERMS_SCHEMA.id,
    slug: GRUPPA_TERMS_SCHEMA.cctSlug,
    args: {
      name: GRUPPA_TERMS_SCHEMA.name,
      slug: GRUPPA_TERMS_SCHEMA.cctSlug,
      admin_columns: GRUPPA_TERMS_SCHEMA.adminColumns,
    },
    meta_fields: [
      {
        title: GRUPPA_TERMS_SCHEMA.fields.gruppa_cms.title,
        name: GRUPPA_TERMS_SCHEMA.fields.gruppa_cms.name,
        type: GRUPPA_TERMS_SCHEMA.fields.gruppa_cms.type,
      },
      {
        title: GRUPPA_TERMS_SCHEMA.fields.taxonomy.title,
        name: GRUPPA_TERMS_SCHEMA.fields.taxonomy.name,
        type: GRUPPA_TERMS_SCHEMA.fields.taxonomy.type,
        options_source: GRUPPA_TERMS_SCHEMA.fields.taxonomy.optionsSource,
        query_id: GRUPPA_TERMS_SCHEMA.fields.taxonomy.queryId,
        query_val_field: GRUPPA_TERMS_SCHEMA.fields.taxonomy.queryValueField,
        query_label_field: GRUPPA_TERMS_SCHEMA.fields.taxonomy.queryLabelField,
        is_required: GRUPPA_TERMS_SCHEMA.fields.taxonomy.required,
      },
      {
        title: GRUPPA_TERMS_SCHEMA.fields.name.title,
        name: GRUPPA_TERMS_SCHEMA.fields.name.name,
        type: GRUPPA_TERMS_SCHEMA.fields.name.type,
        is_required: GRUPPA_TERMS_SCHEMA.fields.name.required,
      },
      {
        title: GRUPPA_TERMS_SCHEMA.fields.slug.title,
        name: GRUPPA_TERMS_SCHEMA.fields.slug.name,
        type: GRUPPA_TERMS_SCHEMA.fields.slug.type,
        is_required: GRUPPA_TERMS_SCHEMA.fields.slug.required,
      },
    ],
  };
}

/**
 * Returns JetEngine Query Builder JSON Export payload (version 1.1) for Query ID 31
 */
export function exportGruppaQuery31Json() {
  return {
    version: JETENGINE_QUERY_VERSION,
    id: GRUPPA_QUERY_31.id,
    name: GRUPPA_QUERY_31.name,
    query_type: GRUPPA_QUERY_31.queryType,
    "custom-content-type": {
      content_type: GRUPPA_QUERY_31.contentType,
    },
    orderby: GRUPPA_QUERY_31.orderby,
    order: GRUPPA_QUERY_31.order,
    status: GRUPPA_QUERY_31.status,
  };
}

/**
 * Options Page ID: 8 ("sitedata" / "Dáta Webu")
 */
export const GRUPPA_SITEDATA_SCHEMA = {
  id: "8",
  slug: "sitedata",
  name: "Dáta Webu",
  storageType: "separate",
  tabs: ["data", "map", "brand", "licencia"],
} as const;

/**
 * Sorts Gruppa items (Content, Taxonomy, Terms) by _ID in ASC or DESC order.
 */
export function sortGruppaItemsById<T extends { _ID?: number }>(
  items: T[],
  direction: "ASC" | "DESC" = "ASC",
): T[] {
  return [...items].sort((a, b) => {
    const idA = a._ID ?? 0;
    const idB = b._ID ?? 0;
    return direction === "ASC" ? idA - idB : idB - idA;
  });
}

/**
 * Sanitizes and normalizes a string into a clean web slug (strips Slovak diacritics, special chars).
 */
export function normalizeSlug(str: string): string {
  return str
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

/**
 * Validates a Taxonomy CCT payload against B05_taxonomy.json source of truth.
 */
export function validateTaxonomyPayload(data: Partial<GruppaTaxonomyCct>): {
  valid: boolean;
  errors: string[];
  data?: GruppaTaxonomyCct;
} {
  const errors: string[] = [];

  if (!data.name || typeof data.name !== "string" || !data.name.trim()) {
    errors.push("Pole 'Názov taxonómie' (name) je povinné.");
  }

  if (!data.slug || typeof data.slug !== "string" || !data.slug.trim()) {
    errors.push("Pole 'Slug adresa' (slug) je povinné.");
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: [],
    data: {
      _ID: data._ID,
      name: data.name!.trim(),
      slug: normalizeSlug(data.slug!),
      cct_status: data.cct_status || "publish",
    },
  };
}

/**
 * Validates a Term CCT payload against B06_terms.json source of truth.
 */
export function validateTermPayload(data: Partial<GruppaTermCct>): {
  valid: boolean;
  errors: string[];
  data?: GruppaTermCct;
} {
  const errors: string[] = [];

  if (!data.taxonomy || typeof data.taxonomy !== "string" || !data.taxonomy.trim()) {
    errors.push("Pole 'Taxonómia' (taxonomy) je povinné.");
  }

  if (!data.name || typeof data.name !== "string" || !data.name.trim()) {
    errors.push("Pole 'Názov položky' (name) je povinné.");
  }

  if (!data.slug || typeof data.slug !== "string" || !data.slug.trim()) {
    errors.push("Pole 'Slug adresa' (slug) je povinné.");
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: [],
    data: {
      _ID: data._ID,
      taxonomy: data.taxonomy!.trim(),
      name: data.name!.trim(),
      slug: normalizeSlug(data.slug!),
      cct_status: data.cct_status || "publish",
    },
  };
}

/**
 * Groups an array of term items by their parent taxonomy name.
 */
export function groupTermsByTaxonomy(terms: GruppaTermCct[]): Record<string, GruppaTermCct[]> {
  const map: Record<string, GruppaTermCct[]> = {};

  for (const term of terms) {
    const key = term.taxonomy || "Nezaradené";
    if (!map[key]) {
      map[key] = [];
    }
    map[key].push(term);
  }

  return map;
}

export const GRUPPA_DEFAULT_TAXONOMIES = [
  { name: "Kategórie", slug: "kategorie" },
  { name: "Lokality", slug: "lokality" },
  { name: "Typy", slug: "typy" },
  { name: "Značky", slug: "znacky" },
];

export const GRUPPA_DEFAULT_TERMS = [
  { name: "Praha 1 - Staré Město", slug: "praha-1-stare-mesto", taxonomy: "Lokality" },
  { name: "Praha 2 - Vinohrady", slug: "praha-2-vinohrady", taxonomy: "Lokality" },
  { name: "Apartmány", slug: "apartmany", taxonomy: "Typy" },
  { name: "Hotely", slug: "hotely", taxonomy: "Typy" },
  { name: "Wellness & Spa", slug: "wellness-spa", taxonomy: "Kategórie" },
  { name: "Last Minute", slug: "last-minute", taxonomy: "Kategórie" },
];
