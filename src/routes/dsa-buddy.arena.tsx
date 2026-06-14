import { createFileRoute } from "@tanstack/react-router";
import ArenaPage from "@/components/dsa-buddy/ArenaPage";

export const Route = createFileRoute("/dsa-buddy/arena")({
  component: DSABuddyArenaPage,
});

function DSABuddyArenaPage() {
  return <ArenaPage />;
}
