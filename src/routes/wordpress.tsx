import { createFileRoute } from "@tanstack/react-router";
import { WordPressView } from "@/components/app/WordPressView";

export const Route = createFileRoute("/wordpress")({
  component: WordPressView,
  ssr: false,
  head: () => ({ meta: [{ title: "WordPress — Cozy" }] }),
});
