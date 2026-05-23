import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  CareerAnalyticsPanel,
  CareerErrorState,
  CareerOverview,
  CareerPageHeader,
  CompanyEligibilityCards,
  CompanySelectorPanel,
  ProfileEvidencePanel,
  ReadinessScorePanel,
  RecommendationsPanel,
  ResumeFirstStartPanel,
  ResumeUploadPanel,
  RoadmapPanel,
  SkillGapPanel,
} from "@/components/career/CareerDashboardPanels";
import {
  getStoredCareerToken,
  setStoredCareerToken,
  useCareerMatches,
  useCareerProfile,
  useCareerRoadmap,
  useCareerSkillGap,
  useReadinessReport,
  useResumeFirstAnalysis,
} from "@/hooks/use-career-intelligence";
import { EmptyState } from "@/components/EmptyState";
import type {
  CompanyEligibilityMatch,
  ProfileAnalysis,
  ReadinessReportResponse,
  RoadmapResponse,
  SkillGapResponse,
} from "@/services/careerService";

export const Route = createFileRoute("/career-dashboard")({
  head: () => ({
    meta: [
      { title: "Career Dashboard · PES Placement Intelligence" },
      {
        name: "description",
        content:
          "Student career intelligence dashboard with readiness scoring, skill gaps, roadmap, resume upload and company eligibility matching.",
      },
    ],
  }),
  component: CareerDashboardPage,
});

function downloadCareerReport({
  profile,
  match,
  report,
  gap,
  roadmap,
}: {
  profile: ProfileAnalysis;
  match: CompanyEligibilityMatch;
  report: ReadinessReportResponse;
  gap: SkillGapResponse | undefined;
  roadmap: RoadmapResponse | undefined;
}) {
  const lines = [
    "Student Career Intelligence Report",
    "==================================",
    "",
    `Student: ${profile.full_name}`,
    `Email: ${profile.email ?? "Not found in resume"}`,
    `Resume: ${profile.active_resume_filename ?? "Not uploaded"}`,
    `Profile strength: ${Math.round(profile.profile_strength_score)}%`,
    "",
    `Selected company: ${match.company_name}`,
    `Readiness score: ${Math.round(report.readiness_score)}% (${report.readiness_label})`,
    `Eligibility signal: ${report.eligible ? "Likely" : "Build"}`,
    "",
    "Matched skills",
    "--------------",
    ...(report.matched_skills.length
      ? report.matched_skills.map((skill) => `- ${skill}`)
      : ["- None"]),
    "",
    "Missing skills",
    "--------------",
    ...(report.missing_skills.length
      ? report.missing_skills.map((skill) => `- ${skill}`)
      : ["- None"]),
    "",
    "Skill gap summary",
    "-----------------",
    gap?.summary ?? match.summary,
    "",
    "Roadmap",
    "-------",
    ...((roadmap?.roadmap ?? report.roadmap).length
      ? (roadmap?.roadmap ?? report.roadmap).map(
          (item) =>
            `Week ${item.week}: ${item.title}\nPriority: ${item.priority}\n${item.description}\nSkills: ${
              item.target_skills.join(", ") || "General preparation"
            }`,
        )
      : ["No roadmap items generated."]),
    "",
    "Recommendations",
    "---------------",
    ...(report.recommendations.length
      ? report.recommendations.map(
          (item) =>
            `${item.priority.toUpperCase()} - ${item.title}\n${item.description}\nSkills: ${
              item.target_skills.join(", ") || "General preparation"
            }`,
        )
      : ["No recommendations generated."]),
    "",
    `Generated at: ${new Date(report.generated_at).toLocaleString()}`,
  ];

  const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const company = match.company_name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  link.href = url;
  link.download = `career-readiness-${company || "company"}.txt`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function CareerDashboardPage() {
  const [token, setToken] = useState<string | null>(() => getStoredCareerToken());
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [reportSuccess, setReportSuccess] = useState<string | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);

  const resumeFirstAnalysis = useResumeFirstAnalysis();
  const profile = useCareerProfile(token);
  const matches = useCareerMatches(token);
  const skillGap = useCareerSkillGap(token, selectedCompany);
  const roadmap = useCareerRoadmap(token, selectedCompany);
  const readiness = useReadinessReport(token, selectedCompany);
  const resetReadiness = readiness.reset;

  const sortedMatches = useMemo(
    () => [...(matches.data?.matches ?? [])].sort((a, b) => b.readiness_score - a.readiness_score),
    [matches.data],
  );

  const selectedMatch = sortedMatches.find((match) => match.company_name === selectedCompany);

  useEffect(() => {
    resetReadiness();
    setReportSuccess(null);
    setReportError(null);
  }, [resetReadiness, selectedCompany]);

  const handleResumeFirstUpload = async (file: File) => {
    setAnalysisError(null);
    setUploadError(null);
    setUploadSuccess(null);
    try {
      const response = await resumeFirstAnalysis.mutateAsync(file);
      setStoredCareerToken(response.access_token);
      setToken(response.access_token);
      setSelectedCompany(null);
      setUploadSuccess(
        `${response.upload.original_filename} was parsed and used to build this profile.`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Resume analysis failed.";
      setAnalysisError(message);
      setUploadError(message);
    }
  };

  const handleLogout = () => {
    setStoredCareerToken(null);
    setToken(null);
    setSelectedCompany(null);
    setUploadSuccess(null);
    setUploadError(null);
    setAnalysisError(null);
    setReportSuccess(null);
    setReportError(null);
  };

  if (!token) {
    return (
      <ResumeFirstStartPanel
        uploading={resumeFirstAnalysis.isPending}
        error={analysisError}
        onUpload={handleResumeFirstUpload}
      />
    );
  }

  const loadError = profile.error ?? matches.error;
  const noProfile =
    loadError instanceof Error && /student profile not found|404/i.test(loadError.message);

  return (
    <div className="mx-auto max-w-screen-2xl px-4 py-8 sm:px-6">
      <CareerPageHeader selectedCompany={selectedCompany} onLogout={handleLogout} />

      {noProfile ? (
        <div className="mt-6">
          <EmptyState
            title="Student profile required"
            description="Create a backend student profile for this account before opening career intelligence."
          />
        </div>
      ) : loadError instanceof Error ? (
        <CareerErrorState message={loadError.message} />
      ) : (
        <>
          <CareerOverview profile={profile.data} loading={profile.isLoading} />
          <ProfileEvidencePanel profile={profile.data} loading={profile.isLoading} />
          <CompanySelectorPanel
            matches={sortedMatches}
            selectedCompany={selectedCompany}
            loading={matches.isLoading}
            onSelect={setSelectedCompany}
          />

          <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
            <ReadinessScorePanel
              match={selectedMatch}
              report={readiness.data}
              loading={matches.isLoading}
              downloading={readiness.isPending}
              downloadSuccess={reportSuccess}
              downloadError={reportError}
              onDownload={async () => {
                if (!selectedMatch || !profile.data) return;
                setReportSuccess(null);
                setReportError(null);
                try {
                  const report = await readiness.mutateAsync();
                  downloadCareerReport({
                    profile: profile.data,
                    match: selectedMatch,
                    report,
                    gap: skillGap.data,
                    roadmap: roadmap.data,
                  });
                  setReportSuccess(`Downloaded report for ${selectedMatch.company_name}.`);
                } catch (error) {
                  setReportError(
                    error instanceof Error ? error.message : "Unable to generate report.",
                  );
                }
              }}
            />
            <ResumeUploadPanel
              uploaded={profile.data?.resume_uploaded ?? false}
              uploading={resumeFirstAnalysis.isPending}
              error={uploadError}
              success={uploadSuccess}
              onUpload={handleResumeFirstUpload}
            />
          </div>

          <section className="mt-8">
            <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <span className="label-eyebrow">Company-wise eligibility</span>
                <h2 className="font-display text-xl font-semibold tracking-tight">
                  Best target companies for your current profile
                </h2>
              </div>
              <p className="text-xs text-muted-foreground">
                {matches.isLoading
                  ? "Loading matches..."
                  : `${sortedMatches.length} companies scored`}
              </p>
            </div>
            <CompanyEligibilityCards
              matches={sortedMatches}
              selectedCompany={selectedCompany}
              loading={matches.isLoading}
              onSelect={setSelectedCompany}
            />
          </section>

          <div className="mt-8 grid gap-6 xl:grid-cols-2">
            <SkillGapPanel gap={skillGap.data} loading={skillGap.isLoading} />
            <RoadmapPanel roadmap={roadmap.data} loading={roadmap.isLoading} />
          </div>

          <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
            <RecommendationsPanel report={readiness.data} gap={skillGap.data} />
            <CareerAnalyticsPanel matches={sortedMatches} gap={skillGap.data} />
          </div>
        </>
      )}
    </div>
  );
}
