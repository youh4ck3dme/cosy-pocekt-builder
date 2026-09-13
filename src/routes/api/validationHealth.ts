import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/validationHealth")({
  server: {
    handlers: {
      GET: async () => {
        const { validationHealth } = await import("@/lib/ai/generate");
        const result = await validationHealth();
        return Response.json(result);
      },
    },
  },
});
