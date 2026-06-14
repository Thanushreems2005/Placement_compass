import { createFileRoute } from "@tanstack/react-router";
import AssessmentPage from "@/components/dsa-buddy/AssessmentPage";

export const Route = createFileRoute("/dsa-buddy/assessment")({
  component: DSABuddyAssessmentPage,
});

function DSABuddyAssessmentPage() {
  return <AssessmentPage />;
}
