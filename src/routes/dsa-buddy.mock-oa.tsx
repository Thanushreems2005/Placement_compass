import { createFileRoute } from "@tanstack/react-router";
import MockOASimulator from "@/components/dsa-buddy/MockOASimulator";

export const Route = createFileRoute("/dsa-buddy/mock-oa")({
  component: DSABuddyMockOAPage,
});

function DSABuddyMockOAPage() {
  return <MockOASimulator />;
}
