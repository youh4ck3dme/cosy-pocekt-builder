import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  SMART_API_POWERUPS,
  safeFileName,
  applyPowerUp,
} from "./powerups.ts";
import { useStudioStore } from "../../stores/studio-store.ts";

describe("Smart API Power-Ups (src/lib/blueprints/powerups.ts)", () => {
  const originalStorage = globalThis.localStorage;

  beforeEach(() => {
    const store = new Map<string, string>();
    globalThis.localStorage = {
      getItem: (k) => store.get(k) ?? null,
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
      clear: () => store.clear(),
      length: 0,
      key: () => null,
    };
    useStudioStore.getState().reset();
  });

  afterEach(() => {
    if (originalStorage) {
      globalThis.localStorage = originalStorage;
    } else {
      // @ts-expect-error cleanup mock
      delete globalThis.localStorage;
    }
  });

  describe("1. SMART_API_POWERUPS definitions and structure", () => {
    it("contains exactly 3 defined integrations: weather, currency, and qr", () => {
      assert.equal(SMART_API_POWERUPS.length, 3);
      const ids = SMART_API_POWERUPS.map((p) => p.id);
      assert.deepEqual(ids, ["weather", "currency", "qr"]);
    });

    it("verifies weather power-up prompt structure and safety requirements", () => {
      const weather = SMART_API_POWERUPS.find((p) => p.id === "weather");
      assert.ok(weather);
      assert.equal(weather.title, "Počasie");
      assert.equal(weather.icon, "☁");
      assert.ok(weather.prompt.includes("OpenWeatherMap"));
      assert.ok(weather.prompt.includes("VITE_OPENWEATHERMAP_KEY"));
      assert.ok(weather.prompt.includes("loading"));
      assert.ok(weather.prompt.includes("chyby"));
      assert.ok(weather.prompt.includes("Zachovaj existujúci dizajn"));
    });

    it("verifies currency converter power-up prompt structure and requirements", () => {
      const currency = SMART_API_POWERUPS.find((p) => p.id === "currency");
      assert.ok(currency);
      assert.equal(currency.title, "Kurzy mien");
      assert.equal(currency.icon, "↔");
      assert.ok(currency.prompt.includes("ExchangeRate-API"));
      assert.ok(currency.prompt.includes("EUR/CZK"));
      assert.ok(currency.prompt.includes("https://open.er-api.com/v6/latest/EUR"));
      assert.ok(currency.prompt.includes("loading"));
      assert.ok(currency.prompt.includes("Zachovaj existujúci dizajn"));
    });

    it("verifies QR code power-up prompt structure without external CDNs", () => {
      const qr = SMART_API_POWERUPS.find((p) => p.id === "qr");
      assert.ok(qr);
      assert.equal(qr.title, "QR kód");
      assert.equal(qr.icon, "▦");
      assert.ok(qr.prompt.includes("QR kód"));
      assert.ok(qr.prompt.includes("bez externých CDN"));
      assert.ok(qr.prompt.includes("inline SVG/canvas") || qr.prompt.includes("SVG"));
      assert.ok(qr.prompt.includes("kopírovanie"));
      assert.ok(qr.prompt.toLowerCase().includes("zachovaj existujúci dizajn"));
    });
  });

  describe("2. safeFileName sanitization and formatting", () => {
    it("strips diacritics and converts to lowercase dashed slug", () => {
      const result = safeFileName("Príliš Žltý Kôň");
      assert.equal(result, "prilis-zlty-kon.html");
    });

    it("removes special characters and symbols", () => {
      const result = safeFileName("Projekt #1: Super & Cool (2026)!");
      assert.equal(result, "projekt-1-super-cool-2026.html");
    });

    it("collapses multiple whitespace characters to single dash", () => {
      const result = safeFileName("Môj    Nový     Dashboard");
      assert.equal(result, "moj-novy-dashboard.html");
    });

    it("falls back to blueprint.html for empty string or whitespace-only", () => {
      assert.equal(safeFileName(""), "blueprint.html");
      assert.equal(safeFileName("   "), "blueprint.html");
      assert.equal(safeFileName("---"), "blueprint.html");
      assert.equal(safeFileName("!@#$%^&*()"), "blueprint.html");
    });

    it("always appends .html extension", () => {
      const result = safeFileName("landing-page");
      assert.ok(result.endsWith(".html"));
      assert.equal(result, "landing-page.html");
    });
  });

  describe("3. applyPowerUp integration with studio store and navigation", () => {
    it("sets the brief in useStudioStore when power-up object is applied", () => {
      const weather = SMART_API_POWERUPS[0];
      assert.equal(useStudioStore.getState().brief, "");

      applyPowerUp(weather);

      assert.equal(useStudioStore.getState().brief, weather.prompt);
    });

    it("sets the brief when raw string prompt is provided", () => {
      const customPrompt = "Vytvor kalkulačku hypotéky";
      applyPowerUp(customPrompt);

      assert.equal(useStudioStore.getState().brief, customPrompt);
    });

    it("invokes navigation callback to /studio when provided", () => {
      let navigatedTo = "";
      const navigateMock = (opts: { to: string }) => {
        navigatedTo = opts.to;
      };

      const qr = SMART_API_POWERUPS[2];
      applyPowerUp(qr, navigateMock);

      assert.equal(navigatedTo, "/studio");
      assert.equal(useStudioStore.getState().brief, qr.prompt);
    });
  });
});
