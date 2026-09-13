import assert from "node:assert/strict";
import { test, describe } from "node:test";
import {
  parseTaxonomyCsv,
  parseTermsCsv,
  generateCctCsvTemplate,
} from "./csv-importer.ts";

describe("Gruppa Import (CSV -> JetEngine CCT Importer)", () => {
  describe("parseTaxonomyCsv (B05)", () => {
    test("1. parses valid taxonomy CSV records", () => {
      const csv = `name,slug\n"Elektronika","elektronika"\n"Oblečenie","oblecenie"`;
      const res = parseTaxonomyCsv(csv);
      assert.equal(res.validRows.length, 2);
      assert.equal(res.errors.length, 0);
      assert.equal(res.validRows[0].name, "Elektronika");
      assert.equal(res.validRows[0].slug, "elektronika");
    });

    test("2. auto-generates normalized slug if slug column is omitted", () => {
      const csv = `name\n"Športové Potreby"`;
      const res = parseTaxonomyCsv(csv);
      assert.equal(res.validRows.length, 1);
      assert.equal(res.validRows[0].slug, "sportove-potreby");
    });


    test("3. flags invalid rows with empty name", () => {
      const csv = `name,slug\n"","empty"\n"Platná Kategória","platna"`;
      const res = parseTaxonomyCsv(csv);
      assert.equal(res.validRows.length, 1);
      assert.equal(res.errors.length, 1);
      assert.equal(res.errors[0].row, 2);
    });

    test("4. returns error if name header column is missing", () => {
      const csv = `title,url\n"Test","test"`;
      const res = parseTaxonomyCsv(csv);
      assert.equal(res.validRows.length, 0);
      assert.ok(res.errors[0].message.includes("name"));
    });
  });

  describe("parseTermsCsv (B06)", () => {
    test("5. parses valid terms CSV with taxonomy relation link", () => {
      const csv = `taxonomy,name,slug\n"Knihy","Sci-Fi","sci-fi"\n"Knihy","Detektívky","detektivky"`;
      const res = parseTermsCsv(csv);
      assert.equal(res.validRows.length, 2);
      assert.equal(res.validRows[0].taxonomy, "Knihy");
      assert.equal(res.validRows[0].name, "Sci-Fi");
    });

    test("6. returns error when taxonomy header is missing", () => {
      const csv = `name,slug\n"Item 1","item-1"`;
      const res = parseTermsCsv(csv);
      assert.equal(res.validRows.length, 0);
      assert.ok(res.errors[0].message.includes("taxonomy"));
    });
  });

  describe("generateCctCsvTemplate", () => {
    test("7. produces valid CSV template headers for taxonomy and terms", () => {
      const taxTemplate = generateCctCsvTemplate("taxonomy");
      assert.ok(taxTemplate.startsWith("name,slug"));

      const termsTemplate = generateCctCsvTemplate("terms");
      assert.ok(termsTemplate.startsWith("taxonomy,name,slug"));
    });
  });
});
