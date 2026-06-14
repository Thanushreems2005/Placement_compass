import { createFileRoute } from "@tanstack/react-router";
import DSABuddyDashboard from "@/components/dsa-buddy/DSABuddyDashboard";

export const Route = createFileRoute("/dsa-buddy/")({
  component: DSABuddyDashboardPage,
});

function DSABuddyDashboardPage() {
  return <DSABuddyDashboard />;
}
