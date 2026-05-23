import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect, useRef } from 'react';
import { FlaskConical, ListChecks, Activity, Search, Github, Clock, Trophy, ChevronRight, CheckCircle2, Download, Trash2, ShieldCheck, X, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const Route = createFileRoute('/missionx')({
  component: MissionX
});

function MissionX() {
  const [activeTab, setActiveTab] = useState<'board' | 'active' | 'portfolio'>('board');
  const [acceptedMissions, setAcceptedMissions] = useState<any[]>([]);

  const handleDecline = (missionId: string) => {
    setAcceptedMissions(prev => prev.filter(m => m.id !== missionId));
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
            label={`Active Missions (${acceptedMissions.length})`} 
          />
          <TabButton 
            active={activeTab === 'portfolio'} 
            onClick={() => setActiveTab('portfolio')} 
            icon={<Activity className="w-4 h-4" />}
            label="My Portfolio" 
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
            />
          </div>
        )}
        {activeTab === 'portfolio' && (
          <div className="p-8 min-h-full bg-slate-50/50">
            <PortfolioTab />
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
  const [searchQuery, setSearchQuery] = useState("");
  const [allIssues, setAllIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [drawerIssue, setDrawerIssue] = useState<any | null>(null);

  const fetchTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchMissions("");
  }, []);

  const fetchMissions = async (query: string) => {
    setLoading(true);
    setRateLimited(false);
    try {
      let url = "/api/v1/missions/default";
      if (query.trim().length > 0) {
        url = `/api/v1/missions/company/${encodeURIComponent(query.trim())}`;
      }
      
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      
      setAllIssues(data.missions || []);
      setTotalCount(data.total_count || 0);
      setRateLimited(data.rate_limited || false);
      setPage(1);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    
    if (fetchTimer.current) clearTimeout(fetchTimer.current);
    
    fetchTimer.current = setTimeout(() => {
      if (val.length === 0 || val.length > 2) {
        fetchMissions(val);
      }
    }, 500);
  };

  const handleAcceptMission = (mission: any) => {
    if (!acceptedMissions.find(m => m.id === mission.id)) {
      setAcceptedMissions([mission, ...acceptedMissions]);
    }
  };

  const displayedIssues = allIssues.slice(0, page * 20);

  return (
    <div className="flex gap-8 h-full relative">
      <div className="w-[65%] flex flex-col gap-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <input
            type="text"
            placeholder="Search missions by company (e.g., amazon, google, netflix), title, or skills..."
            className="w-full pl-10 pr-4 py-3 bg-white border rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            value={searchQuery}
            onChange={handleSearchChange}
          />
        </div>
        
        {rateLimited && (
          <div className="bg-orange-50 border border-orange-200 text-orange-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
            <Clock className="w-4 h-4" /> Loading more missions — GitHub API is catching up, please wait or refresh.
          </div>
        )}
        
        {!loading && totalCount > 0 && (
          <div className="text-sm font-medium text-slate-500">
            {searchQuery 
              ? `Found ${totalCount} missions for "${searchQuery}"` 
              : "Showing 30 open missions across 16 top repositories — search to filter by company"}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-2 gap-4 pb-8">
            {[1,2,3,4,5,6].map(i => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : displayedIssues.length === 0 ? (
          <div className="flex flex-col justify-center items-center h-64 text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200">
            <FlaskConical className="w-12 h-12 mb-4 text-slate-300" />
            <p className="text-lg font-medium text-slate-700">No missions found</p>
            <p className="text-sm">Try adjusting your filters or search query.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 pb-8">
            {displayedIssues.map(issue => (
              <MissionCardItem 
                key={issue.id} 
                issue={issue} 
                onAccept={() => handleAcceptMission(issue)}
                isAccepted={acceptedMissions.some(m => m.id === issue.id)}
                onViewDetails={() => setDrawerIssue(issue)}
              />
            ))}
            
            {displayedIssues.length < allIssues.length && (
              <div className="col-span-2 flex justify-center mt-4">
                <Button variant="outline" onClick={() => setPage(p => p + 1)}>
                  Load More
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="w-[35%] bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col sticky top-0 h-fit max-h-[calc(100vh-10rem)]">
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
          <ListChecks className="w-5 h-5 text-primary" />
          Active Missions
        </h3>
        
        <div className="flex-1 overflow-y-auto pr-2 flex flex-col gap-3">
          {acceptedMissions.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              You haven't accepted any missions yet. Pick one from the board to get started!
            </div>
          ) : (
            acceptedMissions.map(mission => (
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

function MissionCardItem({ issue, onAccept, isAccepted, onViewDetails }: { issue: any, onAccept: () => void, isAccepted: boolean, onViewDetails: () => void }) {
  const [analyzedDiff, setAnalyzedDiff] = useState(issue.difficulty);
  const [analyzedSkills, setAnalyzedSkills] = useState(issue.skills);
  
  useEffect(() => {
    // Optimistic UI for LLM Analysis
    // We only analyze if it's currently a placeholder or we want deeper insight
    // To prevent spamming, we just use a small timeout to simulate it if endpoint isn't fully robust
    // Or we make the real call:
    const analyze = async () => {
      try {
        const res = await fetch("/api/v1/missions/analyze", {
          method: "POST",
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify({title: issue.title, body: issue.body})
        });
        if (res.ok) {
          const data = await res.json();
          if (data.difficulty) setAnalyzedDiff(data.difficulty);
          if (data.skills && data.skills.length > 0) setAnalyzedSkills(data.skills);
        }
      } catch (e) {
        // fail silently, keep heuristic
      }
    };
    
    // Randomize slightly so they don't all hit exactly at once
    const t = setTimeout(analyze, 1000 + Math.random() * 2000);
    return () => clearTimeout(t);
  }, [issue.title, issue.body]);

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
        <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider shrink-0 ${analyzedDiff === 'Beginner' ? 'bg-green-100 text-green-700' : analyzedDiff === 'Intermediate' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
          {analyzedDiff}
        </span>
      </div>
      
      <h4 className="font-semibold text-slate-900 mb-2 line-clamp-2 leading-tight flex-1" title={issue.title}>
        {issue.title}
      </h4>
      
      <div className="flex flex-wrap gap-1 mb-4 mt-auto">
        {analyzedSkills?.slice(0, 3).map((skill:string, i:number) => (
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
        <Button 
          size="sm" 
          className="w-full text-xs" 
          onClick={onAccept}
          disabled={isAccepted}
        >
          {isAccepted ? "Accepted" : "Accept Mission"}
        </Button>
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


function ActiveMissionsTab({ acceptedMissions, onDecline }: { acceptedMissions: any[], onDecline: (id: string) => void }) {
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
          {acceptedMissions.map((mission) => (
            <ActiveMissionTabItem key={mission.id} mission={mission} onDecline={() => onDecline(mission.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function ActiveMissionTabItem({ mission, onDecline }: { mission: any, onDecline: () => void }) {
  const [showConfirm, setShowConfirm] = useState(false);

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
            className="flex-1 px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <Button className="bg-emerald-600 hover:bg-emerald-700 shrink-0">Verify</Button>
        </div>
        
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


function PortfolioTab() {
  return (
    <div className="max-w-6xl mx-auto space-y-10 pt-2 pb-12">
      <div className="flex items-center justify-between bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-3xl font-bold tracking-tight font-display flex items-center gap-3 text-slate-900">
            <Trophy className="w-8 h-8 text-slate-700" />
            My Portfolio
          </h2>
          <p className="text-slate-500 mt-2 text-base font-medium">
            Your verified open source contributions and achievements.
          </p>
        </div>
        <Button variant="outline" className="gap-2 border-slate-300 text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-sm">
          <Download className="w-4 h-4" />
          Download PDF
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        {/* Customized Stat Cards */}
        <div className="bg-white rounded-2xl border-t-2 border-t-amber-500 p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total XP</h3>
            <Trophy className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-3xl font-bold text-slate-900 mb-1">1,250</div>
          <p className="text-xs font-medium text-slate-500 mt-2">Top 12% in college</p>
        </div>

        <div className="bg-white rounded-2xl border-t-2 border-t-blue-500 p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Missions</h3>
            <CheckCircle2 className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-3xl font-bold text-slate-900 mb-1">4</div>
          <p className="text-xs font-medium text-slate-500 mt-2">Active contributor</p>
        </div>

        <div className="bg-white rounded-2xl border-t-2 border-t-emerald-500 p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">PRs Merged</h3>
            <Github className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-3xl font-bold text-slate-900 mb-1">4</div>
          <p className="text-xs font-medium text-slate-500 mt-2">Perfect merge rate</p>
        </div>

        <div className="bg-white rounded-2xl border-t-2 border-t-purple-500 p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Badges</h3>
            <Activity className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-3xl font-bold text-slate-900 mb-1">6</div>
          <p className="text-xs font-medium text-slate-500 mt-2">Elite rank unlocked</p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-1 space-y-8">
          {/* Company Badges */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-[0.03]"><ShieldCheck className="w-32 h-32 text-slate-900" /></div>
            <h3 className="font-bold text-lg mb-6 flex items-center gap-2 relative z-10 text-slate-800">
              <ShieldCheck className="w-5 h-5 text-slate-500" /> Company Badges
            </h3>
            <div className="flex flex-col gap-3 relative z-10">
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center font-bold">V</div>
                <div>
                  <h4 className="font-bold text-sm">Vercel Ready</h4>
                  <p className="text-xs text-slate-500">500 XP Earned</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">M</div>
                <div>
                  <h4 className="font-bold text-sm">Meta Contributor</h4>
                  <p className="text-xs text-slate-500">250 XP Earned</p>
                </div>
              </div>
            </div>
          </div>

          {/* Verified Skills */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h3 className="font-bold text-lg mb-6 flex items-center gap-2 text-slate-800">
              <CheckCircle2 className="w-5 h-5 text-slate-500" /> Verified Skills
            </h3>
            <div className="flex flex-wrap gap-2">
              <SkillChip name="React" level="Advanced" />
              <SkillChip name="TypeScript" level="Advanced" />
              <SkillChip name="Tailwind CSS" level="Advanced" />
              <SkillChip name="Node.js" level="Intermediate" />
              <SkillChip name="Git" level="Intermediate" />
              <SkillChip name="Python" level="Beginner" />
            </div>
          </div>
        </div>

        {/* Contribution Timeline */}
        <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
            <h3 className="font-bold text-lg mb-8 flex items-center gap-2 text-slate-800">
            <Clock className="w-5 h-5 text-slate-500" /> Contribution Timeline
          </h3>
          
          <div className="relative pl-6 space-y-8 before:absolute before:inset-0 before:ml-[11px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
            
            <TimelineItem 
              title="Fix hydration mismatch in App Router" 
              repo="vercel/next.js" 
              xp={500} 
              difficulty="Hard" 
              date="2 days ago"
            />
            
            <TimelineItem 
              title="Add container query utilities" 
              repo="tailwindlabs/tailwindcss" 
              xp={250} 
              difficulty="Medium" 
              date="1 week ago"
            />
            
            <TimelineItem 
              title="Update concurrent mode docs" 
              repo="facebook/react" 
              xp={250} 
              difficulty="Beginner" 
              date="2 weeks ago"
            />
            
            <TimelineItem 
              title="Improve error boundaries in suspense" 
              repo="facebook/react" 
              xp={250} 
              difficulty="Medium" 
              date="1 month ago"
            />

          </div>
        </div>
      </div>
    </div>
  );
}

function SkillChip({ name, level }: { name: string, level: "Advanced" | "Intermediate" | "Beginner" }) {
  const colors = {
    "Advanced": "bg-emerald-50 text-emerald-700 border-emerald-200 dot-emerald",
    "Intermediate": "bg-blue-50 text-blue-700 border-blue-200 dot-blue",
    "Beginner": "bg-slate-100 text-slate-600 border-slate-200 dot-slate"
  };
  
  return (
    <span className={`px-3 py-1.5 font-medium rounded-full text-xs border flex items-center gap-2 ${colors[level]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${level === 'Advanced' ? 'bg-emerald-500' : level === 'Intermediate' ? 'bg-blue-500' : 'bg-slate-400'}`}></span>
      {name}
    </span>
  );
}

function TimelineItem({ title, repo, xp, difficulty, date }: { title: string, repo: string, xp: number, difficulty: string, date: string }) {
  return (
    <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
      {/* Icon */}
      <div className="flex items-center justify-center w-6 h-6 rounded-full border-4 border-white bg-blue-100 text-blue-600 shadow shrink-0 absolute -left-[15px] md:left-1/2 md:-translate-x-1/2 z-10">
        <div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div>
      </div>
      
      {/* Content */}
      <div className="w-[calc(100%-2rem)] md:w-[calc(50%-2rem)] bg-slate-50 p-4 rounded-xl border border-slate-100 hover:shadow-md transition-shadow group-hover:border-blue-100 group-hover:bg-blue-50/30">
        <div className="flex justify-between items-start mb-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{date}</span>
          <span className="flex items-center gap-1 font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100 text-xs">
            +{xp} XP
          </span>
        </div>
        <h4 className="font-bold text-slate-900 text-sm mb-1">{title}</h4>
        <div className="flex items-center gap-3">
          <p className="text-xs font-medium text-slate-500 flex items-center gap-1">
            <Github className="w-3 h-3" /> {repo}
          </p>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${difficulty === 'Beginner' ? 'bg-green-100 text-green-700' : difficulty === 'Medium' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>
            {difficulty}
          </span>
        </div>
      </div>
    </div>
  );
}
