import { createFileRoute } from "@tanstack/react-router";
import { LaunchView } from "@/components/app/LaunchView";

export const Route = createFileRoute("/launch")({
  component: LaunchView,
  head: () => ({
    meta: [{ title: "Launch — Cozy" }],
  }),
});
