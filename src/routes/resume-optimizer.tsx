import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/resume-optimizer")({
  beforeLoad: () => {
    throw redirect({ to: "/career-intelligence" });
  },
});
