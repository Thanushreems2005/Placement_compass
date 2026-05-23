import type { ChangeEvent } from "react";
import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  Download,
  FileSearch,
  FileUp,
  Layers,
  Loader2,
  Target,
  Wand2,
  XCircle,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ResumeOptimizerAnalysis } from "@/services/resumeOptimizerService";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatTile } from "@/components/StatTile";
import { cn } from "@/lib/utils";

const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

const DEFAULT_RESUME_ROLES = [
  "Full Stack Developer",
  "Frontend Developer",
  "Backend Developer",
  "Data Analyst",
  "AI/ML Intern",
  "Cloud Engineer",
  "DevOps Engineer",
  "Cybersecurity Analyst",
  "UI/UX Designer",
  "Custom Role",
];

export function ResumeOptimizerUploadPanel({
  loading,
  error,
  onUpload,
}: {
  loading: boolean;
  error: string | null;
  onUpload: (file: File) => void;
}) {
  return (
    <section className="rounded-xl border border-border bg-surface p-6 shadow-xl shadow-primary/5 animate-in fade-in zoom-in-95 duration-500">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <span className="label-eyebrow">Resume ATS Optimizer</span>
          <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            Score and improve your resume before applying
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            Upload a PDF, DOCX, or TXT resume to inspect ATS readability, section completeness, role
            keywords, bullet impact, and concrete improvement actions.
          </p>
        </div>
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-secondary text-primary">
          {loading ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            <FileSearch className="h-6 w-6" />
          )}
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mt-5">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Analysis failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <ResumeUploadDropZone loading={loading} onUpload={onUpload} />

      <div className="mt-5 grid gap-3 md:grid-cols-4">
        {["ATS score", "Role fit", "Missing keywords", "Rewrite actions"].map((item) => (
          <div key={item} className="rounded-lg border border-border bg-secondary/20 p-3">
            <div className="field-label">Checks</div>
            <div className="mt-1 text-sm font-semibold">{item}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ResumeUploadDropZone({
  loading,
  onUpload,
}: {
  loading: boolean;
  onUpload: (file: File) => void;
}) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) onUpload(file);
    event.target.value = "";
  };

  return (
    <label className="mt-5 flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-secondary/20 px-4 py-9 text-sm font-bold transition-colors hover:bg-secondary/40">
      <FileUp className="h-4 w-4" />
      {loading ? "Analyzing resume..." : "Choose resume file"}
      <input
        type="file"
        accept=".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
        className="sr-only"
        disabled={loading}
        onChange={handleChange}
      />
    </label>
  );
}

export function ResumeOptimizerOverview({
  analysis,
  loading,
  downloadStatus,
  downloadError,
  onDownload,
}: {
  analysis: ResumeOptimizerAnalysis | null;
  loading: boolean;
  downloadStatus: string | null;
  downloadError: string | null;
  onDownload: () => void;
}) {
  if (loading) {
    return (
      <section className="mt-6 grid gap-4 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-28 rounded-xl" />
        ))}
      </section>
    );
  }

  if (!analysis) return null;

  return (
    <>
      <section className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-5 animate-in fade-in zoom-in-95 duration-700">
        <StatTile label="ATS score" value={`${Math.round(analysis.ats_score)}%`} icon={Target} />
        <StatTile label="Skills" value={analysis.extracted_skills.length} icon={Layers} />
        <StatTile
          label="Projects"
          value={analysis.extracted_projects.length}
          icon={FileSearch}
          accent="accent"
        />
        <StatTile
          label="Missing keywords"
          value={analysis.missing_keywords.length}
          icon={XCircle}
          accent="warning"
        />
        <StatTile
          label="Strong bullets"
          value={analysis.strong_bullets.length}
          icon={CheckCircle2}
          accent="success"
        />
      </section>

      <section className="mt-6 rounded-xl border border-border bg-surface p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <span className="label-eyebrow">Resume quality</span>
            <h2 className="font-display text-xl font-semibold tracking-tight">
              {Math.round(analysis.ats_score)}% ATS score · {analysis.ats_label}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {analysis.extracted_name} · {analysis.filename} · {analysis.text_char_count} parsed
              characters
            </p>
          </div>
          <Button className="gap-2 font-bold" onClick={onDownload}>
            <Download className="h-4 w-4" />
            Download improvement report
          </Button>
        </div>
        {downloadStatus && (
          <Alert className="mt-4 border-success/30 bg-success/5 text-success">
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>Report downloaded</AlertTitle>
            <AlertDescription>{downloadStatus}</AlertDescription>
          </Alert>
        )}
        {downloadError && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Download failed</AlertTitle>
            <AlertDescription>{downloadError}</AlertDescription>
          </Alert>
        )}
        <Progress value={analysis.ats_score} className="mt-5 h-3 bg-secondary" />
      </section>
    </>
  );
}

export function TargetRolePanel({
  selectedRole,
  customRole,
  loading,
  onRoleChange,
  onCustomRoleChange,
  onApplyCustomRole,
}: {
  selectedRole: string;
  customRole: string;
  loading: boolean;
  onRoleChange: (role: string) => void;
  onCustomRoleChange: (role: string) => void;
  onApplyCustomRole: () => void;
}) {
  return (
    <section className="mt-6 rounded-xl border border-border bg-surface p-5 shadow-sm">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)] lg:items-end">
        <div>
          <span className="label-eyebrow">Target role optimizer</span>
          <h2 className="font-display text-lg font-semibold tracking-tight">
            Choose the role you want this resume checked against
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Missing keywords and rewrite suggestions become specific to the selected target role.
          </p>
        </div>
        <div className="space-y-2">
          <Select value={selectedRole} onValueChange={onRoleChange} disabled={loading}>
            <SelectTrigger className="h-11 bg-background font-semibold">
              <SelectValue placeholder="Select target role" />
            </SelectTrigger>
            <SelectContent>
              {DEFAULT_RESUME_ROLES.map((role) => (
                <SelectItem key={role} value={role}>
                  {role}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedRole === "Custom Role" && (
            <div className="flex gap-2">
              <Input
                value={customRole}
                placeholder="Example: Cloud Security Intern"
                onChange={(event) => onCustomRoleChange(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && onApplyCustomRole()}
              />
              <Button disabled={loading || !customRole.trim()} onClick={onApplyCustomRole}>
                Apply
              </Button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export function ResumeProfilePanel({ analysis }: { analysis: ResumeOptimizerAnalysis | null }) {
  if (!analysis) return null;
  const details = [
    ["Name", analysis.extracted_name],
    ["Email", analysis.extracted_email],
    ["Phone", analysis.extracted_phone],
    ["Links", analysis.detected_links.join(", ")],
    ["Sections found", analysis.parsed_sections.join(", ")],
    ["Missing sections", analysis.missing_sections.join(", ") || "None"],
  ].filter(([, value]) => value);

  return (
    <section className="mt-6 rounded-xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <FileSearch className="h-4 w-4 text-primary" />
        <h2 className="font-display text-lg font-semibold tracking-tight">Parsed resume profile</h2>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {details.map(([label, value]) => (
          <div key={label} className="rounded-lg border border-border bg-secondary/20 p-3">
            <div className="field-label">{label}</div>
            <div className="mt-1 truncate text-sm font-semibold">{value}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function ResumeScoreBreakdownPanel({
  analysis,
}: {
  analysis: ResumeOptimizerAnalysis | null;
}) {
  if (!analysis) return null;

  return (
    <section className="rounded-xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-accent" />
        <h2 className="font-display text-lg font-semibold tracking-tight">Score breakdown</h2>
      </div>
      <div className="mt-5 space-y-4">
        {analysis.score_breakdown.map((item) => {
          const value = (item.score / item.max_score) * 100;
          return (
            <div key={item.category}>
              <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                <span className="font-bold">{item.category}</span>
                <span className="font-mono text-muted-foreground">
                  {Math.round(item.score)} / {item.max_score}
                </span>
              </div>
              <Progress value={value} className="h-2" />
              <p className="mt-1 text-xs text-muted-foreground">{item.summary}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function RoleCompatibilityPanel({ analysis }: { analysis: ResumeOptimizerAnalysis | null }) {
  if (!analysis) return null;
  const chartData = analysis.role_compatibility.map((role) => ({
    role: role.role.replace(" Developer", "").replace(" Intern", ""),
    score: role.score,
  }));

  return (
    <section className="rounded-xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <Target className="h-4 w-4 text-primary" />
        <h2 className="font-display text-lg font-semibold tracking-tight">
          Role-wise compatibility
        </h2>
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-[240px_1fr]">
        <div className="h-60 rounded-lg border border-border bg-secondary/10 p-3">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={chartData}>
              <PolarGrid stroke="var(--border)" />
              <PolarAngleAxis
                dataKey="role"
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              />
              <Radar
                dataKey="score"
                stroke="var(--accent)"
                fill="var(--accent)"
                fillOpacity={0.22}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        <div className="space-y-3">
          {analysis.role_compatibility.map((role) => (
            <div key={role.role} className="rounded-lg border border-border bg-secondary/20 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="font-display text-sm font-semibold">{role.role}</div>
                <Badge variant="secondary" className="font-bold">
                  {Math.round(role.score)}%
                </Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{role.summary}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {role.missing_keywords.slice(0, 6).map((keyword) => (
                  <Badge key={keyword} variant="outline" className="border-warning/25 text-warning">
                    {keyword}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ResumeKeywordAnalyticsPanel({
  analysis,
}: {
  analysis: ResumeOptimizerAnalysis | null;
}) {
  if (!analysis) return null;
  const bars = Object.entries(analysis.keyword_density).map(([keyword, count]) => ({
    keyword,
    count,
  }));

  return (
    <section className="rounded-xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <Layers className="h-4 w-4 text-accent" />
        <h2 className="font-display text-lg font-semibold tracking-tight">
          Keywords and missing signals
        </h2>
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div className="h-64 rounded-lg border border-border bg-secondary/10 p-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={bars} margin={{ left: 0, right: 8, top: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="keyword"
                stroke="var(--muted-foreground)"
                fontSize={10}
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
        <div>
          <div className="field-label mb-2">Missing keywords for {analysis.selected_role}</div>
          <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
            The chart counts keywords already found in your resume. The chips below are expected for
            the selected target role but not detected strongly enough in the parsed resume text.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {analysis.target_role_missing_keywords.slice(0, 18).map((keyword) => (
              <Badge key={keyword} variant="outline" className="border-warning/25 text-warning">
                {keyword}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function ResumeSuggestionsPanel({ analysis }: { analysis: ResumeOptimizerAnalysis | null }) {
  if (!analysis) return null;

  return (
    <section className="rounded-xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <Wand2 className="h-4 w-4 text-warning" />
        <h2 className="font-display text-lg font-semibold tracking-tight">
          Resume improvement suggestions
        </h2>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {analysis.suggestions.map((item) => (
          <div
            key={`${item.category}-${item.title}`}
            className="rounded-lg border border-border bg-secondary/20 p-4"
          >
            <div className="flex items-center gap-2">
              <Badge
                variant="secondary"
                className={cn(
                  "text-[10px] uppercase tracking-wider",
                  item.priority === "high" && "bg-warning/10 text-warning",
                  item.priority === "medium" && "bg-accent/10 text-accent",
                )}
              >
                {item.priority}
              </Badge>
              <span className="field-label">{item.category.replace(/_/g, " ")}</span>
            </div>
            <h3 className="mt-2 font-display text-sm font-semibold">{item.title}</h3>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.description}</p>
            {item.examples.length > 0 && (
              <p className="mt-2 rounded-md bg-background/70 p-2 text-xs text-muted-foreground">
                {item.examples[0]}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

export function BulletQualityPanel({ analysis }: { analysis: ResumeOptimizerAnalysis | null }) {
  if (!analysis) return null;

  return (
    <section className="rounded-xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4 text-success" />
        <h2 className="font-display text-lg font-semibold tracking-tight">Bullet quality</h2>
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <BulletList title="Strong bullets" items={analysis.strong_bullets} tone="success" />
        <RewriteList rewrites={analysis.bullet_rewrites} />
      </div>
    </section>
  );
}

function RewriteList({ rewrites }: { rewrites: ResumeOptimizerAnalysis["bullet_rewrites"] }) {
  return (
    <div>
      <div className="field-label mb-2">Rewrite suggestions</div>
      {rewrites.length === 0 ? (
        <p className="text-sm text-muted-foreground">No weak bullets detected.</p>
      ) : (
        <div className="space-y-3">
          {rewrites.slice(0, 5).map((item) => (
            <div
              key={item.original}
              className="rounded-lg border border-warning/20 bg-secondary/20 p-3"
            >
              <div className="field-label text-warning">Original</div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.original}</p>
              <div className="field-label mt-3 text-success">Rewrite</div>
              <p className="mt-1 text-xs leading-relaxed font-medium">{item.rewritten}</p>
              <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                {item.reason}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BulletList({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "success" | "warning";
}) {
  return (
    <div>
      <div className="field-label mb-2">{title}</div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No bullets detected.</p>
      ) : (
        <div className="space-y-2">
          {items.slice(0, 5).map((item) => (
            <div
              key={item}
              className={cn(
                "rounded-lg border bg-secondary/20 p-3 text-xs leading-relaxed",
                tone === "success" ? "border-success/20" : "border-warning/20",
              )}
            >
              {item}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
