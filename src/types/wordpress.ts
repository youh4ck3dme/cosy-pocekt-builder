/**
 * Gruppa CMS Taxonomy CCT (B05_taxonomy.json) - Source of Truth
 */
export interface GruppaTaxonomyCct {
  _ID?: number;
  name: string; // Názov taxonómie (required)
  slug: string; // Slug adresa (required)
  cct_status?: string;
  cct_created?: string;
  cct_modified?: string;
}

/**
 * Gruppa CMS Terms CCT (B06_terms.json) - Source of Truth
 */
export interface GruppaTermCct {
  _ID?: number;
  taxonomy: string; // Relácia / Odkaz na Názov taxonómie (query_id: 31, required)
  name: string; // Názov položky (required)
  slug: string; // Slug adresa (required)
  cct_status?: string;
  cct_created?: string;
  cct_modified?: string;
}

/**
 * Gruppa CMS Options Page: sitedata ("Dáta Webu" - ID: 8) - Source of Truth
 */
export interface GruppaSiteDataOptionsPage {
  // TAB: DÁTA
  site_title?: string;
  site_owner?: string;
  company_title?: string;
  company_address?: string;
  company_id?: string;
  company_vat?: string;
  company_tax?: string;
  region?: string;
  country?: string;
  connections?: Array<{ name: string; link: string }>;

  // TAB: MAPA
  home?: string;
  account?: string;
  admin?: string;
  logout?: string;

  // TAB: BRAND
  favico?: number;
  pictogram?: number;
  logotype?: number;

  // TAB: LICENCIA
  license_type?: string;
  license_number?: string;
  copy_notice?: string;
  developer_title?: string;
  developer_support?: string;
}

/**
 * Gruppa CMS Taxonomy Query (Query ID: 31 / "taxonomy_query")
 */
export interface GruppaTaxonomyQuery {
  id: "31";
  name: "taxonomy_query";
  queryType: "custom-content-type";
  contentType: "taxonomy";
  orderby: "_ID";
  order: "ASC";
  status: "publish";
}

export interface GruppaSyncResult {
  ok: boolean;
  syncedTaxonomies: number;
  syncedTerms: number;
  errors: string[];
}
