import type { GruppaTaxonomyCct, GruppaTermCct } from "@/types/wordpress";
import { validateTaxonomyPayload, validateTermPayload } from "./gruppa-schema.ts";

export interface CctCsvParseResult<T> {
  validRows: T[];
  errors: { row: number; message: string }[];
  totalRows: number;
}

/**
 * Parses CSV text content for Taxonomy CCT (B05_taxonomy.json: name, slug)
 */
export function parseTaxonomyCsv(csvText: string): CctCsvParseResult<GruppaTaxonomyCct> {
  const lines = parseCsvLines(csvText);
  if (lines.length < 2) {
    return { validRows: [], errors: [{ row: 0, message: "CSV súbor je prázdny alebo nemá hlavičku." }], totalRows: 0 };
  }

  const header = lines[0].map((h) => h.toLowerCase().trim());
  const nameIdx = header.indexOf("name");
  const slugIdx = header.indexOf("slug");

  if (nameIdx === -1) {
    return { validRows: [], errors: [{ row: 1, message: "Chýba povinný stĺpec 'name' v hlavičke CSV." }], totalRows: lines.length - 1 };
  }

  const validRows: GruppaTaxonomyCct[] = [];
  const errors: { row: number; message: string }[] = [];

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i];
    if (row.length === 0 || (row.length === 1 && !row[0].trim())) continue;

    const name = row[nameIdx] || "";
    const slug = slugIdx !== -1 ? row[slugIdx] || name : name;

    const validation = validateTaxonomyPayload({ name, slug });
    if (validation.valid && validation.data) {
      validRows.push(validation.data);
    } else {
      errors.push({ row: i + 1, message: validation.errors.join(", ") });
    }
  }

  return { validRows, errors, totalRows: lines.length - 1 };
}

/**
 * Parses CSV text content for Terms CCT (B06_terms.json: taxonomy, name, slug)
 */
export function parseTermsCsv(csvText: string): CctCsvParseResult<GruppaTermCct> {
  const lines = parseCsvLines(csvText);
  if (lines.length < 2) {
    return { validRows: [], errors: [{ row: 0, message: "CSV súbor je prázdny alebo nemá hlavičku." }], totalRows: 0 };
  }

  const header = lines[0].map((h) => h.toLowerCase().trim());
  const taxIdx = header.indexOf("taxonomy");
  const nameIdx = header.indexOf("name");
  const slugIdx = header.indexOf("slug");

  if (taxIdx === -1 || nameIdx === -1) {
    return {
      validRows: [],
      errors: [{ row: 1, message: "Chýbajú povinné stĺpce ('taxonomy', 'name') v hlavičke CSV." }],
      totalRows: lines.length - 1,
    };
  }

  const validRows: GruppaTermCct[] = [];
  const errors: { row: number; message: string }[] = [];

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i];
    if (row.length === 0 || (row.length === 1 && !row[0].trim())) continue;

    const taxonomy = row[taxIdx] || "";
    const name = row[nameIdx] || "";
    const slug = slugIdx !== -1 ? row[slugIdx] || name : name;

    const validation = validateTermPayload({ taxonomy, name, slug });
    if (validation.valid && validation.data) {
      validRows.push(validation.data);
    } else {
      errors.push({ row: i + 1, message: validation.errors.join(", ") });
    }
  }

  return { validRows, errors, totalRows: lines.length - 1 };
}

/**
 * Generates sample CSV templates for Gruppa CCTs.
 */
export function generateCctCsvTemplate(cctType: "taxonomy" | "terms"): string {
  if (cctType === "taxonomy") {
    return `name,slug\n"Kategórie Produktov","kategorie-produktov"\n"Služby","sluzby"`;
  }
  return `taxonomy,name,slug\n"Kategórie Produktov","Smartfóny","smartfony"\n"Kategórie Produktov","Laptopy","laptopy"`;
}

/**
 * Simple CSV parser handling quotes and comma separators.
 */
function parseCsvLines(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentVal = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentVal += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      currentRow.push(currentVal.trim());
      currentVal = "";
    } else if ((char === "\r" || char === "\n") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") i++;
      currentRow.push(currentVal.trim());
      if (currentRow.some((val) => val.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentVal = "";
    } else {
      currentVal += char;
    }
  }

  if (currentVal.length > 0 || currentRow.length > 0) {
    currentRow.push(currentVal.trim());
    if (currentRow.some((val) => val.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}
