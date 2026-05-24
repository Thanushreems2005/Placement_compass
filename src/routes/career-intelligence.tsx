import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  BriefcaseBusiness,
  CheckCircle2,
  FileSearch,
  GraduationCap,
  Loader2,
  RefreshCw,
  Target,
  UploadCloud,
} from "lucide-react";
import {
  CareerAnalyticsPanel,
  CareerErrorState,
  CareerOverview,
  CompanyEligibilityCards,
  CompanySelectorPanel,
  ProfileEvidencePanel,
  ReadinessScorePanel,
  RecommendationsPanel,
  ResumeUploadPanel,
  RoadmapPanel,
  SkillGapPanel,
} from "@/components/career/CareerDashboardPanels";
import {
  BulletQualityPanel,
  ResumeOptimizerUploadPanel,
  ResumeKeywordAnalyticsPanel,
  ResumeOptimizerOverview,
  ResumeProfilePanel,
  ResumeScoreBreakdownPanel,
  ResumeSuggestionsPanel,
  RoleCompatibilityPanel,
  TargetRolePanel,
} from "@/components/resume-optimizer/ResumeOptimizerPanels";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { useResumeOptimizerAnalysis } from "@/hooks/use-resume-optimizer";
import type {
  CompanyEligibilityMatch,
  ProfileAnalysis,
  ReadinessReportResponse,
  RoadmapResponse,
  SkillGapResponse,
} from "@/services/careerService";
import {
  downloadResumeOptimizerReport,
  type ResumeOptimizerAnalysis,
} from "@/services/resumeOptimizerService";

export const Route = createFileRoute("/career-intelligence")({
  head: () => ({
    meta: [
      { title: "Career Intelligence · SRM Placement Intelligence" },
      {
        name: "description",
        content:
          "Unified career intelligence module with resume parsing, placement readiness, company matching, ATS scoring, role fit and improvement reports.",
      },
    ],
  }),
  component: CareerIntelligencePage,
});

const DEFAULT_ROLE = "Full Stack Developer";
const RESUME_OPTIMIZER_ANALYSIS_KEY = "placement_resume_optimizer_analysis";

function getStoredResumeOptimizerAnalysis(): ResumeOptimizerAnalysis | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(RESUME_OPTIMIZER_ANALYSIS_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ResumeOptimizerAnalysis;
  } catch {
    window.localStorage.removeItem(RESUME_OPTIMIZER_ANALYSIS_KEY);
    return null;
  }
}

function setStoredResumeOptimizerAnalysis(analysis: ResumeOptimizerAnalysis | null) {
  if (typeof window === "undefined") return;
  if (analysis) {
    window.localStorage.setItem(RESUME_OPTIMIZER_ANALYSIS_KEY, JSON.stringify(analysis));
  } else {
    window.localStorage.removeItem(RESUME_OPTIMIZER_ANALYSIS_KEY);
  }
}

function CareerIntelligencePage() {
  const [token, setToken] = useState<string | null>(() => getStoredCareerToken());
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [resumeAnalysis, setResumeAnalysis] = useState<ResumeOptimizerAnalysis | null>(() =>
    getStoredResumeOptimizerAnalysis(),
  );
  const [resumeFirstMatches, setResumeFirstMatches] = useState<CompanyEligibilityMatch[]>([]);
  const [lastFile, setLastFile] = useState<File | null>(null);
  const [selectedRole, setSelectedRole] = useState(DEFAULT_ROLE);
  const [customRole, setCustomRole] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [careerReportSuccess, setCareerReportSuccess] = useState<string | null>(null);
  const [careerReportError, setCareerReportError] = useState<string | null>(null);
  const [atsDownloadStatus, setAtsDownloadStatus] = useState<string | null>(null);
  const [atsDownloadError, setAtsDownloadError] = useState<string | null>(null);

  const resumeFirstAnalysis = useResumeFirstAnalysis();
  const optimizer = useResumeOptimizerAnalysis();
  const profile = useCareerProfile(token);
  const matches = useCareerMatches(token);
  const skillGap = useCareerSkillGap(token, selectedCompany);
  const roadmap = useCareerRoadmap(token, selectedCompany);
  const readiness = useReadinessReport(token, selectedCompany);
  const resetReadiness = readiness.reset;

  const sortedMatches = useMemo(
    () =>
      [...((matches.data?.matches?.length ? matches.data.matches : resumeFirstMatches) ?? [])].sort(
        (a, b) => b.readiness_score - a.readiness_score,
      ),
    [matches.data, resumeFirstMatches],
  );
  const selectedMatch = sortedMatches.find((match) => match.company_name === selectedCompany);
  const topMatch = sortedMatches[0];
  const companyLoading = matches.isLoading && sortedMatches.length === 0;
  const loadingUpload = resumeFirstAnalysis.isPending || optimizer.isPending;
  const hasAnyAnalysis = Boolean(token || resumeAnalysis);
  const activeRole = selectedRole === "Custom Role" ? customRole.trim() : selectedRole;

  useEffect(() => {
    resetReadiness();
    setCareerReportSuccess(null);
    setCareerReportError(null);
  }, [resetReadiness, selectedCompany]);

  const analyzeFile = async (file: File, role: string) => {
    setUploadError(null);
    setUploadSuccess(null);
    setAtsDownloadStatus(null);
    setAtsDownloadError(null);
    setCareerReportSuccess(null);
    setCareerReportError(null);
    setResumeAnalysis(null);
    setStoredResumeOptimizerAnalysis(null);

    const [careerResult, atsResult] = await Promise.allSettled([
      resumeFirstAnalysis.mutateAsync(file),
      optimizer.mutateAsync({ file, targetRole: role }),
    ]);

    if (careerResult.status === "fulfilled") {
      setStoredCareerToken(careerResult.value.access_token);
      setToken(careerResult.value.access_token);
      setResumeFirstMatches(careerResult.value.matches);
      setSelectedCompany(null);
    }

    if (atsResult.status === "fulfilled") {
      setResumeAnalysis(atsResult.value);
      setStoredResumeOptimizerAnalysis(atsResult.value);
    }

    const failures = [careerResult, atsResult]
      .filter((result): result is PromiseRejectedResult => result.status === "rejected")
      .map((result) =>
        result.reason instanceof Error ? result.reason.message : "Analysis failed.",
      );

    if (failures.length) {
      setUploadError(failures.join(" "));
      return;
    }

    setUploadSuccess(
      `${file.name} was parsed once and used for placement readiness plus ATS optimization.`,
    );
  };

  const handleUpload = async (file: File) => {
    setLastFile(file);
    await analyzeFile(file, activeRole || DEFAULT_ROLE);
  };

  const handleRoleChange = async (role: string) => {
    setSelectedRole(role);
    setAtsDownloadStatus(null);
    setAtsDownloadError(null);
    if (role !== "Custom Role" && lastFile) {
      await analyzeAtsOnly(lastFile, role);
    }
  };

  const handleApplyCustomRole = async () => {
    if (!lastFile || !customRole.trim()) return;
    await analyzeAtsOnly(lastFile, customRole.trim());
  };

  const analyzeAtsOnly = async (file: File, role: string) => {
    setUploadError(null);
    setAtsDownloadStatus(null);
    setAtsDownloadError(null);
    try {
      const result = await optimizer.mutateAsync({ file, targetRole: role });
      setResumeAnalysis(result);
      setStoredResumeOptimizerAnalysis(result);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Unable to re-analyze resume.");
    }
  };

  const handleStartOver = () => {
    setStoredCareerToken(null);
    setToken(null);
    setSelectedCompany(null);
    setResumeAnalysis(null);
    setStoredResumeOptimizerAnalysis(null);
    setResumeFirstMatches([]);
    setLastFile(null);
    setUploadError(null);
    setUploadSuccess(null);
    setCareerReportSuccess(null);
    setCareerReportError(null);
    setAtsDownloadStatus(null);
    setAtsDownloadError(null);
  };

  const handleCareerReportDownload = async () => {
    if (!selectedMatch || !profile.data) return;
    setCareerReportSuccess(null);
    setCareerReportError(null);
    try {
      const report = await readiness.mutateAsync();
      downloadCareerReport({
        profile: profile.data,
        match: selectedMatch,
        report,
        gap: skillGap.data,
        roadmap: roadmap.data,
      });
      setCareerReportSuccess(`Downloaded report for ${selectedMatch.company_name}.`);
    } catch (error) {
      setCareerReportError(error instanceof Error ? error.message : "Unable to generate report.");
    }
  };

  const handleAtsReportDownload = async () => {
    if (!resumeAnalysis) return;
    setAtsDownloadStatus(null);
    setAtsDownloadError(null);
    try {
      const { blob, filename } = await downloadResumeOptimizerReport(resumeAnalysis);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setAtsDownloadStatus(`${filename} download started.`);
    } catch (error) {
      setAtsDownloadError(error instanceof Error ? error.message : "Unable to download report.");
    }
  };

  const loadError = profile.error ?? matches.error;
  const noProfile =
    loadError instanceof Error && /student profile not found|404/i.test(loadError.message);

  return (
    <div className="mx-auto max-w-screen-2xl px-4 py-8 sm:px-6">
      <UnifiedHeader onStartOver={handleStartOver} selectedCompany={selectedCompany} />
      <UnifiedUploadPanel
        loading={loadingUpload}
        error={uploadError}
        success={uploadSuccess}
        hasAnalysis={hasAnyAnalysis}
        onUpload={handleUpload}
      />

      {hasAnyAnalysis && (
        <UnifiedSummary
          profile={profile.data}
          resumeAnalysis={resumeAnalysis}
          topMatch={topMatch}
          profileLoading={profile.isLoading}
          matchesLoading={companyLoading}
        />
      )}

      {!hasAnyAnalysis ? (
        <EmptyUnifiedState />
      ) : noProfile ? (
        <CareerErrorState message="Student profile could not be created from this resume. Upload a resume with name, contact details, education, skills and projects." />
      ) : loadError instanceof Error ? (
        <CareerErrorState message={loadError.message} />
      ) : (
        <Tabs defaultValue="overview" className="mt-8">
          <TabsList className="grid h-auto w-full gap-3 rounded-2xl border border-border bg-surface p-2 shadow-xl shadow-primary/10 sm:grid-cols-3 xl:max-w-5xl">
            <FeatureTabTrigger
              value="overview"
              icon={BarChart3}
              label="Overview"
              accent="Snapshot"
            />
            <FeatureTabTrigger
              value="placement"
              icon={BriefcaseBusiness}
              label="Placement Readiness"
              accent={`${sortedMatches.length} companies`}
            />
            <FeatureTabTrigger
              value="ats"
              icon={FileSearch}
              label="Resume Optimizer"
              accent={resumeAnalysis ? `${Math.round(resumeAnalysis.ats_score)}% ATS` : "ATS score"}
            />
          </TabsList>

          <TabsContent
            value="overview"
            className="mt-6 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500"
          >
            <CareerOverview profile={profile.data} loading={profile.isLoading} />
            <ProfileEvidencePanel profile={profile.data} loading={profile.isLoading} />
            <ResumeOptimizerOverview
              analysis={resumeAnalysis}
              loading={optimizer.isPending}
              downloadStatus={atsDownloadStatus}
              downloadError={atsDownloadError}
              onDownload={handleAtsReportDownload}
            />
          </TabsContent>

          <TabsContent
            value="placement"
            className="mt-6 animate-in fade-in slide-in-from-bottom-2 duration-500"
          >
            <CompanySelectorPanel
              matches={sortedMatches}
              selectedCompany={selectedCompany}
              loading={companyLoading}
              onSelect={setSelectedCompany}
            />
            <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
              <ReadinessScorePanel
                match={selectedMatch}
                report={readiness.data}
                loading={companyLoading}
                downloading={readiness.isPending}
                downloadSuccess={careerReportSuccess}
                downloadError={careerReportError}
                onDownload={handleCareerReportDownload}
              />
              <ResumeUploadPanel
                uploaded={profile.data?.resume_uploaded ?? false}
                uploading={loadingUpload}
                error={uploadError}
                success={uploadSuccess}
                onUpload={handleUpload}
              />
            </div>
            <section className="mt-8 animate-in fade-in slide-in-from-bottom-3 duration-700">
              <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <span className="label-eyebrow">Company-wise eligibility</span>
                  <h2 className="font-display text-xl font-semibold tracking-tight">
                    Best target companies for your current profile
                  </h2>
                </div>
                <p className="text-xs text-muted-foreground">
                  {companyLoading
                    ? "Loading matches..."
                    : `${sortedMatches.length} companies scored`}
                </p>
              </div>
              <CompanyEligibilityCards
                matches={sortedMatches}
                selectedCompany={selectedCompany}
                loading={companyLoading}
                onSelect={setSelectedCompany}
              />
            </section>
            <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
              <SkillGapPanel gap={skillGap.data} loading={skillGap.isLoading} />
              <RoadmapPanel roadmap={roadmap.data} loading={roadmap.isLoading} />
            </div>
            <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
              <RecommendationsPanel report={readiness.data} gap={skillGap.data} />
              <CareerAnalyticsPanel matches={sortedMatches} gap={skillGap.data} />
            </div>
          </TabsContent>

          <TabsContent
            value="ats"
            className="mt-6 animate-in fade-in slide-in-from-bottom-2 duration-500"
          >
            {!resumeAnalysis ? (
              <ResumeOptimizerUploadPanel
                loading={loadingUpload}
                error={uploadError}
                onUpload={handleUpload}
              />
            ) : (
              <TargetRolePanel
                selectedRole={selectedRole}
                customRole={customRole}
                loading={optimizer.isPending}
                onRoleChange={handleRoleChange}
                onCustomRoleChange={setCustomRole}
                onApplyCustomRole={handleApplyCustomRole}
              />
            )}
            <ResumeProfilePanel analysis={resumeAnalysis} />
            {resumeAnalysis && (
              <>
                <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(320px,0.85fr)_minmax(0,1.15fr)]">
                  <ResumeScoreBreakdownPanel analysis={resumeAnalysis} />
                  <RoleCompatibilityPanel analysis={resumeAnalysis} />
                </div>
                <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
                  <ResumeKeywordAnalyticsPanel analysis={resumeAnalysis} />
                  <ResumeSuggestionsPanel analysis={resumeAnalysis} />
                </div>
                <div className="mt-8">
                  <BulletQualityPanel analysis={resumeAnalysis} />
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function UnifiedHeader({
  selectedCompany,
  onStartOver,
}: {
  selectedCompany: string | null;
  onStartOver: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <span className="label-eyebrow">Career Intelligence Suite</span>
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          Resume-to-placement command center
        </h1>
        <p className="mt-1 max-w-4xl text-sm text-muted-foreground">
          Upload one resume to generate student profile evidence, placement readiness, company
          eligibility, ATS scoring, role compatibility, missing keywords, and improvement reports.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {selectedCompany && (
          <Badge variant="secondary" className="px-3 py-1 font-bold">
            Selected company: {selectedCompany}
          </Badge>
        )}
        <Button variant="outline" size="sm" className="gap-2" onClick={onStartOver}>
          <RefreshCw className="h-3.5 w-3.5" />
          Start over
        </Button>
      </div>
    </div>
  );
}

function FeatureTabTrigger({
  value,
  icon: Icon,
  label,
  accent,
}: {
  value: string;
  icon: typeof BarChart3;
  label: string;
  accent: string;
}) {
  return (
    <TabsTrigger
      value={value}
      className="group h-auto justify-start gap-3 rounded-xl border border-border/70 bg-secondary/30 px-4 py-3 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:bg-secondary hover:shadow-md data-[state=active]:border-primary/30 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/20"
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-surface text-primary ring-1 ring-border transition-colors group-data-[state=active]:bg-primary-foreground group-data-[state=active]:text-primary group-data-[state=active]:ring-primary-foreground/50">
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block font-display text-base font-semibold tracking-tight">{label}</span>
        <span className="mt-0.5 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground group-data-[state=active]:text-primary-foreground/75">
          {accent}
        </span>
      </span>
    </TabsTrigger>
  );
}

function UnifiedUploadPanel({
  loading,
  error,
  success,
  hasAnalysis,
  onUpload,
}: {
  loading: boolean;
  error: string | null;
  success: string | null;
  hasAnalysis: boolean;
  onUpload: (file: File) => void;
}) {
  return (
    <section className="mt-6 rounded-xl border border-border bg-surface p-6 shadow-xl shadow-primary/5 transition-all duration-300 animate-in fade-in zoom-in-95 hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-primary/10">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,420px)] lg:items-center">
        <div>
          <span className="label-eyebrow">One resume upload</span>
          <h2 className="font-display text-xl font-semibold tracking-tight">
            {hasAnalysis ? "Update analysis with a new resume" : "Start with your resume"}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            The same uploaded file powers both modules: placement readiness for companies and ATS
            optimization for target roles.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Profile", "Parsed student evidence"],
              ["Placement", "Company readiness"],
              ["ATS", "Resume quality score"],
              ["Roadmap", "Company-specific plan"],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-lg border border-border bg-secondary/20 p-3 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/20 hover:bg-secondary/40"
              >
                <div className="field-label">{label}</div>
                <div className="mt-1 text-sm font-semibold">{value}</div>
              </div>
            ))}
          </div>
        </div>
        <label className="flex min-h-36 cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-secondary/20 px-4 py-8 text-center transition-all duration-300 hover:-translate-y-1 hover:border-primary/35 hover:bg-secondary/40 hover:shadow-lg hover:shadow-primary/5">
          <div className="grid h-12 w-12 place-items-center rounded-lg bg-primary text-primary-foreground">
            {loading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <UploadCloud className="h-6 w-6" />
            )}
          </div>
          <div className="text-sm font-bold">
            {loading ? "Analyzing resume..." : "Choose resume file"}
          </div>
          <div className="text-xs text-muted-foreground">PDF, DOC, DOCX, or TXT</div>
          <input
            type="file"
            accept=".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
            className="sr-only"
            disabled={loading}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onUpload(file);
              event.target.value = "";
            }}
          />
        </label>
      </div>

      {success && (
        <Alert className="mt-5 border-success/30 bg-success/5 text-success">
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>Resume analyzed</AlertTitle>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}
      {error && (
        <Alert variant="destructive" className="mt-5">
          <FileSearch className="h-4 w-4" />
          <AlertTitle>Analysis needs attention</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </section>
  );
}

function UnifiedSummary({
  profile,
  resumeAnalysis,
  topMatch,
  profileLoading,
  matchesLoading,
}: {
  profile: ProfileAnalysis | undefined;
  resumeAnalysis: ResumeOptimizerAnalysis | null;
  topMatch: CompanyEligibilityMatch | undefined;
  profileLoading: boolean;
  matchesLoading: boolean;
}) {
  const profileScore = profile ? Math.round(profile.profile_strength_score) : 0;
  const atsScore = resumeAnalysis ? Math.round(resumeAnalysis.ats_score) : 0;
  const readinessScore = topMatch ? Math.round(topMatch.readiness_score) : 0;
  const combined = Math.round(
    [profileScore, atsScore, readinessScore]
      .filter((score) => score > 0)
      .reduce((a, b) => a + b, 0) /
      Math.max([profileScore, atsScore, readinessScore].filter((score) => score > 0).length, 1),
  );

  return (
    <section className="mt-6 rounded-xl border border-border bg-surface p-5 shadow-sm transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/5">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
        <div className="grid h-28 w-28 shrink-0 place-items-center rounded-full bg-secondary/50">
          <div className="grid h-24 w-24 place-items-center rounded-full border-[10px] border-primary/80 bg-surface text-center">
            <div>
              <div className="font-display text-2xl font-bold">{combined}%</div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Overall
              </div>
            </div>
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="label-eyebrow">Unified intelligence</span>
              <h2 className="font-display text-xl font-semibold tracking-tight">
                One profile, two outcomes
              </h2>
            </div>
            <Badge variant="secondary" className="w-fit px-3 py-1 font-bold">
              {resumeAnalysis?.selected_role ?? "Upload resume to analyze role fit"}
            </Badge>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <MetricBar
              label="Profile strength"
              value={profileScore}
              loading={profileLoading}
              icon={GraduationCap}
            />
            <MetricBar
              label="Top company readiness"
              value={readinessScore}
              loading={matchesLoading}
              icon={BriefcaseBusiness}
            />
            <MetricBar label="ATS quality" value={atsScore} loading={false} icon={Target} />
          </div>
        </div>
      </div>
    </section>
  );
}

function MetricBar({
  label,
  value,
  loading,
  icon: Icon,
}: {
  label: string;
  value: number;
  loading: boolean;
  icon: typeof Target;
}) {
  return (
    <div className="rounded-lg border border-border bg-secondary/20 p-3 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/20 hover:bg-secondary/40">
      <div className="flex items-center justify-between gap-3">
        <div className="field-label">{label}</div>
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="mt-2 flex items-center gap-3">
        <div className="font-display text-2xl font-bold tabular-nums">{loading ? "--" : value}</div>
        <Progress value={loading ? 0 : value} className="h-2" />
      </div>
    </div>
  );
}

function EmptyUnifiedState() {
  return (
    <section className="mt-8 rounded-xl border border-border bg-surface p-8 text-center shadow-sm">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-lg bg-secondary text-primary">
        <BarChart3 className="h-6 w-6" />
      </div>
      <h2 className="mt-4 font-display text-xl font-semibold tracking-tight">
        Upload a resume to generate the complete intelligence dashboard
      </h2>
      <p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground">
        The dashboard stays empty until real backend parsing finishes. No static profile, company
        match, ATS score, or recommendation is shown without an uploaded resume.
      </p>
    </section>
  );
}

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
