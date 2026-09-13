import { createFileRoute } from "@tanstack/react-router";
import { AuthForm } from "@/components/auth/AuthForm";

export const Route = createFileRoute("/register")({
  component: () => <AuthForm mode="register" />,
  ssr: false,
  head: () => ({ meta: [{ title: "Vytvoriť účet — Cozy" }] }),
});
