export type PromptPreset = {
  id: string;
  label: string;
  hint: string;
  template: string;
};

export const PROMPT_PRESETS: PromptPreset[] = [
  {
    id: "landing",
    label: "/landing",
    hint: "SaaS landing page",
    template:
      "Build a modern SaaS landing page for {{product}}. Sections: hero with bold headline + subhead + CTA, 3-feature grid with icons, social proof logos row, pricing table (3 tiers), FAQ accordion, footer. Style: {{style|minimal dark with amber accents}}. Mobile-first, smooth scroll, subtle animations.",
  },
  {
    id: "dashboard",
    label: "/dashboard",
    hint: "Analytics dashboard",
    template:
      "Build an analytics dashboard for {{domain}}. Top bar with logo + user menu. Sidebar with 5 nav items. Main area: 4 KPI cards with sparklines, a large chart, a recent activity list. Dark theme, glass cards, tabular numbers.",
  },
  {
    id: "pricing",
    label: "/pricing",
    hint: "Pricing page",
    template:
      "Build a pricing page for {{product}}. 3 tiers ({{tiers|Starter, Pro, Enterprise}}), monthly/yearly toggle, feature comparison table below, FAQ section. Highlight the middle tier. Clean typography.",
  },
  {
    id: "portfolio",
    label: "/portfolio",
    hint: "Designer portfolio",
    template:
      "Build a portfolio site for {{name}}, a {{role|designer}}. Hero with name + tagline, project grid (6 cards with hover effects), about section, contact form. Bold serif headings, generous whitespace.",
  },
  {
    id: "email",
    label: "/email",
    hint: "Transactional email",
    template:
      "Build a transactional HTML email for {{purpose}}. Single-column 600px, header with logo, body with greeting + main message + CTA button, footer with unsubscribe. Email-client compatible (inline styles, table layout).",
  },
  {
    id: "form",
    label: "/form",
    hint: "Multi-step form",
    template:
      "Build a multi-step form for {{purpose}}. 3 steps with progress indicator, smooth transitions, inline validation, summary screen before submit. Mobile-friendly inputs.",
  },
  {
    id: "logo",
    label: "/svg-logo",
    hint: "SVG logo lockup",
    template:
      "Build an HTML page that showcases an SVG logo for {{brand}}. Center a clean monogram + wordmark SVG. Include a small color/usage palette below.",
  },
  {
    id: "pwa-app",
    label: "/pwa-app",
    hint: "Installable PWA app shell",
    template:
      "Build an installable PWA-style single-page app for {{purpose}}. Full-viewport (100dvh) mobile-first app shell with a top app bar, a scrollable content area, and a bottom tab bar (3–4 tabs). Include a complete <head>: responsive viewport, <title>, meta description, theme-color, and OpenGraph tags (og:title, og:description, og:type, og:image). Safe-area insets, large 44px touch targets, dark theme with {{accent|amber}} accents. All CSS inline, no external resources.",
  },
  {
    id: "wp-card",
    label: "/wp-card",
    hint: "Embeddable WordPress content block",
    template:
      "Build a single self-contained content card/block for {{topic}}, designed to be embedded inside a WordPress page via the Pocket Builder blank-canvas shortcode. One focused section: heading, supporting copy, an image placeholder with alt text, and a CTA button. Fluid width so it adapts to any container; inline styles only. Accessible: one logical heading, a labelled button, alt text present.",
  },
  {
    id: "lead-gen",
    label: "/lead-gen",
    hint: "Lead-generation landing",
    template:
      "Build a high-conversion lead-generation landing page for {{offer}}. Above-the-fold hero with a sharp value proposition, a short lead form (name + email + one qualifying field) with inline validation, trust signals (logos or testimonials), a benefits list, and a final CTA. Complete SEO/social <head>: title, meta description, OpenGraph + Twitter card tags, responsive viewport. Mobile-first, single <h1>, all images have alt text, CSS inline.",
  },
];

export function findPreset(slash: string): PromptPreset | null {
  const q = slash.trim().toLowerCase();
  return PROMPT_PRESETS.find((p) => p.label === q || p.label.slice(1) === q) ?? null;
}

export function filterPresets(query: string): PromptPreset[] {
  const q = query.trim().toLowerCase().replace(/^\//, "");
  if (!q) return PROMPT_PRESETS;
  return PROMPT_PRESETS.filter(
    (p) => p.label.includes(q) || p.hint.toLowerCase().includes(q),
  );
}