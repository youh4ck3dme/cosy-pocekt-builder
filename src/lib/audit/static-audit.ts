export type AuditSeverity = "pass" | "warning" | "fail";

export type AuditFinding = {
  id: string;
  label: string;
  severity: AuditSeverity;
  detail: string;
};

export type StaticAuditReport = {
  score: number;
  status: AuditSeverity;
  findings: AuditFinding[];
};

function finding(id: string, label: string, severity: AuditSeverity, detail: string): AuditFinding {
  return { id, label, severity, detail };
}

function hasExternalUrl(html: string): boolean {
  return /\b(?:src|href)=["']https?:\/\//i.test(html) || /url\(["']?https?:\/\//i.test(html);
}

export function auditGeneratedHtml(html: string): StaticAuditReport {
  const source = html.trim();
  if (!source) {
    return {
      score: 0,
      status: "fail",
      findings: [finding("empty", "Projekt chyba", "fail", "Najprv vytvorte alebo nacitajte HTML projekt.")],
    };
  }

  const findings: AuditFinding[] = [];
  findings.push(
    /<!doctype html>/i.test(source)
      ? finding("doctype", "HTML dokument", "pass", "Dokument ma deklarovany doctype.")
      : finding("doctype", "HTML dokument", "fail", "Chyba <!DOCTYPE html>, export nemusi byt konzistentny."),
  );
  findings.push(
    /<meta[^>]+name=["']viewport["']/i.test(source)
      ? finding("viewport", "Mobilny viewport", "pass", "Stranka ma viewport pre mobilne zobrazenie.")
      : finding("viewport", "Mobilny viewport", "fail", "Chyba viewport meta tag pre mobilne zariadenia."),
  );
  findings.push(
    /<title>[^<]{3,}<\/title>/i.test(source)
      ? finding("title", "SEO titulok", "pass", "Titulok je pripraveny pre export.")
      : finding("title", "SEO titulok", "warning", "Titulok je prazdny alebo velmi kratky."),
  );
  findings.push(
    /<script\b/i.test(source)
      ? finding("script", "Interaktivita", "pass", "Projekt obsahuje vlastny skript.")
      : finding("script", "Interaktivita", "warning", "Projekt nema skript; ak ma byt interaktivny, chyba spravanie."),
  );
  findings.push(
    hasExternalUrl(source)
      ? finding("external-url", "Externe zdroje", "fail", "HTML odkazuje na externe zdroje, ktore mozu rozbit export alebo sukromie.")
      : finding("external-url", "Externe zdroje", "pass", "Nenasli sa priame externe zdroje v HTML/CSS."),
  );
  findings.push(
    /<img\b(?![^>]*\balt=)/i.test(source)
      ? finding("image-alt", "Alt texty", "fail", "Niektore obrazky nemaju alt atribut.")
      : finding("image-alt", "Alt texty", "pass", "Obrazky maju alt atribut alebo sa nepouzivaju."),
  );
  findings.push(
    /localStorage\.(getItem|setItem)/i.test(source) && !/try\s*{/i.test(source)
      ? finding("storage-guard", "LocalStorage ochrana", "warning", "LocalStorage by mal byt obaleny try/catch pre sukromny rezim.")
      : finding("storage-guard", "LocalStorage ochrana", "pass", "Perzistencia neposobi krehko pri zakladnej kontrole."),
  );

  const failCount = findings.filter((item) => item.severity === "fail").length;
  const warningCount = findings.filter((item) => item.severity === "warning").length;
  const score = Math.max(0, Math.round(100 - failCount * 22 - warningCount * 8));
  return {
    score,
    status: failCount > 0 ? "fail" : warningCount > 0 ? "warning" : "pass",
    findings,
  };
}
