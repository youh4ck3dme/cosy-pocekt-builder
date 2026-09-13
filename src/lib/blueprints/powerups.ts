import { useStudioStore } from "../../stores/studio-store.ts";

export type SmartApiPowerUp = {
  id: string;
  title: string;
  detail: string;
  icon: string;
  prompt: string;
};

export const SMART_API_POWERUPS: readonly SmartApiPowerUp[] = [
  {
    id: "weather",
    title: "Počasie",
    detail: "OpenWeatherMap blok s bezpečným loading a error stavom.",
    icon: "☁",
    prompt:
      "Pridaj do aplikácie kartu Aktuálne počasie pre mesto Praha. Použi OpenWeatherMap fetch s placeholderom pre VITE_OPENWEATHERMAP_KEY, bezpečne ošetri loading, chyby a chýbajúci kľúč, bez externých knižníc. Zachovaj existujúci dizajn.",
  },
  {
    id: "currency",
    title: "Kurzy mien",
    detail: "ExchangeRate-API widget s cache a fallback stavom.",
    icon: "↔",
    prompt:
      "Pridaj prevodník EUR/CZK s ExchangeRate-API. Použi fetch na https://open.er-api.com/v6/latest/EUR, zobraz loading a zrozumiteľnú chybu, validuj číselný vstup a pri výpadku ponechaj posledný výsledok. Zachovaj existujúci dizajn.",
  },
  {
    id: "qr",
    title: "QR kód",
    detail: "Samostatný QR blok pripravený na URL alebo text.",
    icon: "▦",
    prompt:
      "Pridaj do aplikácie QR kód pre zadaný text alebo URL. Vygeneruj ho bez externých CDN pomocou inline SVG/canvas algoritmu alebo bezpečného textového fallbacku, pridaj kopírovanie vstupu a zachovaj existujúci dizajn.",
  },
] as const;

/**
 * Generates a clean, URL- and filesystem-safe filename from a blueprint title.
 * Strips diacritics, special characters, replaces spaces with dashes, and falls back to "blueprint.html".
 */
export function safeFileName(title: string): string {
  const normalized = title
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return `${normalized || "blueprint"}.html`;
}

/**
 * Activates a Smart API Power-Up by seeding the studio store brief and optionally navigating to /studio.
 */
export function applyPowerUp(
  powerUp: SmartApiPowerUp | string,
  navigate?: (opts: { to: string }) => void,
): void {
  const prompt = typeof powerUp === "string" ? powerUp : powerUp.prompt;
  useStudioStore.getState().setBrief(prompt);
  if (navigate) {
    navigate({ to: "/studio" });
  }
}
