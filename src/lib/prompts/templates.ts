export interface PromptTemplate {
  id: string;
  name: string;
  category: string;
  badge: string;
  description: string;
  body: string;
}

export const PROMPT_TEMPLATES: readonly PromptTemplate[] = [
  {
    id: "pwa-full",
    name: "Kompletná PWA aplikácia",
    category: "PWA",
    badge: "Plný Stack",
    description: "Inštalovateľná offline PWA aplikácia s dashboardom a perzistentným úložiskom.",
    body: `Cieľ: Vytvor inštalovateľnú PWA aplikáciu pre <CIEĽOVÁ_SKUPINA>.
Sekcie: Dashboard s metrikami, hlavný pracovný panel so zoznamom položiek, detail s editáciou a nastavenia.
Stack: React 19 + TypeScript, Tailwind CSS, lokálna perzistencia v localStorage.
UX/UI: Tmavá Cosy paleta, WCAG AA kontrast, responzívne od 360 do 1920 px, ošetrený hover a loading skeleton.
Výkon & Offline: Okamžité načítanie, optimalizované SVG ikony bez externých CDN, plná funkčnosť offline.
Akceptačné kritériá: Žiadne chyby v konzole, dáta prežijú reload stránky.`,
  },
  {
    id: "offline-first-db",
    name: "Offline-First tracker",
    category: "Dáta",
    badge: "Offline",
    description: "Aplikácia zameraná na lokálne ukladanie dát, štatistiky a export.",
    body: `Cieľ: Offline-first tracker pre sledovanie <AKTIVITA_ALEBO_DÁTA>.
Funkcionalita: Pridávanie záznamov s validáciou, časová os, týždenné štatistiky, kategórie a export JSON zálohy.
Architektúra: React + TypeScript, optimistické UI, indikátor offline stavu a ochrana pred stratou dát.
UX: Mobilné rozhranie s tap-targetmi 44px, plynulé animácie, tmavý režim.
Akceptačné kritériá: Záznamy sa ukladajú okamžite a fungujú bez pripojenia k sieti.`,
  },
  {
    id: "cosy-portfolio-landing",
    name: "Prezentačný landing",
    category: "Marketing",
    badge: "Dizajn",
    description: "Jednostránková prezentácia štúdia alebo produktu s wow efektom.",
    body: `Cieľ: Jednostránkový landing page pre ateliér alebo digitálny produkt "<NÁZOV>".
Sekcie: Hero s úderným headline a CTA, showcase projektov s filtrami kategórií, o nás a kontaktný formulár.
Vizuál: Elegantné tmavé pozadie, jemné svetelné akcenty, mikro-interakcie a plynulý scroll.
Akceptačné kritériá: Responzívne zobrazenie bez horizontálneho scrollu na mobile, rýchly render.`,
  },
  {
    id: "booking-reservation",
    name: "Rezervačný systém",
    category: "Služby",
    badge: "Workflow",
    description: "Výber služby, interaktívny kalendár, voľné sloty a potvrdenie termínu.",
    body: `Cieľ: Rezervačný systém pre poskytovanie služieb s výberom termínu.
Kroky: 1. Výber služby a dĺžky, 2. Voľba dátumu a času v kalendári, 3. Formulár údajov klienta, 4. Potvrdenie rezervácie.
Admin: Prehľad prijatých termínov s možnosťou schválenia alebo zrušenia.
Akceptačné kritériá: Nemožno rezervovať duplicitné časy, validácia emailu a telefónu.`,
  },
  {
    id: "tool-calculator",
    name: "Interaktívny kalkulátor",
    category: "Nástroje",
    badge: "Utility",
    description: "Kalkulačný nástroj s posuvníkmi a grafickým zobrazením výsledku.",
    body: `Cieľ: Interaktívna kalkulačka s okamžitým prepočtom výsledkov.
Vstupy: Číselné polia, range posuvníky a prepínače voliteľných balíkov.
Výstupy: Okamžitý prepočet sumy, grafické porovnanie úspor a možnosť skopírovať rozpočet.
Akceptačné kritériá: Ošetrené záporné čísla a pretečenia, veľké kontrastné čísla na mobile.`,
  },
];
