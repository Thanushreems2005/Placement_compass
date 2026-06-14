import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect, useRef } from 'react';
import { FlaskConical, ListChecks, Activity, Search, Github, Clock, Trophy, ChevronRight, CheckCircle2, Download, Trash2, ShieldCheck, X, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

function getIssueUrl(mission: any): string {
  if (!mission) return "";
  const issueNum = mission.issue_number || mission.number;
  const repoParts = (mission.repo_name || "").split("/");
  const owner = mission.owner || repoParts[0] || "";
  const repo = mission.repo || repoParts[1] || "";
  
  if (owner && repo && issueNum) {
    return `https://github.com/${owner}/${repo}/issues/${issueNum}`;
  }
  return mission.html_url || ""; // fallback
}

function getCurrentUserId(): string {
  try {
    const localData = localStorage.getItem("sb-key-auth-token") || localStorage.getItem("supabase.auth.token");
    if (localData) {
      const parsed = JSON.parse(localData);
      const userId = parsed?.user?.id || parsed?.currentSession?.user?.id;
      if (userId) return userId;
    }
  } catch (e) {
    console.error("Error reading auth token", e);
  }
  return "d3b07384-d113-4ec6-a5ee-8d2347dffb0e";
}

export const Route = createFileRoute('/missionx')({
  component: MissionX
});

function MissionX() {
  const [activeTab, setActiveTab] = useState<'board' | 'active'>('board');
  const [acceptedMissions, setAcceptedMissions] = useState<any[]>([]);
  const [portfolio, setPortfolio] = useState<any>(null);
  const [portfolioLoading, setPortfolioLoading] = useState(false);

  async function loadPortfolio() {
    setPortfolioLoading(true);
    try {
      const userId = getCurrentUserId();
      const res = await fetch(`/api/v1/portfolio/${userId}`);
      const data = await res.json();
      setPortfolio(data);
    } catch (e) {
      console.error("Portfolio load failed", e);
    } finally {
      setPortfolioLoading(false);
    }
  }

  // Count only non-completed for the "active" badge
  const activeMissions = acceptedMissions.filter(m => m.status !== "completed");

  const handleDecline = (missionId: string) => {
    setAcceptedMissions(prev => prev.filter(m => m.id !== missionId));
  };

  async function markMissionCompleted(
    mission: any,
    prUrl: string, 
    verifyData: any
  ) {
    const missionId = mission.id;
    // Update local state immediately
    setAcceptedMissions(prev => prev.map(m => 
      m.id === missionId 
        ? { ...m, status: "completed", pr_url: prUrl, completed_at: new Date().toISOString() }
        : m
    ));

    // Persist to backend → Supabase
    try {
      const repoParts = (mission.repo_name || "").split("/");
      const owner = mission.owner || repoParts[0] || "";
      const repo = mission.repo || repoParts[1] || "";
      const issue_number = mission.issue_number || mission.number || 0;

      await fetch("/api/v1/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: getCurrentUserId(),
          mission_id: missionId,
          mission_title: mission.title,
          owner: owner,
          repo: repo,
          repo_full_name: mission.repo_name || `${owner}/${repo}`,
          issue_number: issue_number,
          pr_url: prUrl,
          pr_number: verifyData.pr_number,
          pr_title: verifyData.pr_title,
          difficulty: mission.difficulty,
          xp: mission.xp,
          company_name: mission.company_name || mission.company || "",
          skills: mission.skills || [],
          status: "completed",
          completed_at: new Date().toISOString(),
        })
      });
      // Reload portfolio data
      loadPortfolio();
    } catch (e) {
      console.error("Failed to save submission:", e);
    }
  }


  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50/50">
      <div className="border-b bg-white px-8 pt-8">
        <h2 className="text-3xl font-bold tracking-tight font-display flex items-center gap-3 text-slate-900 mb-6">
          <FlaskConical className="w-8 h-8 text-primary" />
          MissionX Labs
        </h2>
        
        <div className="flex gap-6 -mb-px">
          <TabButton 
            active={activeTab === 'board'} 
            onClick={() => setActiveTab('board')} 
            icon={<FlaskConical className="w-4 h-4" />}
            label="Mission Board" 
          />
          <TabButton 
            active={activeTab === 'active'} 
            onClick={() => setActiveTab('active')} 
            icon={<ListChecks className="w-4 h-4" />}
            label={`Active Missions (${activeMissions.length})`} 
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto relative">
        {activeTab === 'board' && (
          <div className="p-8 h-full">
            <MissionBoardTab 
              acceptedMissions={acceptedMissions} 
              setAcceptedMissions={setAcceptedMissions} 
              onDecline={handleDecline}
            />
          </div>
        )}
        {activeTab === 'active' && (
          <div className="p-8 h-full">
            <ActiveMissionsTab 
              acceptedMissions={acceptedMissions} 
              onDecline={handleDecline}
              onComplete={markMissionCompleted}
            />
          </div>
        )}
        {(activeTab as any) === 'portfolio' && (
          <div className="p-6">
            
            {portfolioLoading && (
              <div className="space-y-4">
                {/* Skeleton stat cards */}
                <div className="grid grid-cols-4 gap-4">
                  {Array(4).fill(0).map((_, i) => (
                    <div key={i} className="border rounded-lg p-4 animate-pulse">
                      <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"/>
                      <div className="h-3 bg-gray-200 rounded w-3/4"/>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!portfolioLoading && portfolio && (
              <>
                {/* ── STAT CARDS ── */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  {[
                    { 
                      value: portfolio.stats.total_xp.toLocaleString(), 
                      label: "Total XP", 
                      sub: portfolio.stats.total_xp > 1000 ? "Top 15% in college" : "Keep going!",
                      color: "border-t-amber-400",
                      icon: "🏆"
                    },
                    { 
                      value: portfolio.stats.total_missions, 
                      label: "Missions Completed", 
                      sub: "Real OSS contributions",
                      color: "border-t-blue-400",
                      icon: "🎯"
                    },
                    { 
                      value: portfolio.stats.merged_prs, 
                      label: "PRs Merged", 
                      sub: "Accepted by maintainers",
                      color: "border-t-green-400",
                      icon: "✅"
                    },
                    { 
                      value: portfolio.stats.badges_count, 
                      label: "Company Badges", 
                      sub: "Readiness proven",
                      color: "border-t-purple-400",
                      icon: "🏅"
                    },
                  ].map((stat, i) => (
                    <div key={i} className={`border-t-4 ${stat.color} rounded-lg p-4 bg-white shadow-sm`}>
                      <div className="text-3xl font-bold text-gray-900 mb-1">
                        {stat.icon} {stat.value}
                      </div>
                      <div className="text-sm font-medium text-gray-700">{stat.label}</div>
                      <div className="text-xs text-muted-foreground mt-1">{stat.sub}</div>
                    </div>
                  ))}
                </div>

                {/* ── EMPTY STATE ── */}
                {portfolio.contributions.length === 0 && (
                  <div className="text-center py-16 border-2 border-dashed rounded-xl bg-white shadow-sm">
                    <div className="text-5xl mb-4">🚀</div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">
                      No contributions yet
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Accept a mission, fix a real GitHub issue, submit your PR, and it will appear here.
                    </p>
                    <button
                      onClick={() => setActiveTab("board")}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium shadow-sm hover:bg-blue-700 transition-colors"
                    >
                      Browse Missions →
                    </button>
                  </div>
                )}

                {portfolio.contributions.length > 0 && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* ── LEFT COLUMN: Contributions Timeline ── */}
                    <div className="lg:col-span-2">
                      <h2 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <span>🔗</span> Verified Contributions
                        <span className="text-xs font-normal text-muted-foreground">
                          ({portfolio.contributions.length} total)
                        </span>
                      </h2>

                      <div className="relative">
                        {/* Vertical timeline line */}
                        <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200"/>

                        <div className="space-y-4">
                          {portfolio.contributions.map((contrib: any) => (
                            <div key={contrib.id} className="relative flex gap-4">
                              
                              {/* Timeline dot */}
                              <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 border-2 ${
                                contrib.pr_merged 
                                  ? "bg-green-50 border-green-400" 
                                  : contrib.pr_status === "open"
                                  ? "bg-blue-50 border-blue-400"
                                  : "bg-gray-50 border-gray-300"
                              }`}>
                                <img 
                                  src={contrib.owner_avatar_url} 
                                  className="w-6 h-6 rounded-full bg-white object-contain"
                                  alt={contrib.owner}
                                  onError={(e) => { (e.target as HTMLImageElement).src = 'https://github.com/github.png?size=40'; }}
                                />
                              </div>

                              {/* Contribution card */}
                              <div className="flex-1 border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow">
                                
                                {/* Header row */}
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 flex-wrap mb-1">
                                      <span className="text-xs font-medium text-muted-foreground">
                                        {contrib.repo_full_name}
                                      </span>
                                      {/* PR Status pill */}
                                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                        contrib.pr_merged 
                                          ? "bg-purple-100 text-purple-700"
                                          : contrib.pr_status === "open"
                                          ? "bg-blue-100 text-blue-700"
                                          : "bg-gray-100 text-gray-600"
                                      }`}>
                                        {contrib.pr_merged ? "✓ Merged" 
                                         : contrib.pr_status === "open" ? "⏳ Open PR"
                                         : contrib.pr_status}
                                      </span>
                                      {/* Difficulty pill */}
                                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                        contrib.difficulty === "Beginner" ? "bg-green-100 text-green-700"
                                        : contrib.difficulty === "Intermediate" ? "bg-amber-100 text-amber-700"
                                        : "bg-red-100 text-red-700"
                                      }`}>
                                        {contrib.difficulty}
                                      </span>
                                    </div>
                                    <p className="text-sm font-semibold text-gray-900">
                                      {contrib.mission_title}
                                    </p>
                                  </div>
                                  {/* XP badge */}
                                  <span className="text-sm font-bold text-amber-600 ml-3 flex-shrink-0">
                                    +{contrib.xp} XP
                                  </span>
                                </div>

                                {/* PR Link row — the real GitHub link with icon */}
                                {contrib.pr_url && (
                                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100">
                                    <svg className="w-4 h-4 text-gray-500 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                                      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                                    </svg>
                                    
                                    <a
                                      href={contrib.pr_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs text-blue-600 hover:text-blue-800 hover:underline font-mono truncate"
                                    >
                                      {contrib.pr_url.replace("https://github.com/", "")}
                                    </a>
                                    <span className="text-xs text-muted-foreground flex-shrink-0">
                                      PR #{contrib.pr_number}
                                    </span>
                                  </div>
                                )}

                                {/* Score if available */}
                                {contrib.score && (
                                  <div className="mt-2 flex items-center gap-2">
                                    <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                                      <div 
                                        className="bg-blue-500 h-1.5 rounded-full"
                                        style={{ width: `${(contrib.score / 1000) * 100}%` }}
                                      />
                                    </div>
                                    <span className="text-xs text-muted-foreground">
                                      Score: {contrib.score}/1000
                                    </span>
                                  </div>
                                )}

                                {/* Date */}
                                {contrib.completed_at && (
                                  <p className="text-xs text-muted-foreground mt-2">
                                    Completed {new Date(contrib.completed_at).toLocaleDateString("en-IN", {
                                      day: "numeric", month: "short", year: "numeric"
                                    })}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* ── RIGHT COLUMN: Skills + Badges ── */}
                    <div className="space-y-6">

                      {/* Company Badges */}
                      {portfolio.badges.length > 0 && (
                        <div className="border rounded-lg p-4 bg-white shadow-sm">
                          <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                            🏅 Company Badges
                          </h3>
                          <div className="space-y-3">
                            {portfolio.badges.map((badge: any) => (
                              <div key={badge.company} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                                <img 
                                  src={badge.avatar_url} 
                                  className="w-8 h-8 rounded-full border bg-white object-contain"
                                  alt={badge.company}
                                  onError={(e) => { (e.target as HTMLImageElement).src = 'https://github.com/github.png?size=32'; }}
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-800 truncate">
                                    {badge.company}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {badge.missions_count} mission{badge.missions_count > 1 ? "s" : ""} · {badge.total_xp} XP
                                  </p>
                                </div>
                                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium flex-shrink-0">
                                  Earned
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Verified Skills */}
                      {portfolio.verified_skills.length > 0 && (
                        <div className="border rounded-lg p-4 bg-white shadow-sm">
                          <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                            ✅ Verified Skills
                            <span className="text-xs font-normal text-muted-foreground">from real contributions</span>
                          </h3>
                          <div className="flex flex-wrap gap-2">
                            {portfolio.verified_skills.map((s: any) => (
                              <span key={s.skill} className={`text-xs px-3 py-1 rounded-full font-medium flex items-center gap-1 ${
                                s.level === "Advanced" ? "bg-green-100 text-green-700"
                                : s.level === "Intermediate" ? "bg-blue-100 text-blue-700"
                                : "bg-gray-100 text-gray-600"
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${
                                  s.level === "Advanced" ? "bg-green-500"
                                  : s.level === "Intermediate" ? "bg-blue-500"
                                  : "bg-gray-400"
                                }`}/>
                                {s.skill}
                                <span className="opacity-60">({s.level})</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Download PDF button */}
                      <button
                        onClick={() => window.open(`/api/v1/portfolio/${getCurrentUserId()}/pdf`, '_blank')}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors cursor-pointer"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                        </svg>
                        Download Portfolio PDF
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 pb-4 text-sm font-medium border-b-2 transition-colors ${
        active 
          ? "border-primary text-primary" 
          : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function MissionBoardTab({ acceptedMissions, setAcceptedMissions, onDecline }: { acceptedMissions: any[], setAcceptedMissions: any, onDecline: (id: string) => void }) {
  const [missions, setMissions] = useState<any[]>([])
  const [displayCount, setDisplayCount] = useState(16)
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [totalCount, setTotalCount] = useState(0)
  const [drawerIssue, setDrawerIssue] = useState<any | null>(null);

  // On component mount, ALWAYS load default missions
  useEffect(() => {
    loadDefaultMissions()
  }, [])

  async function loadDefaultMissions() {
    setIsLoading(true)
    try {
      const res = await fetch("/api/v1/missions/default")
      const data = await res.json()
      setMissions(data)
      setTotalCount(data.length)
      setDisplayCount(16)
    } catch(e) {
      console.error("Failed to load missions", e)
    } finally {
      setIsLoading(false)
    }
  }

  // When search is cleared, reload defaults immediately
  useEffect(() => {
    if (searchQuery.trim() === "") {
      loadDefaultMissions()
      return
    }
    const timer = setTimeout(async () => {
      setIsLoading(true)
      try {
        const res = await fetch(`/api/v1/missions?company=${encodeURIComponent(searchQuery)}`)
        const data = await res.json()
        setMissions(data)
        setTotalCount(data.length)
        setDisplayCount(16)
      } catch(e) {
        console.error("Search failed", e)
      } finally {
        setIsLoading(false)
      }
    }, 600)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const visibleMissions = missions.slice(0, displayCount)
  const hasMore = displayCount < missions.length

  const handleAcceptMission = (mission: any) => {
    if (!acceptedMissions.find(m => m.id === mission.id)) {
      setAcceptedMissions([{ ...mission, status: "active" }, ...acceptedMissions]);
    }
  };

  return (
    <div className="flex gap-8 h-full relative">
      <div className="w-[75%] flex flex-col gap-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <input
            type="text"
            placeholder="Search missions by company (e.g., amazon, google, netflix), title, or skills..."
            className="w-full pl-10 pr-4 py-3 bg-white border rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        {!isLoading && missions.length > 0 && (
          <p className="text-sm text-slate-500 mb-3">
            {searchQuery.trim() !== "" 
              ? `Found ${missions.length} missions for "${searchQuery}"`
              : `Showing ${missions.length} open missions across top repositories — search to filter by company`
            }
          </p>
        )}

        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array(6).fill(0).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {!isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-8">
            {visibleMissions.map(mission => (
              <MissionCardItem 
                key={mission.id} 
                issue={mission} 
                onAccept={() => handleAcceptMission(mission)}
                isAccepted={acceptedMissions.some(m => m.id === mission.id)}
                isCompleted={acceptedMissions.find(m => m.id === mission.id)?.status === "completed"}
                onViewDetails={() => setDrawerIssue(mission)}
              />
            ))}
          </div>
        )}

        {!isLoading && hasMore && (
          <div className="flex justify-center mt-6 mb-8">
            <button 
              onClick={() => setDisplayCount(prev => prev + 15)}
              className="px-6 py-2 border rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              Load More ({missions.length - displayCount} remaining)
            </button>
          </div>
        )}

        {!isLoading && missions.length === 0 && searchQuery.trim() !== "" && (
          <div className="text-center py-16 text-slate-500 border border-dashed rounded-xl bg-white">
            <FlaskConical className="w-10 h-10 mx-auto mb-3 text-slate-300" />
            No missions found for "{searchQuery}". Try a different company name.
          </div>
        )}
      </div>

      <div className="w-[25%] bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col sticky top-0 h-fit max-h-[calc(100vh-10rem)]">
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
          <ListChecks className="w-5 h-5 text-primary" />
          Active Missions
        </h3>
        
        <div className="flex-1 overflow-y-auto pr-2 flex flex-col gap-3">
          {acceptedMissions.filter(m => m.status !== "completed").length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              You haven't accepted any missions yet. Pick one from the board to get started!
            </div>
          ) : (
            acceptedMissions.filter(m => m.status !== "completed").map(mission => (
              <ActiveMissionSidebarItem key={mission.id} mission={mission} onDecline={() => onDecline(mission.id)} />
            ))
          )}
        </div>
      </div>
      
      {/* Drawer Overlay */}
      {drawerIssue && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" onClick={() => setDrawerIssue(null)}></div>
          <div className="relative w-[600px] max-w-full bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
             <div className="flex items-center justify-between p-6 border-b">
                <h3 className="text-lg font-bold">Mission Details</h3>
                <button onClick={() => setDrawerIssue(null)} className="p-2 rounded-full hover:bg-slate-100"><X className="w-5 h-5" /></button>
             </div>
             
             <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-6">
                <div className="flex items-start gap-4">
                  <img src={`https://github.com/${(drawerIssue.repo_full_name || drawerIssue.repo_name)?.split('/')[0] || drawerIssue.company}.png?size=48`} 
                       alt={drawerIssue.company} 
                       className="w-12 h-12 rounded-lg border border-slate-200 bg-slate-50 object-contain p-1" 
                       onError={(e) => { (e.target as HTMLImageElement).src = 'https://github.com/github.png?size=48'; }}
                  />
                  <div className="flex-1">
                    <a href={`https://github.com/${drawerIssue.repo_full_name || drawerIssue.repo_name}`} target="_blank" rel="noreferrer" className="text-sm font-medium text-slate-500 hover:underline flex items-center gap-1">
                      <Github className="w-4 h-4" /> {drawerIssue.repo_full_name || drawerIssue.repo_name}
                    </a>
                    <h2 className="text-2xl font-bold text-slate-900 mt-1 leading-tight">{drawerIssue.title}</h2>
                    <div className="flex items-center gap-3 mt-3">
                      <span className="text-slate-500 text-sm font-medium">#{drawerIssue.number}</span>
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${drawerIssue.difficulty === 'Beginner' ? 'bg-green-100 text-green-700' : drawerIssue.difficulty === 'Intermediate' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                        {drawerIssue.difficulty}
                      </span>
                      <span className="flex items-center gap-1 font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-full text-xs">
                        <Trophy className="w-3 h-3" /> {drawerIssue.xp} XP
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-4 py-4 border-y border-slate-100">
                   <div className="flex items-center gap-2 text-sm text-slate-600">
                     <Clock className="w-4 h-4 text-slate-400" /> {drawerIssue.estimated_time}
                   </div>
                   <div className="flex items-center gap-2 text-sm text-slate-600">
                     <MessageCircle className="w-4 h-4 text-slate-400" /> {drawerIssue.comments} comments
                   </div>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {drawerIssue.skills?.map((skill:string, i:number) => (
                    <span key={i} className="text-xs font-medium bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md">
                      {skill}
                    </span>
                  ))}
                  {drawerIssue.labels?.map((label:string, i:number) => (
                    <span key={`l-${i}`} className="text-xs font-medium bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-md border border-indigo-100">
                      {label}
                    </span>
                  ))}
                </div>
                
                <div className="bg-slate-50 rounded-xl p-6 border border-slate-100 mt-2">
                   <h4 className="font-bold text-slate-900 mb-4 text-sm uppercase tracking-wider">Issue Description</h4>
                   <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans max-h-[300px] overflow-y-auto leading-relaxed">
                     {drawerIssue.body || "No description provided."}
                   </pre>
                </div>
             </div>
             
             <div className="p-6 border-t bg-slate-50 flex gap-4">
                <Button variant="outline" className="flex-1" onClick={() => window.open(getIssueUrl(drawerIssue), '_blank')}>
                  View on GitHub &rarr;
                </Button>
                {acceptedMissions.some(m => m.id === drawerIssue.id) ? (
                  <Button disabled className="flex-1 bg-slate-200 text-slate-500">
                    Already Accepted &nbsp;&#10003;
                  </Button>
                ) : (
                  <Button className="flex-1" onClick={() => handleAcceptMission(drawerIssue)}>
                    Accept Mission
                  </Button>
                )}
             </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="border border-slate-200 rounded-xl p-5 bg-white animate-pulse flex flex-col h-[200px]">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 bg-slate-200 rounded-lg"></div>
        <div className="h-4 bg-slate-200 rounded w-1/3"></div>
      </div>
      <div className="h-5 bg-slate-200 rounded w-full mb-2"></div>
      <div className="h-5 bg-slate-200 rounded w-3/4 mb-4"></div>
      <div className="flex gap-2 mb-4 mt-auto">
        <div className="h-6 bg-slate-200 rounded w-16"></div>
        <div className="h-6 bg-slate-200 rounded w-20"></div>
      </div>
      <div className="flex gap-2 mt-auto">
        <div className="h-8 bg-slate-200 rounded w-full"></div>
        <div className="h-8 bg-slate-200 rounded w-full"></div>
      </div>
    </div>
  );
}

function MissionCardItem({ issue, onAccept, isAccepted, isCompleted, onViewDetails }: { issue: any, onAccept: () => void, isAccepted: boolean, isCompleted: boolean, onViewDetails: () => void }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col h-[230px]">
      <div className="flex items-start justify-between mb-3">
        <div 
          className="flex items-center gap-1.5 text-[9px] font-mono text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200 max-w-[75%] break-all whitespace-normal"
          title={issue.repo_full_name || issue.repo_name}
        >
          <img 
            src={`https://github.com/${(issue.repo_full_name || issue.repo_name)?.split('/')[0] || issue.company.toLowerCase()}.png?size=32`} 
            className="w-4 h-4 object-contain bg-white shrink-0 rounded" 
            alt={issue.company} 
            onError={(e) => { (e.target as HTMLImageElement).src = 'https://github.com/github.png?size=32'; }}
          />
          <span className="leading-tight">
            {issue.repo_full_name || issue.repo_name}
          </span>
        </div>
        <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider shrink-0 ${issue.difficulty === 'Beginner' ? 'bg-green-100 text-green-700' : issue.difficulty === 'Intermediate' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
          {issue.difficulty}
        </span>
      </div>
      
      <h4 className="font-semibold text-slate-900 mb-2 line-clamp-2 leading-tight flex-1" title={issue.title}>
        {issue.title}
      </h4>
      
      <div className="flex flex-wrap gap-1 mb-4 mt-auto">
        {issue.skills?.slice(0, 3).map((skill:string, i:number) => (
          <span key={i} className="text-[10px] font-medium bg-slate-50 text-slate-600 border px-1.5 py-0.5 rounded-sm">
            {skill}
          </span>
        ))}
        {issue.comments > 0 && (
          <span className="text-[10px] font-medium bg-blue-50 text-blue-600 border border-blue-100 px-1.5 py-0.5 rounded-sm flex items-center gap-1">
            <MessageCircle className="w-3 h-3" /> {issue.comments}
          </span>
        )}
      </div>
      
      <div className="flex items-center justify-between text-xs text-slate-500 mb-4">
        <div className="flex items-center gap-1"><Clock className="w-3 h-3" /> {issue.estimated_time}</div>
        <div className="flex items-center gap-1 font-semibold text-amber-600"><Trophy className="w-3 h-3" /> {issue.xp} XP</div>
      </div>
      
      <div className="flex gap-2 mt-auto">
        <Button variant="outline" size="sm" className="w-full text-xs" onClick={onViewDetails}>View Details</Button>
        {isCompleted ? (
          <span className="px-4 py-2 bg-green-100 text-green-700 rounded-md text-xs font-semibold w-full text-center flex items-center justify-center border border-green-200">
            ✓ Completed
          </span>
        ) : isAccepted ? (
          <span className="px-4 py-2 bg-gray-100 text-gray-600 rounded-md text-xs font-semibold w-full text-center flex items-center justify-center border">
            Accepted
          </span>
        ) : (
          <Button 
            size="sm" 
            className="w-full text-xs bg-primary hover:bg-primary/90" 
            onClick={onAccept}
          >
            Accept Mission
          </Button>
        )}
      </div>
    </div>
  );
}


function ActiveMissionSidebarItem({ mission, onDecline }: { mission: any, onDecline: () => void }) {
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <div className="border border-slate-100 bg-slate-50 rounded-lg p-4">
      <div 
        className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-2 truncate max-w-full"
        title={mission.repo_full_name || mission.repo_name}
      >
        <Github className="w-3 h-3 shrink-0" />
        <span className="font-mono text-[10px] truncate">{mission.repo_full_name || mission.repo_name}</span>
      </div>
      <h4 className="font-semibold text-sm mb-3 line-clamp-2">{mission.title}</h4>
      
      {showConfirm ? (
        <div className="mt-2 pt-3 border-t border-slate-200">
          <p className="text-xs text-red-600 mb-2 font-medium">Are you sure? This will remove the mission.</p>
          <div className="flex items-center justify-between gap-2">
            <Button size="sm" variant="ghost" className="h-7 text-xs text-slate-500 w-full" onClick={() => setShowConfirm(false)}>Cancel</Button>
            <Button size="sm" variant="destructive" className="h-7 text-xs w-full" onClick={onDecline}>Yes, remove</Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between mt-2 pt-3 border-t border-slate-200 gap-2">
          <span className="text-xs font-semibold text-amber-600 shrink-0">{mission.xp} XP</span>
          <div className="flex items-center gap-1 ml-auto">
            <Button size="sm" variant="outline" className="h-7 text-xs text-slate-600 border-slate-300" onClick={() => setShowConfirm(true)}>
              Decline
            </Button>
            <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700">Submit PR</Button>
          </div>
        </div>
      )}
    </div>
  );
}


const CompletedMissionCard = ({ mission }: { mission: any }) => (
  <div className="border rounded-lg p-4 bg-green-50/50 border-green-200 shadow-sm">
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <img 
            src={`https://github.com/${(mission.repo_full_name || mission.repo_name)?.split('/')[0] || mission.company.toLowerCase()}.png?size=32`} 
            className="w-5 h-5 rounded-full"
            alt={mission.company}
            onError={(e) => { (e.target as HTMLImageElement).src = 'https://github.com/github.png?size=32'; }}
          />
          <span className="text-xs text-muted-foreground font-mono" title={mission.repo_full_name || mission.repo_name}>
            {mission.repo_full_name || mission.repo_name}
          </span>
          <span className="text-xs text-muted-foreground">#{mission.number}</span>
        </div>
        <p className="font-medium text-sm mb-2">{mission.title}</p>
        <div className="flex items-center gap-3">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            mission.difficulty === "Beginner" ? "bg-green-100 text-green-700" :
            mission.difficulty === "Intermediate" ? "bg-amber-100 text-amber-700" :
            "bg-red-100 text-red-700"
          }`}>{mission.difficulty}</span>
          <span className="text-xs text-amber-600 font-medium">+{mission.xp} XP earned</span>
        </div>
      </div>
      <div className="text-right ml-4 shrink-0">
        <div className="flex items-center gap-1 text-green-600 font-medium text-sm mb-1">
          <span>✓</span>
          <span>Completed</span>
        </div>
        {mission.pr_url && (
          <a 
            href={mission.pr_url} 
            target="_blank"
            className="text-xs text-blue-500 underline"
          >
            View PR →
          </a>
        )}
        {mission.completed_at && (
          <p className="text-xs text-muted-foreground mt-1">
            {new Date(mission.completed_at).toLocaleDateString()}
          </p>
        )}
      </div>
    </div>
  </div>
)

function ActiveMissionsTab({ acceptedMissions, onDecline, onComplete }: { acceptedMissions: any[], onDecline: (id: string) => void, onComplete: (mission: any, prUrl: string, verifyData: any) => void }) {
  const activeMissions = acceptedMissions.filter(m => m.status !== "completed")
  const completedMissions = acceptedMissions.filter(m => m.status === "completed")

  return (
    <div className="max-w-4xl mx-auto space-y-6 pt-4 pb-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold">Your Active Missions</h2>
          <p className="text-slate-500 mt-1">Track and submit your accepted open source contributions.</p>
        </div>
      </div>

      {acceptedMissions.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <ListChecks className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-slate-700">No active missions</h3>
          <p className="text-slate-500 mt-2">Go to the Mission Board to accept your first mission!</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {/* Section 1: In Progress */}
          {activeMissions.length > 0 && (
            <>
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
                In Progress ({activeMissions.length})
              </h3>
              {activeMissions.map((mission) => (
                <ActiveMissionTabItem 
                  key={mission.id} 
                  mission={mission} 
                  onDecline={() => onDecline(mission.id)} 
                  onComplete={(prUrl, verifyData) => onComplete(mission, prUrl, verifyData)} 
                />
              ))}
            </>
          )}

          {/* Section 2: Completed */}
          {completedMissions.length > 0 && (
            <>
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3 mt-6">
                Completed ({completedMissions.length})
              </h3>
              {completedMissions.map((mission) => (
                <CompletedMissionCard key={mission.id} mission={mission} />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function ActiveMissionTabItem({ mission, onDecline, onComplete }: { mission: any, onDecline: () => void, onComplete: (prUrl: string, verifyData: any) => void }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [prLink, setPrLink] = useState("");
  const [verifyState, setVerifyState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [verifyMessage, setVerifyMessage] = useState("");
  const [verifyDetails, setVerifyDetails] = useState<any>(null);

  const repoParts = (mission.repo_name || "").split("/");
  const expectedOwner = mission.owner || repoParts[0] || "";
  const expectedRepo = mission.repo || repoParts[1] || "";

  const handleVerify = async () => {
    if (!prLink.trim()) {
      setVerifyState("error");
      setVerifyMessage("Please paste your GitHub PR link first.");
      return;
    }

    setVerifyState("loading");
    setVerifyMessage("Checking your PR on GitHub...");
    setVerifyDetails(null);

    try {
      const res = await fetch("/api/v1/submissions/verify-pr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pr_url: prLink.trim(),
          owner: expectedOwner,
          repo: expectedRepo,
          issue_number: mission.number,
        })
      });

      const data = await res.json();
      setVerifyDetails(data);

      if (data.verified) {
        setVerifyState("success");
        setVerifyMessage(data.message || "PR verified!");
        setTimeout(() => {
          onComplete(prLink.trim(), data);
        }, 2000);
      } else {
        setVerifyState("error");
        setVerifyMessage(data.message || "Verification failed.");
      }
    } catch (e) {
      setVerifyState("error");
      setVerifyMessage("Could not reach the server. Check your connection.");
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row gap-6 items-start md:items-center">
      <div className="flex-1">
        <div 
          className="flex items-center gap-2 text-sm font-medium text-slate-500 mb-2 truncate max-w-full"
          title={mission.repo_full_name || mission.repo_name}
        >
          <Github className="w-4 h-4 shrink-0" />
          <span className="font-mono text-xs truncate">{mission.repo_full_name || mission.repo_name}</span>
          <ChevronRight className="w-4 h-4 shrink-0" />
          <span className="text-slate-400">#{mission.number}</span>
        </div>
        <h3 className="text-lg font-bold mb-2 cursor-pointer hover:text-primary transition-colors" onClick={() => window.open(getIssueUrl(mission), '_blank')}>
          {mission.title}
        </h3>
        <div className="flex gap-4 text-sm mb-4">
          <span className={`font-semibold px-2 py-0.5 rounded-full text-xs ${mission.difficulty === 'Beginner' ? 'bg-green-100 text-green-700' : mission.difficulty === 'Intermediate' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
            {mission.difficulty}
          </span>
          <span className="flex items-center gap-1 font-semibold text-amber-600"><Trophy className="w-4 h-4" /> {mission.xp} XP</span>
          <span className="flex items-center gap-1 text-slate-500"><Clock className="w-4 h-4" /> {mission.time_estimate}</span>
        </div>
      </div>
      <div className="w-full md:w-[40%] flex flex-col gap-3 border-t md:border-t-0 md:border-l pt-4 md:pt-0 md:pl-6 border-slate-100">
        {/* Info box showing requirements upfront */}
        <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-md text-xs text-blue-700">
          <p className="font-medium mb-1">For verification to pass your PR must:</p>
          <ul className="space-y-0.5 list-none">
            <li>✓ Be opened on <strong>{mission.repo_full_name || mission.repo_name || `${expectedOwner}/${expectedRepo}`}</strong></li>
            <li>✓ Include "Fixes #{mission.number}" or "Closes #{mission.number}" in the title or description</li>
            <li>✓ Be an open or merged pull request (not a draft)</li>
          </ul>
        </div>

        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Submit PR Link</label>
        <div className="flex gap-2">
          <input 
            type="text" 
            placeholder="https://github.com/owner/repo/pull/123" 
            value={prLink}
            onChange={(e) => {
              setPrLink(e.target.value);
              setVerifyState("idle"); // reset on new input
              setVerifyMessage("");
            }}
            disabled={verifyState === "loading" || verifyState === "success"}
            className="flex-1 px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <Button 
            className={`shrink-0 ${
              verifyState === "success" 
                ? "bg-green-500 hover:bg-green-600 text-white cursor-default"
                : verifyState === "loading"
                ? "bg-gray-400 text-white cursor-wait"
                : "bg-emerald-600 hover:bg-emerald-700 text-white"
            }`} 
            onClick={handleVerify}
            disabled={verifyState === "loading" || verifyState === "success"}
          >
            {verifyState === "loading" ? "Checking..." 
             : verifyState === "success" ? "✓ Verified"
             : "Verify"}
          </Button>
        </div>
        
        {/* Verification steps shown while loading */}
        {verifyState === "loading" && (
          <div className="mt-2 space-y-1">
            {[
              "Parsing PR URL...",
              "Checking repository match...",
              "Fetching PR from GitHub...",
              "Confirming issue reference...",
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="w-3.5 h-3.5 border border-gray-300 rounded-full animate-pulse shrink-0"/>
                {step}
              </div>
            ))}
          </div>
        )}

        {/* Success message */}
        {verifyState === "success" && (
          <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-md">
            <div className="flex items-center gap-2 text-green-700 text-sm font-medium mb-1">
              <span>✓</span>
              <span>{verifyMessage}</span>
            </div>
            {verifyDetails && (
              <div className="text-xs text-green-600 space-y-0.5">
                <p>PR #{verifyDetails.pr_number}: {verifyDetails.pr_title}</p>
                <p>Status: {verifyDetails.pr_merged ? "Merged ✓" : verifyDetails.pr_state}</p>
                <a href={verifyDetails.pr_url} target="_blank" rel="noopener noreferrer" className="underline font-semibold block mt-1">
                  View PR on GitHub →
                </a>
              </div>
            )}
          </div>
        )}

        {/* Error message with specific reason */}
        {verifyState === "error" && (
          <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-start gap-2">
              <span className="text-red-500 text-sm">✗</span>
              <div>
                <p className="text-red-700 text-sm font-medium">Verification Failed</p>
                <p className="text-red-600 text-xs mt-0.5">{verifyMessage}</p>
                {verifyDetails?.step_failed === "issue_not_referenced" && (
                  <div className="mt-2 p-2 bg-red-100 rounded text-xs text-red-700">
                    <p className="font-medium">How to fix:</p>
                    <p>In your PR description, add one of these lines:</p>
                    <code className="block mt-1 font-mono">Fixes #{mission.number}</code>
                    <code className="block font-mono">Closes #{mission.number}</code>
                    <p className="mt-1">Then save the PR and click Verify again.</p>
                  </div>
                )}
                {verifyDetails?.step_failed === "pr_not_found" && (
                  <div className="mt-2 p-2 bg-red-100 rounded text-xs text-red-700">
                    <p className="font-medium">How to fix:</p>
                    <p>Make sure you have opened a Pull Request on GitHub, not just pushed commits. Go to the repository and click "New Pull Request".</p>
                  </div>
                )}
                {verifyDetails?.step_failed === "repo_mismatch" && (
                  <div className="mt-2 p-2 bg-red-100 rounded text-xs text-red-700">
                    <p className="font-medium">How to fix:</p>
                    <p>Your PR must be opened on <strong>{mission.repo_name || `${expectedOwner}/${expectedRepo}`}</strong>. Fork that repo, make your changes, and open the PR there.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        
        {showConfirm ? (
           <div className="mt-1 pt-2">
             <p className="text-xs text-red-600 mb-2 font-medium">Are you sure? This will remove the mission.</p>
             <div className="flex items-center gap-2">
               <Button size="sm" variant="ghost" className="h-7 text-xs text-slate-500 flex-1 border border-slate-200" onClick={() => setShowConfirm(false)}>Cancel</Button>
               <Button size="sm" variant="destructive" className="h-7 text-xs flex-1" onClick={onDecline}>Yes, remove</Button>
             </div>
           </div>
        ) : (
          <div className="flex justify-end mt-1">
             <Button size="sm" variant="outline" className="h-7 text-xs text-slate-600 border-slate-300 hover:text-red-600 hover:border-red-200 hover:bg-red-50" onClick={() => setShowConfirm(true)}>
               <Trash2 className="w-3 h-3 mr-1" /> Decline Mission
             </Button>
          </div>
        )}
      </div>
    </div>
  );
}



