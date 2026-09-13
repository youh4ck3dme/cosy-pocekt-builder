import { GENERATE_TIMEOUT_MS, withTimeout } from "../lib/ai/abort-signal.ts";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type StudioMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
};

export type StudioProvider = "mistral" | "gemini" | "openai" | "grok" | "local" | null;

type StudioState = {
  brief: string;
  title: string;
  code: string;
  html: string;
  messages: StudioMessage[];
  running: boolean;
  error: string | null;
  provider: StudioProvider;
  abortController: AbortController | null;
  setBrief: (brief: string) => void;
  setRunning: (running: boolean) => void;
  pushUser: (text: string) => void;
  applyResult: (opts: {
    title: string;
    code: string;
    html: string;
    assistantText: string;
    provider: StudioProvider;
  }) => void;
  setError: (error: string | null) => void;
  hydratePreview: (opts: { title: string; code: string; html: string }) => void;
  loadPreview: (opts: { title: string; code: string; html: string }) => void;
  updateCode: (code: string) => void;
  reset: () => void;
  pushAssistant: (text: string) => void;
  beginGenerate: () => AbortSignal;
  stopGenerate: () => void;
  finishGenerate: () => void;
  failGenerate: (message: string) => void;
};

const empty = {
  brief: "",
  title: "Quiet landing",
  code: "",
  html: "",
  messages: [] as StudioMessage[],
  running: false,
  error: null as string | null,
  provider: null as StudioProvider,
  abortController: null as AbortController | null,
};

function assistant(text: string): StudioMessage {
  return { id: crypto.randomUUID(), role: "assistant", text };
}

export const useStudioStore = create<StudioState>()(
  persist(
    (set, get) => ({
      ...empty,
      setBrief: (brief) => set({ brief }),
      setRunning: (running) => set({ running }),
      setError: (error) => set({ error }),
      hydratePreview: ({ title, code, html }) => set((s) => (s.html ? s : { title, code, html })),
      loadPreview: ({ title, code, html }) => set({ title, code, html, error: null }),
      updateCode: (code) => set({ code, html: code }),
      reset: () => {
        get().abortController?.abort();
        set(empty);
      },
      pushUser: (text) =>
        set((s) => ({
          messages: [...s.messages, { id: crypto.randomUUID(), role: "user" as const, text }],
        })),
      pushAssistant: (text) =>
        set((s) => ({
          running: false,
          messages: [...s.messages, assistant(text)].slice(-24),
        })),
      applyResult: ({ title, code, html, assistantText, provider }) =>
        set((s) => ({
          title,
          code,
          html,
          provider,
          running: false,
          error: null,
          abortController: null,
          messages: [...s.messages, assistant(assistantText)].slice(-24),
        })),
      beginGenerate: () => {
        get().abortController?.abort();
        const controller = new AbortController();
        set({ abortController: controller, running: true, error: null });
        return withTimeout(controller.signal, GENERATE_TIMEOUT_MS);
      },
      stopGenerate: () => {
        const { abortController, running } = get();
        abortController?.abort();
        if (!running) {
          set({ abortController: null });
          return;
        }
        set((s) => ({
          abortController: null,
          running: false,
          error: "Cancelled",
          messages: [...s.messages, assistant("Stopped.")].slice(-24),
        }));
      },
      finishGenerate: () => set({ abortController: null, running: false }),
      failGenerate: (message) =>
        set((s) => ({
          abortController: null,
          running: false,
          error: message,
          messages: [...s.messages, assistant(message)].slice(-24),
        })),
    }),
    {
      name: "cozy-studio-v1",
      partialize: (s) => ({
        brief: s.brief,
        title: s.title,
        code: s.code,
        html: s.html,
        messages: s.messages,
        provider: s.provider,
      }),
      merge: (persisted, current) => ({
        ...current,
        ...(persisted as Partial<StudioState>),
        abortController: null,
        running: false,
      }),
    },
  ),
);
