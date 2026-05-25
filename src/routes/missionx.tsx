import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect, useRef } from 'react';
import { FlaskConical, ListChecks, Activity, Search, Github, Clock, Trophy, ChevronRight, CheckCircle2, Download, Trash2, ShieldCheck, X, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const Route = createFileRoute('/missionx')({
  component: MissionX
});

function MissionX() {
  const [activeTab, setActiveTab] = useState<'board' | 'active'>('board');
  const [acceptedMissions, setAcceptedMissions] = useState<any[]>([]);

  // Count only non-completed for the "active" badge
  const activeMissions = acceptedMissions.filter(m => m.status !== "completed");

  const handleDecline = (missionId: string) => {
    setAcceptedMissions(prev => prev.filter(m => m.id !== missionId));
  };

  const handleComplete = (mission: any, prUrl: string) => {
    setAcceptedMissions(prev => prev.map(m => {
      if (m.id === mission.id) {
        return {
          ...m,
          status: "completed",
          pr_url: prUrl,
          completed_at: new Date().toISOString()
        };
      }
      return m;
    }));
  };

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
              onComplete={handleComplete}
            />
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
                  <img src={`https://github.com/${drawerIssue.repo_name?.split('/')[0] || drawerIssue.company}.png?size=48`} 
                       alt={drawerIssue.company} 
                       className="w-12 h-12 rounded-lg border border-slate-200 bg-slate-50 object-contain p-1" 
                       onError={(e) => { (e.target as HTMLImageElement).src = 'https://github.com/github.png?size=48'; }}
                  />
                  <div className="flex-1">
                    <a href={`https://github.com/${drawerIssue.repo_name}`} target="_blank" rel="noreferrer" className="text-sm font-medium text-slate-500 hover:underline flex items-center gap-1">
                      <Github className="w-4 h-4" /> {drawerIssue.repo_name}
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
                <Button variant="outline" className="flex-1" onClick={() => window.open(drawerIssue.html_url, '_blank')}>
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
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500 bg-slate-100 pr-2 rounded-md border border-slate-200 overflow-hidden">
          <img 
            src={`https://github.com/${issue.repo_name?.split('/')[0] || issue.company.toLowerCase()}.png?size=32`} 
            className="w-6 h-6 object-contain bg-white" 
            alt={issue.company} 
            onError={(e) => { (e.target as HTMLImageElement).src = 'https://github.com/github.png?size=32'; }}
          />
          {issue.repo_name}
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
      <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-2">
        <Github className="w-3 h-3" />
        {mission.repo_name}
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
            src={`https://github.com/${mission.repo_name?.split('/')[0] || mission.company.toLowerCase()}.png?size=32`} 
            className="w-5 h-5 rounded-full"
            alt={mission.company}
            onError={(e) => { (e.target as HTMLImageElement).src = 'https://github.com/github.png?size=32'; }}
          />
          <span className="text-xs text-muted-foreground">{mission.repo_name}</span>
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

function ActiveMissionsTab({ acceptedMissions, onDecline, onComplete }: { acceptedMissions: any[], onDecline: (id: string) => void, onComplete: (mission: any, prUrl: string) => void }) {
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
                  onComplete={(prUrl) => onComplete(mission, prUrl)} 
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

function ActiveMissionTabItem({ mission, onDecline, onComplete }: { mission: any, onDecline: () => void, onComplete: (prUrl: string) => void }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [prLink, setPrLink] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState<"idle" | "success" | "warning" | "error">("idle");
  const [verifyMsg, setVerifyMsg] = useState("");

  const handleVerify = async () => {
    if (!prLink.trim()) return;
    setIsVerifying(true);
    setVerifyStatus("idle");
    
    try {
      const res = await fetch("/api/v1/missions/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          pr_link: prLink, 
          mission_id: mission.id, 
          repo_name: mission.repo_name,
          issue_number: mission.number,
          issue_title: mission.title,
          issue_description: mission.body || mission.body_preview || ""
        })
      });
      const data = await res.json();
      
      if (data.verified) {
        if (data.warning) {
          setVerifyStatus("warning");
          setVerifyMsg(data.warning);
          setTimeout(() => {
            onComplete(prLink);
          }, 3000);
        } else {
          setVerifyStatus("success");
          setVerifyMsg(data.message);
          setTimeout(() => {
            onComplete(prLink);
          }, 2000);
        }
      } else {
        setVerifyStatus("error");
        setVerifyMsg(data.message || "Verification failed");
      }
    } catch(e) {
      setVerifyStatus("error");
      setVerifyMsg("Network error occurred during verification.");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row gap-6 items-start md:items-center">
      <div className="flex-1">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-500 mb-2">
          <Github className="w-4 h-4" />
          {mission.repo_name}
          <ChevronRight className="w-4 h-4" />
          <span className="text-slate-400">#{mission.number}</span>
        </div>
        <h3 className="text-lg font-bold mb-2 cursor-pointer hover:text-primary transition-colors" onClick={() => window.open(mission.html_url, '_blank')}>
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
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Submit PR Link</label>
        <div className="flex gap-2">
          <input 
            type="text" 
            placeholder="https://github.com/..." 
            value={prLink}
            onChange={(e) => setPrLink(e.target.value)}
            disabled={isVerifying || verifyStatus === 'success' || verifyStatus === 'warning'}
            className="flex-1 px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <Button 
            className="bg-emerald-600 hover:bg-emerald-700 shrink-0" 
            onClick={handleVerify}
            disabled={!prLink.trim() || isVerifying || verifyStatus === 'success' || verifyStatus === 'warning'}
          >
            {isVerifying ? "Verifying..." : (verifyStatus === 'success' || verifyStatus === 'warning') ? "Verified ✓" : "Verify"}
          </Button>
        </div>
        
        {verifyStatus === 'success' && (
          <div className="text-xs text-emerald-600 font-medium flex items-center gap-1 mt-1">
            <CheckCircle2 className="w-3 h-3" /> {verifyMsg} Moving to portfolio...
          </div>
        )}
        {verifyStatus === 'warning' && (
          <div className="text-xs text-amber-600 font-medium flex items-start gap-1.5 mt-1 bg-amber-50 p-2.5 rounded-lg border border-amber-200 shadow-sm">
            <span className="text-amber-500 font-bold shrink-0">⚠️</span>
            <span>{verifyMsg}</span>
          </div>
        )}
        {verifyStatus === 'error' && (
          <div className="text-xs text-red-500 font-medium mt-1">
            {verifyMsg}
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



