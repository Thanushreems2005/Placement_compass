import type { ChangeEvent } from "react";
import {
  AlertCircle,
  Award,
  Briefcase,
  CheckCircle2,
  Download,
  FileUp,
  GraduationCap,
  Loader2,
  LockKeyhole,
  Rocket,
  Target,
  TrendingUp,
  UserRound,
  XCircle,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  CompanyEligibilityMatch,
  ProfileAnalysis,
  ReadinessReportResponse,
  RoadmapResponse,
  SkillGapResponse,
} from "@/services/careerService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/EmptyState";
import { StatTile } from "@/components/StatTile";
import { cn } from "@/lib/utils";

const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export function CareerAccessPanel({
  email,
  password,
  loading,
  error,
  onEmailChange,
  onPasswordChange,
  onLogin,
}: {
  email: string;
  password: string;
  loading: boolean;
  error: string | null;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onLogin: () => void;
}) {
  return (
    <div className="mx-auto max-w-screen-2xl px-4 py-8 sm:px-6">
      <div className="grid min-h-[520px] place-items-center">
        <div className="w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-xl shadow-primary/5 animate-in fade-in zoom-in-95 duration-500">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-secondary text-primary">
              <LockKeyhole className="h-5 w-5" />
            </div>
            <div>
              <span className="label-eyebrow">Secure dashboard</span>
              <h1 className="font-display text-xl font-semibold tracking-tight">
                Student Career Intelligence
              </h1>
            </div>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Sign in with the backend account linked to your student profile. The dashboard uses
            authenticated career APIs and live company intelligence.
          </p>

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Sign in failed</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="mt-5 space-y-3">
            <div>
              <label className="field-label">Email</label>
              <Input
                value={email}
                onChange={(event) => onEmailChange(event.target.value)}
                placeholder="student@example.com"
                autoComplete="email"
                className="mt-1"
              />
            </div>
            <div>
              <label className="field-label">Password</label>
              <Input
                type="password"
                value={password}
                onChange={(event) => onPasswordChange(event.target.value)}
                placeholder="Password"
                autoComplete="current-password"
                className="mt-1"
                onKeyDown={(event) => event.key === "Enter" && onLogin()}
              />
            </div>
            <Button
              className="w-full gap-2 font-bold"
              disabled={!email.trim() || !password.trim() || loading}
              onClick={onLogin}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Connect dashboard
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ResumeFirstStartPanel({
  uploading,
  error,
  onUpload,
}: {
  uploading: boolean;
  error: string | null;
  onUpload: (file: File) => void;
}) {
  return (
    <div className="mx-auto max-w-screen-2xl px-4 py-8 sm:px-6">
      <div className="grid min-h-[620px] place-items-center">
        <div className="w-full max-w-3xl rounded-xl border border-border bg-surface p-6 shadow-xl shadow-primary/5 animate-in fade-in zoom-in-95 duration-500">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <span className="label-eyebrow">Resume-first intelligence</span>
              <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
                Upload a resume to build the student career profile
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                The portal parses the resume, extracts profile details, infers skills and evidence,
                then calculates readiness, company eligibility, gaps, and a roadmap from that
                resume.
              </p>
            </div>
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-secondary text-primary">
              {uploading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <FileUp className="h-6 w-6" />
              )}
            </div>
          </div>

          {error && (
            <Alert variant="destructive" className="mt-5">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Resume analysis failed</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <ResumeDropZone uploading={uploading} onUpload={onUpload} />

          <div className="mt-5 grid gap-3 text-sm md:grid-cols-3">
            <div className="rounded-lg border border-border bg-secondary/20 p-3">
              <div className="field-label">Step 1</div>
              <div className="mt-1 font-semibold">Parse profile details</div>
            </div>
            <div className="rounded-lg border border-border bg-secondary/20 p-3">
              <div className="field-label">Step 2</div>
              <div className="mt-1 font-semibold">Infer skills and evidence</div>
            </div>
            <div className="rounded-lg border border-border bg-secondary/20 p-3">
              <div className="field-label">Step 3</div>
              <div className="mt-1 font-semibold">Score company readiness</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CareerPageHeader({
  selectedCompany,
  onLogout,
}: {
  selectedCompany: string | null;
  onLogout: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <span className="label-eyebrow">Student Career Intelligence</span>
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          Placement readiness command center
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Readiness scoring, skill gaps, resume status, and company-wise eligibility powered by your
          backend student evidence and live placement intelligence.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {selectedCompany && (
          <Badge variant="secondary" className="px-3 py-1 font-bold">
            Selected company: {selectedCompany}
          </Badge>
        )}
        <Button variant="outline" size="sm" onClick={onLogout}>
          Start over
        </Button>
      </div>
    </div>
  );
}

export function CareerOverview({
  profile,
  loading,
}: {
  profile: ProfileAnalysis | undefined;
  loading: boolean;
}) {
  return (
    <section className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-5 animate-in fade-in zoom-in-95 duration-700">
      <StatTile
        label="Profile strength"
        value={profile ? `${Math.round(profile.profile_strength_score)}%` : "0%"}
        icon={TrendingUp}
        loading={loading}
      />
      <StatTile label="Skills" value={profile?.skill_count ?? 0} icon={Target} loading={loading} />
      <StatTile
        label="Projects"
        value={profile?.project_count ?? 0}
        icon={Rocket}
        accent="accent"
        loading={loading}
      />
      <StatTile
        label="Internships"
        value={profile?.internship_count ?? 0}
        icon={Briefcase}
        accent="success"
        loading={loading}
      />
      <StatTile
        label="Certifications"
        value={profile?.certification_count ?? 0}
        icon={Award}
        accent="warning"
        loading={loading}
      />
    </section>
  );
}

export function ProfileEvidencePanel({
  profile,
  loading,
}: {
  profile: ProfileAnalysis | undefined;
  loading: boolean;
}) {
  if (loading) {
    return <Skeleton className="mt-6 h-48 rounded-xl" />;
  }

  if (!profile) return null;

  const details = [
    ["Name", profile.full_name],
    ["Email", profile.email],
    ["Phone", profile.phone],
    ["Roll no.", profile.roll_number],
    ["Department", profile.department],
    ["Graduation", profile.graduation_year],
    ["CGPA", profile.cgpa],
    ["LinkedIn", profile.linkedin_url],
    ["GitHub", profile.github_url],
    ["Resume", profile.active_resume_filename ?? "Not uploaded"],
    ["Parsed text", `${profile.resume_text_char_count} chars`],
  ].filter(([, value]) => value !== null && value !== undefined && value !== "");

  return (
    <section className="mt-6 rounded-xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <UserRound className="h-4 w-4 text-primary" />
            <span className="label-eyebrow">Current backend profile</span>
          </div>
          <h2 className="mt-1 font-display text-lg font-semibold tracking-tight">
            This profile was built from the uploaded resume.
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Parsed resume details are stored as backend student evidence, then used for readiness
            scoring, gaps, and recommendations.
          </p>
        </div>
        <Badge variant="secondary" className="w-fit px-3 py-1 font-bold">
          Student ID #{profile.student_id}
        </Badge>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {details.map(([label, value]) => (
          <div key={label} className="rounded-lg border border-border bg-secondary/20 p-3">
            <div className="field-label">{label}</div>
            <div className="mt-1 truncate text-sm font-semibold text-foreground">
              {String(value)}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <ProfileList title="Skills considered" items={profile.normalized_skills} tone="info" />
        <ProfileList title="Strengths" items={profile.strengths} tone="success" />
        <ProfileList title="Risks to improve" items={profile.risks} tone="warning" />
      </div>
    </section>
  );
}

function ProfileList({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "success" | "warning" | "info";
}) {
  return (
    <div>
      <div className="field-label mb-2">{title}</div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No records yet.</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {items.slice(0, 14).map((item) => (
            <Badge
              key={item}
              variant="outline"
              className={cn(
                "bg-secondary/30 font-medium",
                tone === "success" && "border-success/25 text-success",
                tone === "warning" && "border-warning/25 text-warning",
                tone === "info" && "border-info/25 text-info",
              )}
            >
              {item}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

export function ReadinessScorePanel({
  match,
  report,
  loading,
  downloading,
  downloadSuccess,
  downloadError,
  onDownload,
}: {
  match: CompanyEligibilityMatch | undefined;
  report: ReadinessReportResponse | undefined;
  loading: boolean;
  downloading: boolean;
  downloadSuccess: string | null;
  downloadError: string | null;
  onDownload: () => void;
}) {
  const score = report?.readiness_score ?? match?.readiness_score ?? 0;
  const label = report?.readiness_label ?? match?.readiness_label ?? "pending";
  const circumference = 2 * Math.PI * 52;
  const dash = (Math.min(Math.max(score, 0), 100) / 100) * circumference;

  return (
    <section className="rounded-xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <span className="label-eyebrow">Placement readiness</span>
          <h2 className="font-display text-lg font-semibold tracking-tight">
            {match
              ? `${Math.round(score)}% ready for ${match.company_name}`
              : "Select a company to view readiness"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Score combines skills, projects, internships, certifications, CGPA, and resume status.
          </p>
        </div>
        <Button className="gap-2 font-bold" disabled={!match || downloading} onClick={onDownload}>
          {downloading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Download report
        </Button>
      </div>
      {downloadSuccess && (
        <Alert className="mt-4 border-success/30 bg-success/5 text-success">
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>Report ready</AlertTitle>
          <AlertDescription>{downloadSuccess}</AlertDescription>
        </Alert>
      )}
      {downloadError && (
        <Alert variant="destructive" className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Report download failed</AlertTitle>
          <AlertDescription>{downloadError}</AlertDescription>
        </Alert>
      )}

      <div className="mt-5 grid gap-5 lg:grid-cols-[180px_1fr]">
        <div className="grid place-items-center">
          {loading ? (
            <Skeleton className="h-36 w-36 rounded-full" />
          ) : (
            <div className="relative h-36 w-36">
              <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="52"
                  fill="none"
                  stroke="var(--secondary)"
                  strokeWidth="12"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="52"
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={`${dash} ${circumference}`}
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute inset-0 grid place-items-center text-center">
                <div>
                  <div className="font-display text-3xl font-bold tabular-nums">
                    {Math.round(score)}%
                  </div>
                  <div className="mt-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    {label}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-foreground">Readiness progression</span>
              <span className="font-mono text-muted-foreground">{Math.round(score)} / 100</span>
            </div>
            <Progress value={score} className="mt-2 h-3 bg-secondary" />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <MiniSignal
              label="Matched skills"
              value={match?.matched_skills.length ?? 0}
              tone="success"
            />
            <MiniSignal
              label="Missing skills"
              value={match?.missing_skills.length ?? 0}
              tone="warning"
            />
            <MiniSignal
              label="Eligibility"
              value={match?.eligible ? "Likely" : "Build"}
              tone={match?.eligible ? "success" : "warning"}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

export function CompanySelectorPanel({
  matches,
  selectedCompany,
  loading,
  onSelect,
}: {
  matches: CompanyEligibilityMatch[];
  selectedCompany: string | null;
  loading: boolean;
  onSelect: (company: string) => void;
}) {
  return (
    <section className="mt-6 rounded-xl border border-border bg-surface p-5 shadow-sm">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)] lg:items-end">
        <div>
          <span className="label-eyebrow">Company selection</span>
          <h2 className="font-display text-lg font-semibold tracking-tight">
            Choose one company from your resume-matched list
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            The cards below are still ranked by resume fit. Select a company here to open the
            detailed readiness, gaps, roadmap, and downloadable report.
          </p>
        </div>
        {loading ? (
          <Skeleton className="h-10 rounded-md" />
        ) : (
          <Select value={selectedCompany ?? ""} onValueChange={onSelect}>
            <SelectTrigger className="h-11 bg-background font-semibold">
              <SelectValue placeholder="Select company for detailed analysis" />
            </SelectTrigger>
            <SelectContent>
              {matches.map((match) => (
                <SelectItem
                  key={`${match.company_id ?? match.company_name}-${match.company_name}`}
                  value={match.company_name}
                >
                  {match.company_name} - {Math.round(match.readiness_score)}%
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    </section>
  );
}

function MiniSignal({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone: "success" | "warning";
}) {
  return (
    <div className="rounded-lg border border-border bg-secondary/30 p-3">
      <div className="field-label">{label}</div>
      <div
        className={cn(
          "mt-1 font-display text-xl font-semibold",
          tone === "success" ? "text-success" : "text-warning",
        )}
      >
        {value}
      </div>
    </div>
  );
}

export function CompanyEligibilityCards({
  matches,
  selectedCompany,
  loading,
  onSelect,
}: {
  matches: CompanyEligibilityMatch[];
  selectedCompany: string | null;
  loading: boolean;
  onSelect: (company: string) => void;
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-40 rounded-xl" />
        ))}
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <EmptyState
        title="No company matches yet"
        description="Add student skills and ensure company intelligence records are available in Supabase."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {matches.slice(0, 9).map((match) => {
        const active = selectedCompany === match.company_name;
        return (
          <button
            key={`${match.company_id ?? match.company_name}-${match.company_name}`}
            type="button"
            onClick={() => onSelect(match.company_name)}
            className={cn(
              "group rounded-xl border bg-surface p-4 text-left shadow-sm transition-all duration-300",
              "hover:-translate-y-1 hover:border-accent/40 hover:shadow-xl hover:shadow-accent/5 active:scale-[0.99]",
              active ? "border-accent ring-2 ring-accent/10" : "border-border",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate font-display text-base font-semibold tracking-tight group-hover:text-accent">
                  {match.company_name}
                </h3>
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                  {match.summary}
                </p>
              </div>
              {match.eligible ? (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
              ) : (
                <XCircle className="h-5 w-5 shrink-0 text-warning" />
              )}
            </div>
            <div className="mt-4 flex items-center gap-3">
              <div className="font-display text-3xl font-bold tabular-nums">
                {Math.round(match.readiness_score)}
              </div>
              <div className="min-w-0 flex-1">
                <Progress value={match.readiness_score} className="h-2" />
                <div className="mt-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  <span>{match.readiness_label}</span>
                  <span>{match.eligible ? "eligible" : "needs work"}</span>
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export function SkillGapPanel({
  gap,
  loading,
}: {
  gap: SkillGapResponse | undefined;
  loading: boolean;
}) {
  return (
    <section className="rounded-xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <Target className="h-4 w-4 text-accent" />
        <h2 className="font-display text-lg font-semibold tracking-tight">Skill gap analysis</h2>
      </div>
      {loading ? (
        <div className="mt-5 space-y-3">
          <Skeleton className="h-5 rounded-md" />
          <Skeleton className="h-5 rounded-md" />
          <Skeleton className="h-5 rounded-md" />
        </div>
      ) : !gap ? (
        <p className="mt-4 text-sm text-muted-foreground">Select a company to inspect gaps.</p>
      ) : (
        <div className="mt-5 space-y-5">
          <p className="text-sm text-muted-foreground">{gap.summary}</p>
          <GapBar
            label="Matched skills"
            count={gap.matched_skills.length}
            total={gap.required_skills.length}
            tone="success"
          />
          <GapBar
            label="Missing skills"
            count={gap.missing_skills.length}
            total={gap.required_skills.length}
            tone="warning"
          />
          <GapBar
            label="Project evidence gaps"
            count={gap.project_gaps.length}
            total={Math.max(gap.matched_skills.length, 1)}
            tone="info"
          />
          <SkillChips label="Missing skills" values={gap.missing_skills} tone="warning" />
          <SkillChips label="Matched skills" values={gap.matched_skills} tone="success" />
        </div>
      )}
    </section>
  );
}

function GapBar({
  label,
  count,
  total,
  tone,
}: {
  label: string;
  count: number;
  total: number;
  tone: "success" | "warning" | "info";
}) {
  const value = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-bold">{label}</span>
        <span className="font-mono text-muted-foreground">
          {count}/{total}
        </span>
      </div>
      <Progress
        value={value}
        className={cn(
          "h-2",
          tone === "success" && "[&>div]:bg-success",
          tone === "warning" && "[&>div]:bg-warning",
          tone === "info" && "[&>div]:bg-info",
        )}
      />
    </div>
  );
}

function SkillChips({
  label,
  values,
  tone,
}: {
  label: string;
  values: string[];
  tone: "success" | "warning";
}) {
  if (values.length === 0) return null;
  return (
    <div>
      <div className="field-label mb-2">{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {values.slice(0, 12).map((skill) => (
          <Badge
            key={skill}
            variant="outline"
            className={cn(
              "bg-secondary/30 font-medium",
              tone === "success"
                ? "border-success/25 text-success"
                : "border-warning/25 text-warning",
            )}
          >
            {skill}
          </Badge>
        ))}
      </div>
    </div>
  );
}

export function RoadmapPanel({
  roadmap,
  loading,
}: {
  roadmap: RoadmapResponse | undefined;
  loading: boolean;
}) {
  return (
    <section className="rounded-xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <GraduationCap className="h-4 w-4 text-primary" />
        <h2 className="font-display text-lg font-semibold tracking-tight">Personalized roadmap</h2>
      </div>
      {loading ? (
        <div className="mt-5 space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : !roadmap ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Select a company to generate a roadmap.
        </p>
      ) : (
        <div className="mt-5 space-y-3">
          {roadmap.roadmap.map((item) => (
            <div
              key={`${item.week}-${item.title}`}
              className="rounded-lg border border-border bg-secondary/20 p-4"
            >
              <div className="flex items-start gap-3">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
                  {item.week}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display text-sm font-semibold">{item.title}</h3>
                    <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">
                      {item.priority}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>
                  {item.target_skills.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {item.target_skills.map((skill) => (
                        <Badge key={skill} variant="outline" className="text-[10px]">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function ResumeUploadPanel({
  uploaded,
  uploading,
  error,
  success,
  onUpload,
}: {
  uploaded: boolean;
  uploading: boolean;
  error: string | null;
  success: string | null;
  onUpload: (file: File) => void;
}) {
  return (
    <section className="rounded-xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="label-eyebrow">Resume intelligence</span>
          <h2 className="font-display text-lg font-semibold tracking-tight">
            {uploaded ? "Resume uploaded" : "Upload your resume"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            PDF, DOC, DOCX, or TXT. The backend stores the file securely and marks it active.
          </p>
        </div>
        <div
          className={cn(
            "grid h-10 w-10 shrink-0 place-items-center rounded-lg",
            uploaded ? "bg-success/10 text-success" : "bg-secondary text-primary",
          )}
        >
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <FileUp className="h-5 w-5" />
          )}
        </div>
      </div>
      {error && (
        <Alert variant="destructive" className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Upload failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert className="mt-4 border-success/30 bg-success/5 text-success">
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>Resume saved</AlertTitle>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}
      <ResumeDropZone uploading={uploading} onUpload={onUpload} />
    </section>
  );
}

function ResumeDropZone({
  uploading,
  onUpload,
}: {
  uploading: boolean;
  onUpload: (file: File) => void;
}) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) onUpload(file);
    event.target.value = "";
  };

  return (
    <label className="mt-5 flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-secondary/20 px-4 py-8 text-sm font-bold transition-colors hover:bg-secondary/40">
      <FileUp className="h-4 w-4" />
      {uploading ? "Analyzing resume..." : "Choose resume file"}
      <input
        type="file"
        accept=".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
        className="sr-only"
        disabled={uploading}
        onChange={handleChange}
      />
    </label>
  );
}

export function RecommendationsPanel({
  report,
  gap,
}: {
  report: ReadinessReportResponse | undefined;
  gap: SkillGapResponse | undefined;
}) {
  const fallback = gap?.missing_skills.slice(0, 5).map((skill) => ({
    title: `Build ${skill}`,
    description: "Add proof through a focused project, certification, or interview practice set.",
    target_skills: [skill],
    priority: "high",
    category: "skill_gap",
  }));
  const recommendations = report?.recommendations ?? fallback ?? [];

  return (
    <section className="rounded-xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <Award className="h-4 w-4 text-warning" />
        <h2 className="font-display text-lg font-semibold tracking-tight">
          Recommended skills, projects, certifications
        </h2>
      </div>
      {recommendations.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Generate a report or select a company to see recommendations.
        </p>
      ) : (
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {recommendations.map((item) => (
            <div
              key={`${item.category}-${item.title}`}
              className="rounded-lg border border-border bg-secondary/20 p-4"
            >
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">
                  {item.priority}
                </Badge>
                <span className="field-label">{item.category.replace(/_/g, " ")}</span>
              </div>
              <h3 className="mt-2 font-display text-sm font-semibold">{item.title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function CareerAnalyticsPanel({
  matches,
  gap,
}: {
  matches: CompanyEligibilityMatch[];
  gap: SkillGapResponse | undefined;
}) {
  const distribution = [
    { name: "High", value: matches.filter((m) => m.readiness_score >= 80).length },
    {
      name: "Moderate",
      value: matches.filter((m) => m.readiness_score >= 60 && m.readiness_score < 80).length,
    },
    {
      name: "Developing",
      value: matches.filter((m) => m.readiness_score >= 40 && m.readiness_score < 60).length,
    },
    { name: "Early", value: matches.filter((m) => m.readiness_score < 40).length },
  ].filter((item) => item.value > 0);

  const bars = [
    { label: "Required", count: gap?.required_skills.length ?? 0 },
    { label: "Matched", count: gap?.matched_skills.length ?? 0 },
    { label: "Missing", count: gap?.missing_skills.length ?? 0 },
    { label: "Project gaps", count: gap?.project_gaps.length ?? 0 },
  ];

  return (
    <section className="rounded-xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-accent" />
        <h2 className="font-display text-lg font-semibold tracking-tight">
          Analytics and progress
        </h2>
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div className="h-64 rounded-lg border border-border bg-secondary/10 p-3">
          {distribution.length === 0 ? (
            <div className="grid h-full place-items-center text-sm text-muted-foreground">
              No readiness distribution yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={distribution}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={54}
                  outerRadius={86}
                  paddingAngle={3}
                >
                  {distribution.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="h-64 rounded-lg border border-border bg-secondary/10 p-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={bars} margin={{ left: 0, right: 8, top: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="label"
                stroke="var(--muted-foreground)"
                fontSize={11}
                tickLine={false}
              />
              <YAxis
                stroke="var(--muted-foreground)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                cursor={{ fill: "var(--secondary)" }}
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {bars.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}

export function CareerErrorState({ message }: { message: string }) {
  return (
    <Alert variant="destructive" className="mt-6">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Career dashboard could not load</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
