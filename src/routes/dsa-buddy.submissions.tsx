import { createFileRoute } from "@tanstack/react-router";
import SubmissionsPage from "@/components/dsa-buddy/SubmissionsPage";

export const Route = createFileRoute("/dsa-buddy/submissions")({
  component: DSABuddySubmissionsPage,
});

function DSABuddySubmissionsPage() {
  return <SubmissionsPage />;
}
