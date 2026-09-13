import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ProjectItem = {
  id: string;
  title: string;
  html: string;
  code: string;
  updatedAt: number;
};

export type PromptItem = {
  id: string;
  title: string;
  body: string;
  updatedAt: number;
};

export type BlueprintItem = {
  id: string;
  title: string;
  html: string;
  updatedAt: number;
};

type WorkspaceState = {
  workspaceId: string;
  currentProjectId: string | null;
  projects: ProjectItem[];
  prompts: PromptItem[];
  blueprints: BlueprintItem[];
  setCurrentProjectId: (id: string | null) => void;
  upsertProject: (item: Omit<ProjectItem, "id" | "updatedAt"> & { id?: string }) => string;
  removeProject: (id: string) => void;
  addPrompt: (title: string, body: string) => void;
  removePrompt: (id: string) => void;
  addBlueprint: (title: string, html: string) => void;
  renameBlueprint: (id: string, title: string) => void;
  duplicateBlueprint: (id: string) => void;
  removeBlueprint: (id: string) => void;
  clearLocal: () => void;
};

function nid() {
  return crypto.randomUUID();
}

const empty = {
  currentProjectId: null as string | null,
  projects: [] as ProjectItem[],
  prompts: [] as PromptItem[],
  blueprints: [] as BlueprintItem[],
};

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      workspaceId: nid(),
      ...empty,
      setCurrentProjectId: (id) => set({ currentProjectId: id }),
      upsertProject: (item) => {
        const id = item.id ?? get().currentProjectId ?? nid();
        const next: ProjectItem = {
          id,
          title: item.title,
          html: item.html,
          code: item.code,
          updatedAt: Date.now(),
        };
        set((s) => {
          const rest = s.projects.filter((p) => p.id !== id);
          return {
            currentProjectId: id,
            projects: [next, ...rest].slice(0, 40),
          };
        });
        return id;
      },
      removeProject: (id) =>
        set((s) => ({
          projects: s.projects.filter((p) => p.id !== id),
          currentProjectId: s.currentProjectId === id ? null : s.currentProjectId,
        })),
      addPrompt: (title, body) => {
        const t = title.trim() || body.trim().slice(0, 42) || "Prompt";
        const b = body.trim();
        if (!b) return;
        set((s) => ({
          prompts: [
            { id: nid(), title: t, body: b, updatedAt: Date.now() },
            ...s.prompts,
          ].slice(0, 80),
        }));
      },
      removePrompt: (id) =>
        set((s) => ({ prompts: s.prompts.filter((p) => p.id !== id) })),
      addBlueprint: (title, html) => {
        const h = html.trim();
        if (!h) return;
        set((s) => ({
          blueprints: [
            {
              id: nid(),
              title: title.trim() || "Blueprint",
              html: h,
              updatedAt: Date.now(),
            },
            ...s.blueprints,
          ].slice(0, 40),
        }));
      },
      renameBlueprint: (id, title) => {
        const nextTitle = title.trim();
        if (!nextTitle) return;
        set((s) => ({
          blueprints: s.blueprints.map((blueprint) =>
            blueprint.id === id
              ? { ...blueprint, title: nextTitle, updatedAt: Date.now() }
              : blueprint,
          ),
        }));
      },
      duplicateBlueprint: (id) => {
        set((s) => {
          const source = s.blueprints.find((blueprint) => blueprint.id === id);
          if (!source) return s;
          return {
            blueprints: [
              {
                ...source,
                id: nid(),
                title: `${source.title} – kópia`,
                updatedAt: Date.now(),
              },
              ...s.blueprints,
            ].slice(0, 40),
          };
        });
      },
      removeBlueprint: (id) =>
        set((s) => ({ blueprints: s.blueprints.filter((p) => p.id !== id) })),
      clearLocal: () => set({ ...empty, workspaceId: nid() }),
    }),
    { name: "cozy-workspace-v1" },
  ),
);
