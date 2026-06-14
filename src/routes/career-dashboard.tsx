import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/career-dashboard")({
  beforeLoad: () => {
    throw redirect({ to: "/career-intelligence" });
  },
});
