export interface CompetitorUxFlaw {
  category: "typography" | "cta" | "layout" | "performance" | "trust";
  issue: string;
  recommendation: string;
}

export interface CompetitorStructure {
  title: string;
  metaDescription?: string;
  headings: string[];
  ctaButtons: string[];
  sectionsCount: number;
  detectedFeatures: string[];
  hasForm: boolean;
  hasTestimonials: boolean;
  hasPricing: boolean;
}

export interface CompetitorAnalysis {
  url: string;
  structure: CompetitorStructure;
  uxFlaws: CompetitorUxFlaw[];
  optimizedPrompt: string;
}

/**
 * AI Competitor Cloner & Optimizer Engine
 * Analyzes competitor HTML structure, identifies UX bottlenecks,
 * and generates an optimized prompt for Cosy Pocket Builder.
 */

export function analyzeCompetitorHtml(url: string, html: string): CompetitorAnalysis {
  const structure = extractStructureFromHtml(html);
  const uxFlaws = detectUxFlaws(html, structure);

  return {
    url,
    structure,
    uxFlaws,
    optimizedPrompt: "", // Will be populated by generateOptimizedPrompt
  };
}

export function generateOptimizedPrompt(
  analysis: CompetitorAnalysis,
  userCompany: { name: string; industry?: string; targetAudience?: string }
): string {
  const { structure, uxFlaws } = analysis;
  const industryStr = userCompany.industry ? ` v odvetví ${userCompany.industry}` : "";
  const audienceStr = userCompany.targetAudience ? ` pre cieľovú skupinu: ${userCompany.targetAudience}` : "";

  let prompt = `Vytvor novú, ultrarýchlu a modernú landing page pre firmu "${userCompany.name}"${industryStr}${audienceStr}.\n\n`;
  prompt += `STRÁNKA JE VYLEPŠENOU VERZIOU KONKURENCIE (${analysis.url}):\n`;
  prompt += `- Pôvodný titulok: "${structure.title}"\n`;

  if (structure.headings.length > 0) {
    prompt += `- Hlavné sekcie konkurencie: ${structure.headings.slice(0, 5).join(", ")}\n`;
  }

  prompt += `\n🎯 ODHALENÉ UX CHYBY KONKURENCIE A NÁVRHY NA VYLEPŠENIE:\n`;
  for (const flaw of uxFlaws) {
    prompt += `- [${flaw.category.toUpperCase()}] Chyba: ${flaw.issue} -> Oprava: ${flaw.recommendation}\n`;
  }

  prompt += `\n✨ POŽADOVANÉ VYLEPŠENIA V COSY POCKET BUILDER:\n`;
  prompt += `1. Moderný, špičkový dark-mode dizajn s plynulými mikro-animáciami.\n`;
  prompt += `2. Silný, konverzný Hero nadpis a jasné Call-To-Action tlačidlo.\n`;
  prompt += `3. Sekcia výhod, referencií a prehľadný cenník/kontaktný formulár.\n`;
  prompt += `4. Priama integrácia pre WordPress REST API backend.\n`;

  return prompt.trim();
}

function extractStructureFromHtml(html: string): CompetitorStructure {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? cleanText(titleMatch[1]) : "Konkurenčný web";

  const metaDescMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([\s\S]*?)["']/i);
  const metaDescription = metaDescMatch ? cleanText(metaDescMatch[1]) : undefined;

  const headings: string[] = [];
  const headingRegex = /<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi;
  let match: RegExpExecArray | null;
  while ((match = headingRegex.exec(html)) !== null) {
    const text = cleanText(match[1]);
    if (text && text.length > 3) {
      headings.push(text);
    }
  }

  const ctaButtons: string[] = [];
  const btnRegex = /<(?:button|a)[^>]*class=["'][^"']*(?:btn|button|cta)[^"']*["'][^>]*>([\s\S]*?)<\/(?:button|a)>/gi;
  while ((match = btnRegex.exec(html)) !== null) {
    const text = cleanText(match[1]);
    if (text && text.length > 2) {
      ctaButtons.push(text);
    }
  }

  const hasForm = /<form\b/i.test(html);
  const hasTestimonials = /testimonial|referenci|hodnoteni|review/i.test(html);
  const hasPricing = /cennik|pricing|price|cena/i.test(html);

  return {
    title,
    metaDescription,
    headings,
    ctaButtons,
    sectionsCount: headings.length,
    detectedFeatures: [
      hasForm ? "Kontaktný formulár" : "",
      hasTestimonials ? "Referencie" : "",
      hasPricing ? "Cenník" : "",
    ].filter(Boolean),
    hasForm,
    hasTestimonials,
    hasPricing,
  };
}

function detectUxFlaws(html: string, structure: CompetitorStructure): CompetitorUxFlaw[] {
  const flaws: CompetitorUxFlaw[] = [];

  // Check CTA presence
  if (structure.ctaButtons.length === 0) {
    flaws.push({
      category: "cta",
      issue: "Chýbajúce výrazné Call-To-Action tlačidlá v hlavnom viditeľnom poli (Above the fold).",
      recommendation: "Pridať dominantné akčné tlačidlo s kontrastnou farbou.",
    });
  }

  // Check form presence
  if (!structure.hasForm) {
    flaws.push({
      category: "trust",
      issue: "Absencia priameho kontaktného/dopytového formulára.",
      recommendation: "Vložiť dynamický kontaktný formulár napojený na databázu.",
    });
  }

  // Check viewport meta for mobile responsiveness
  if (!html.includes('name="viewport"') && !html.includes("viewport")) {
    flaws.push({
      category: "layout",
      issue: "Chýbajúci viewport meta tag pre mobilné zariadenia.",
      recommendation: "Použiť 100% responzívny mobilný layout.",
    });
  }

  // Check testimonials/social proof
  if (!structure.hasTestimonials) {
    flaws.push({
      category: "trust",
      issue: "Chýbajúce referencie zákazníkov a spoločné dôkazy dôvery (Social proof).",
      recommendation: "Pridať sekciu referencií s logami a hodnoceniami.",
    });
  }

  return flaws;
}

function cleanText(str: string): string {
  return str.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}
