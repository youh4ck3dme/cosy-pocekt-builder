import assert from "node:assert/strict";
import { test, describe } from "node:test";
import {
  GRUPPA_TAXONOMY_SCHEMA,
  GRUPPA_TERMS_SCHEMA,
  GRUPPA_QUERY_31,
  GRUPPA_SITEDATA_SCHEMA,
  validateTaxonomyPayload,
  validateTermPayload,
  groupTermsByTaxonomy,
  sortGruppaItemsById,
  exportGruppaTaxonomyCctJson,
  exportGruppaTermsCctJson,
  exportGruppaQuery31Json,
  JETENGINE_CCT_VERSION,
  JETENGINE_QUERY_VERSION,
  normalizeSlug,
} from "./gruppa-schema.ts";


describe("Gruppa CMS Taxonomy & Terms Schema Mapping (B05 & B06 Source of Truth)", () => {
  describe("normalizeSlug helper", () => {
    test("removes Slovak diacritics and converts to clean web slug", () => {
      assert.equal(normalizeSlug("Kategórie Produktov & Služieb"), "kategorie-produktov-sluzieb");
      assert.equal(normalizeSlug("  Žlté Ľalie a Čerešne  "), "zlte-lalie-a-ceresne");
    });
  });
  describe("Schema Definitions", () => {
    test("1. GRUPPA_TAXONOMY_SCHEMA matches B05_taxonomy.json CCT ID 13 and slug 'taxonomy'", () => {
      assert.equal(GRUPPA_TAXONOMY_SCHEMA.id, "13");
      assert.equal(GRUPPA_TAXONOMY_SCHEMA.cctSlug, "taxonomy");
      assert.equal(GRUPPA_TAXONOMY_SCHEMA.fields.name.title, "Názov taxonómie");
      assert.equal(GRUPPA_TAXONOMY_SCHEMA.fields.slug.title, "Slug adresa");
    });

    test("2. GRUPPA_TERMS_SCHEMA matches B06_terms.json CCT ID 14 and slug 'terms'", () => {
      assert.equal(GRUPPA_TERMS_SCHEMA.id, "14");
      assert.equal(GRUPPA_TERMS_SCHEMA.cctSlug, "terms");
      assert.equal(GRUPPA_TERMS_SCHEMA.fields.taxonomy.title, "Taxonómia");
      assert.equal(GRUPPA_TERMS_SCHEMA.fields.taxonomy.queryId, "31");
      assert.equal(GRUPPA_TERMS_SCHEMA.fields.name.title, "Názov položky");
      assert.equal(GRUPPA_TERMS_SCHEMA.fields.slug.title, "Slug adresa");
    });

    test("3. GRUPPA_QUERY_31 matches Query ID 31 taxonomy_query custom-content-type configuration", () => {
      assert.equal(GRUPPA_QUERY_31.id, "31");
      assert.equal(GRUPPA_QUERY_31.name, "taxonomy_query");
      assert.equal(GRUPPA_QUERY_31.contentType, "taxonomy");
      assert.equal(GRUPPA_QUERY_31.orderby, "_ID");
    });

    test("4. GRUPPA_SITEDATA_SCHEMA matches Options Page ID 8 sitedata ('Dáta Webu')", () => {
      assert.equal(GRUPPA_SITEDATA_SCHEMA.id, "8");
      assert.equal(GRUPPA_SITEDATA_SCHEMA.slug, "sitedata");
      assert.equal(GRUPPA_SITEDATA_SCHEMA.name, "Dáta Webu");
      assert.equal(GRUPPA_SITEDATA_SCHEMA.storageType, "separate");
    });

    test("4b. exportGruppaTaxonomyCctJson exports valid JetEngine CCT v1.2.2 JSON", () => {
      const exported = exportGruppaTaxonomyCctJson();
      assert.equal(exported.version, "1.2.2");
      assert.equal(exported.status, JETENGINE_CCT_VERSION);
      assert.equal(exported.id, "13");
      assert.equal(exported.slug, "taxonomy");
      assert.equal(exported.meta_fields.length, 3);
    });

    test("4c. exportGruppaTermsCctJson exports valid JetEngine CCT v1.2.2 JSON", () => {
      const exported = exportGruppaTermsCctJson();
      assert.equal(exported.version, "1.2.2");
      assert.equal(exported.status, JETENGINE_CCT_VERSION);
      assert.equal(exported.id, "14");
      assert.equal(exported.slug, "terms");
      assert.equal(exported.meta_fields[1].query_id, "31");
    });

    test("4d. exportGruppaQuery31Json exports valid JetEngine Query Builder v1.1 JSON", () => {
      const exported = exportGruppaQuery31Json();
      assert.equal(exported.version, JETENGINE_QUERY_VERSION);
      assert.equal(exported.id, "31");
      assert.equal(exported.name, "taxonomy_query");
      assert.equal(exported.query_type, "custom-content-type");
      assert.equal(exported["custom-content-type"].content_type, "taxonomy");
    });
  });


  describe("Taxonomy Payload Validation (B05)", () => {
    test("3. rejects payload with missing or empty name", () => {
      const res = validateTaxonomyPayload({ name: "", slug: "kategoria" });
      assert.equal(res.valid, false);
      assert.ok(res.errors.some((e) => e.includes("Názov taxonómie")));
    });

    test("4. rejects payload with missing or empty slug", () => {
      const res = validateTaxonomyPayload({ name: "Kategória", slug: "   " });
      assert.equal(res.valid, false);
      assert.ok(res.errors.some((e) => e.includes("Slug adresa")));
    });

    test("5. validates valid payload and normalizes slug format", () => {
      const res = validateTaxonomyPayload({
        name: "Produktové Kategórie ",
        slug: "Produktove Kategoriie ",
      });
      assert.equal(res.valid, true);
      assert.equal(res.data?.name, "Produktové Kategórie");
      assert.equal(res.data?.slug, "produktove-kategoriie");
    });
  });

  describe("Terms Payload Validation (B06)", () => {
    test("6. rejects payload with missing taxonomy selection", () => {
      const res = validateTermPayload({ taxonomy: "", name: "Položka 1", slug: "polozka-1" });
      assert.equal(res.valid, false);
      assert.ok(res.errors.some((e) => e.includes("Taxonómia")));
    });

    test("7. rejects payload with missing term name", () => {
      const res = validateTermPayload({ taxonomy: "Kategória", name: "", slug: "polozka-1" });
      assert.equal(res.valid, false);
      assert.ok(res.errors.some((e) => e.includes("Názov položky")));
    });

    test("8. rejects payload with missing term slug", () => {
      const res = validateTermPayload({ taxonomy: "Kategória", name: "Položka", slug: "" });
      assert.equal(res.valid, false);
      assert.ok(res.errors.some((e) => e.includes("Slug adresa")));
    });

    test("9. validates valid term payload with taxonomy relation link", () => {
      const res = validateTermPayload({
        taxonomy: "Elektronika",
        name: "Smartfóny ",
        slug: "Smartfony  ",
      });
      assert.equal(res.valid, true);
      assert.equal(res.data?.taxonomy, "Elektronika");
      assert.equal(res.data?.name, "Smartfóny");
      assert.equal(res.data?.slug, "smartfony");
    });
  });

  describe("groupTermsByTaxonomy", () => {
    test("10. groups terms correctly under their parent taxonomy key", () => {
      const terms = [
        { taxonomy: "Knihy", name: "Sci-Fi", slug: "sci-fi" },
        { taxonomy: "Knihy", name: "Fantasy", slug: "fantasy" },
        { taxonomy: "Filmy", name: "Akčné", slug: "akcne" },
      ];

      const grouped = groupTermsByTaxonomy(terms);
      assert.equal(Object.keys(grouped).length, 2);
      assert.equal(grouped["Knihy"].length, 2);
      assert.equal(grouped["Filmy"].length, 1);
      assert.equal(grouped["Knihy"][0].name, "Sci-Fi");
    });
  });

  describe("sortGruppaItemsById", () => {
    test("11. sorts content/taxonomy/terms by _ID in ASC order", () => {
      const items = [{ _ID: 10 }, { _ID: 2 }, { _ID: 55 }];
      const sorted = sortGruppaItemsById(items, "ASC");
      assert.deepEqual(
        sorted.map((i) => i._ID),
        [2, 10, 55]
      );
    });

    test("12. sorts content/taxonomy/terms by _ID in DESC order", () => {
      const items = [{ _ID: 10 }, { _ID: 2 }, { _ID: 55 }];
      const sorted = sortGruppaItemsById(items, "DESC");
      assert.deepEqual(
        sorted.map((i) => i._ID),
        [55, 10, 2]
      );
    });
  });
});
