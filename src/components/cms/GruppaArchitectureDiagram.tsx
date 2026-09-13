import { Layers, FileText, Tag, Search, CheckSquare, ArrowRight, ArrowLeft } from "lucide-react";

export function GruppaArchitectureDiagram() {
  return (
    <div className="rounded-3xl border border-border bg-card/40 p-6 sm:p-8 space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-border/50">
        <div>
          <h3 className="font-serif text-lg font-bold text-fg flex items-center gap-2">
            <Layers className="h-5 w-5 text-accent" />
            Gruppa CMS Architektúra (Rudolf Yeti Standard)
          </h3>
          <p className="text-xs text-muted mt-1">
            Zákres kľúčových dátových tokov a prepojení medzi Pages, Content, Taxonomy, Terms, SEO a Forms.
          </p>
        </div>

        <span className="text-[10px] uppercase font-mono px-2.5 py-1 rounded-full bg-accent/10 text-accent border border-accent/20">
          Source of Truth Model
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-xs">
        {/* 1. PAGES */}
        <div className="rounded-2xl border border-border bg-surface p-4 space-y-3">
          <div className="flex items-center gap-2 font-bold text-fg border-b border-border/40 pb-2">
            <FileText className="h-4 w-4 text-blue-400" />
            <span>1. Pages</span>
          </div>
          <div className="space-y-1.5 text-muted">
            <div className="flex items-center gap-1 text-fg font-medium">
              <ArrowRight className="h-3 w-3 text-accent" /> Page type
            </div>
            <div className="pl-4 space-y-1 text-subtle font-mono text-[11px]">
              <div>• Headers</div>
              <div>• Sections</div>
            </div>
          </div>
        </div>

        {/* 2. CONTENT */}
        <div className="rounded-2xl border border-border bg-surface p-4 space-y-3">
          <div className="flex items-center gap-2 font-bold text-fg border-b border-border/40 pb-2">
            <FileText className="h-4 w-4 text-emerald-400" />
            <span>2. Content</span>
          </div>
          <div className="space-y-1.5 text-muted">
            <div className="flex items-center gap-1 text-fg font-medium">
              <ArrowRight className="h-3 w-3 text-accent" /> Post type
            </div>
            <div className="pl-4 space-y-1 text-subtle font-mono text-[11px]">
              <div>• Products (Produkty)</div>
              <div>• Services (Služby)</div>
              <div>• Projects (Projekty)</div>
              <div>• Articles (Články)</div>
            </div>
          </div>
        </div>

        {/* 3. TAXONOMY & TERMS */}
        <div className="rounded-2xl border border-accent/40 bg-accent/5 p-4 space-y-3">
          <div className="flex items-center gap-2 font-bold text-accent border-b border-accent/20 pb-2">
            <Tag className="h-4 w-4 text-accent" />
            <span>3. Taxonomy & Terms</span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-fg font-medium">
              <span>Taxonomy (#13)</span>
              <ArrowLeft className="h-3 w-3 text-accent" />
              <span>Terms (#14)</span>
            </div>
            <div className="pl-2 border-l-2 border-accent/30 space-y-1 text-subtle font-mono text-[11px]">
              <div>• Content types</div>
              <div>• Categories</div>
              <div>• Topics</div>
            </div>
            <div className="text-[10px] text-muted italic">
              Query #31 (taxonomy_query) prepája Terms na Taxonomy
            </div>
          </div>
        </div>

        {/* 4. SEO */}
        <div className="rounded-2xl border border-border bg-surface p-4 space-y-3">
          <div className="flex items-center gap-2 font-bold text-fg border-b border-border/40 pb-2">
            <Search className="h-4 w-4 text-purple-400" />
            <span>4. SEO Meta</span>
          </div>
          <div className="space-y-1 text-muted text-[11px]">
            <div className="flex items-center gap-1">
              <ArrowRight className="h-3 w-3 text-purple-400" /> Pages Meta
            </div>
            <div className="flex items-center gap-1">
              <ArrowRight className="h-3 w-3 text-purple-400" /> Content Meta
            </div>
          </div>
        </div>

        {/* 5. FORMS */}
        <div className="rounded-2xl border border-border bg-surface p-4 space-y-3">
          <div className="flex items-center gap-2 font-bold text-fg border-b border-border/40 pb-2">
            <CheckSquare className="h-4 w-4 text-amber-400" />
            <span>5. Forms</span>
          </div>
          <div className="space-y-1 text-muted text-[11px]">
            <div className="flex items-center gap-1">
              <ArrowLeft className="h-3 w-3 text-amber-400" /> Global Settings
            </div>
            <div className="pl-4 text-subtle font-mono">
              <div>• Input Fields</div>
              <div>• Lead Submissions</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
