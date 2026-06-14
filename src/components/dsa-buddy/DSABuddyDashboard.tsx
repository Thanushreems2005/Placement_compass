import { useEffect, useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import apiClient from "./api/client"
import { useAppStore } from "./store/useAppStore"
import { 
  Target, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Cpu, 
  Lightbulb, 
  Award, 
  BookOpen, 
  Play, 
  Brain,
  MessageSquareCode
} from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card"
import { ProgressRing } from "./ui/chart"

interface ReadinessScore {
  overall_readiness: number
  consistency_score: number
  optimization_skill: number
  hard_problem_skill: number
  coding_speed: number
}

interface CompanyMatch {
  company_name: string
  match_percentage: number
}

export default function DSABuddyDashboard() {
  const { user, addToast, submissions, setActiveArenaLevel } = useAppStore()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [readiness, setReadiness] = useState<ReadinessScore | null>(null)
  const [companies, setCompanies] = useState<CompanyMatch[]>([])
  
  // Real-time WebSocket connection
  const [latestSub, setLatestSub] = useState<any>(null)

  // Mock Online Assessment (OA) Simulation States
  const [inOASession, setInOASession] = useState(false)
  const [oaCompany, setOaCompany] = useState("Google")
  const [oaTimeLeft, setOaTimeLeft] = useState(3600) // 1 hour timer
  const [oaQuestionsSolved, setOaQuestionsSolved] = useState(0)
  const [preferredCompanies, setPreferredCompanies] = useState<string[]>(["Google", "Meta", "Amazon"])

  useEffect(() => {
    const fetchTelemetry = async () => {
      try {
        const res = await apiClient.get("/dsa-buddy/get-dashboard-analytics")
        const payload = res.data
        setReadiness(payload.readiness)
        setCompanies(payload.company_matches)
        if (payload.preferred_companies && payload.preferred_companies.length > 0) {
          setPreferredCompanies(payload.preferred_companies)
          setOaCompany(payload.preferred_companies[0])
        }
      } catch (err) {
        console.error("Telemetry server sync offline. Initializing local database caching.")
      } finally {
        setLoading(false)
      }
    }

    fetchTelemetry()

    // Establish dynamic WebSocket connection for live telemetry updates
    const ws = new WebSocket(`ws://localhost:8000/api/v1/ws/${user?.id || 'anonymous'}`)
    
    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data)
        if (payload.event === "submission_analyzed") {
          addToast({
            title: "Live Telemetry Broadcast!",
            description: `Submission evaluated. New Readiness Score: ${payload.overall_readiness.toFixed(1)}%`,
            type: "success"
          })
          setLatestSub(payload.latest_submission)
          // Dynamically bump overall readiness
          if (readiness) {
            setReadiness(prev => prev ? { ...prev, overall_readiness: payload.overall_readiness } : null)
          }
        }
      } catch (e) {
        console.error("Failed to parse websocket event", e)
      }
    }

    ws.onerror = () => console.warn("Live websocket telemetry channel disconnected.")
    ws.onclose = () => console.warn("Live websocket telemetry channel closed.")

    return () => {
      ws.close()
    }
  }, [user])

  // OA Timer effect
  useEffect(() => {
    let timer: any
    if (inOASession && oaTimeLeft > 0) {
      timer = setInterval(() => {
        setOaTimeLeft(prev => prev - 1)
      }, 1000)
    } else if (oaTimeLeft === 0 && inOASession) {
      handleEndOASession()
    }
    return () => clearInterval(timer)
  }, [inOASession, oaTimeLeft])

  const handleStartOASession = async () => {
    addToast({
      title: "Redirecting to Mock Simulator",
      description: `Loading timed mock assessment for ${oaCompany}...`,
      type: "info"
    })
    navigate({
      to: "/dsa-buddy/mock-oa",
      search: { company: oaCompany } as any
    })
  }

  const handleEndOASession = async () => {
    try {
      const accuracy = oaQuestionsSolved === 0 ? 0.0 : (oaQuestionsSolved / 3.0) * 100.0
      await apiClient.post("/dsa-buddy/end-oa-session", {
        session_id: "current-simulation", // simplified for simulation
        solved_questions: oaQuestionsSolved,
        total_questions: 3,
        accuracy: accuracy,
        completion_time: 3600 - oaTimeLeft
      })
      setInOASession(false)
      addToast({
        title: "OA Assessment Completed!",
        description: `Scored ${accuracy.toFixed(1)}% accuracy. Readiness rating adjusted.`,
        type: "success"
      })
      
      // Refresh dashboard stats
      const res = await apiClient.get("/dsa-buddy/get-dashboard-analytics")
      setReadiness(res.data.readiness)
    } catch (err) {
      setInOASession(false)
    }
  }

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60)
    const s = secs % 60
    return `${mins.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
        <Cpu className="w-10 h-10 text-primary animate-spin" />
        <span className="text-sm font-semibold tracking-wide">Syncing Supabase placement telemetry...</span>
      </div>
    )
  }

  const averageScore = submissions.length > 0
    ? submissions.reduce((acc, s) => acc + s.score, 0) / submissions.length
    : 0

  const hasSubmissions = submissions.length > 0
  const activeReadiness = hasSubmissions ? averageScore : 0
  const consistencyVal = hasSubmissions ? (readiness?.consistency_score || 60) : 0
  const optimizationVal = hasSubmissions ? (readiness?.optimization_skill || 68) : 0
  const hardSolveVal = hasSubmissions ? (readiness?.hard_problem_skill || 50) : 0
  const speedVal = hasSubmissions ? (readiness?.coding_speed || 80) : 0

  const dynamicTopics = (() => {
    if (!hasSubmissions) {
      return [
        { topic_name: "Arrays & Strings", readiness_percentage: 0, solved_count: 0, confidence_level: "None" },
        { topic_name: "Dynamic Programming", readiness_percentage: 0, solved_count: 0, confidence_level: "None" },
        { topic_name: "Graphs & Tree Algorithms", readiness_percentage: 0, solved_count: 0, confidence_level: "None" },
        { topic_name: "Linked Lists & Stacks", readiness_percentage: 0, solved_count: 0, confidence_level: "None" }
      ]
    }
    const stats: Record<string, { correct: number, total: number }> = {}
    submissions.forEach(sub => {
      sub.questions.forEach(q => {
        const t = q.topic || "General DSA"
        if (!stats[t]) stats[t] = { correct: 0, total: 0 }
        stats[t].total += 1
        if (q.is_correct) stats[t].correct += 1
      })
    })
    return Object.entries(stats).map(([topic_name, s]) => {
      const pct = (s.correct / s.total) * 100
      return {
        topic_name,
        readiness_percentage: pct,
        solved_count: s.correct,
        confidence_level: pct >= 80 ? "Expert" : pct >= 60 ? "High" : pct >= 45 ? "Moderate" : "Beginner"
      }
    })
  })()

  const companySimulatorTargets = [
    { name: "Google", desc: "Topological traversal & graph heavy" },
    { name: "Meta", desc: "Hashing & subproblems focus" },
    { name: "Amazon", desc: "Greedy, paths & dynamic array prioritization" },
    { name: "Apple", desc: "Low-level structures & bitwise optimization" },
    { name: "Netflix", desc: "High-throughput heuristics & rate limiting" },
    { name: "Microsoft", desc: "Trees, pointer bounds & design optimization" },
    { name: "Stripe", desc: "JSON parsing, currency intervals & API simulation" },
    { name: "Uber", desc: "Spatial maps, segment queries & graph traversals" },
    { name: "Airbnb", desc: "Backtracking, subset bounds & pagination loops" },
    { name: "OpenAI", desc: "Matrix calculus, transformers & token optimizations" }
  ]

  const finalTargets = preferredCompanies.map(name => {
    const matched = companySimulatorTargets.find(t => t.name.toLowerCase() === name.toLowerCase())
    return {
      name: matched ? matched.name : name,
      desc: matched ? matched.desc : "Corporate algorithmic priorities screening"
    }
  })

  const dynamicWeaknesses = (() => {
    if (!hasSubmissions) {
      return []
    }
    const weakTopics: Record<string, { count: number, explanation: string }> = {}
    submissions.forEach(sub => {
      sub.questions.forEach(q => {
        if (!q.is_correct) {
          if (!weakTopics[q.topic]) {
            weakTopics[q.topic] = { count: 0, explanation: q.explanation || "Requires additional conceptual and boundary training." }
          }
          weakTopics[q.topic].count += 1
        }
      })
    })
    return Object.entries(weakTopics).map(([topic, data], idx) => ({
      weakness_id: `weak-${idx}`,
      weak_topic: topic,
      weakness_reason: `Struggled with accuracy checks. AI suggests: ${data.explanation}`,
      severity: data.count >= 2 ? "Critical" : "Moderate",
      detected_frequency: data.count,
      last_detected: "Active"
    }))
  })()

  const adaptivePrepQueue = [
    { step: 1, topic: "Arrays & Strings", desc: "Beginner foundations, hash bounds, segment tables.", difficulty: "Beginner", percentage: 0 },
    { step: 2, topic: "Linked Lists & Stacks", desc: "Monotonic layouts, sliding windows, buffer tracking.", difficulty: "Beginner", percentage: 0 },
    { step: 3, topic: "Two Pointers", desc: "Linear interval reduction, partition searches.", difficulty: "Intermediate", percentage: 0 },
    { step: 4, topic: "Binary Search", desc: "Divide and conquer bounds, sorted arrays.", difficulty: "Intermediate", percentage: 0 },
    { step: 5, topic: "Recursion & Backtracking", desc: "DFS combinatorial paths, permutation trees.", difficulty: "Intermediate", percentage: 0 },
    { step: 6, topic: "BSTs & Hashmaps", desc: "Pointer manipulation, search tree properties.", difficulty: "Advanced", percentage: 0 },
    { step: 7, topic: "Dynamic Programming", desc: "Memoization patterns, optimal subproblem equations.", difficulty: "Advanced", percentage: 0 },
    { step: 8, topic: "Graphs & Tree Algorithms", desc: "Topological sorting, cycle paths, optimal routing.", difficulty: "Advanced", percentage: 0 }
  ].map(step => {
    if (!hasSubmissions) {
      return { ...step, percentage: 0 }
    }
    const stats = dynamicTopics.find(t => t.topic_name.toLowerCase().includes(step.topic.split(" ")[0].toLowerCase()))
    return {
      ...step,
      percentage: stats ? stats.readiness_percentage : 0
    }
  })

  return (
    <div className="flex flex-col gap-6 font-sans">
      {/* Title block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div>
          <h1 className="text-3xl font-black bg-gradient-to-r from-violet-200 via-indigo-100 to-slate-200 bg-clip-text text-transparent flex items-center gap-2">
            <Brain className="w-8 h-8 text-primary" /> DSA Buddy Intelligence Portal
          </h1>
          <p className="text-xs text-slate-400 mt-1">Real-time analytical insights derived from student code execution and AI review telemetry.</p>
        </div>

        {/* Live Broadcast Indicator */}
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Live Supabase Sync Active</span>
        </div>
      </div>

      {/* Real-time Toast alert wrapper */}
      {latestSub && (
        <div className="p-3.5 bg-gradient-to-r from-violet-950/40 to-indigo-950/40 border border-primary/20 rounded-2xl flex items-center justify-between animate-fade-in shadow-[0_0_15px_rgba(99,102,241,0.08)]">
          <div className="flex items-center gap-3">
            <MessageSquareCode className="w-5 h-5 text-violet-400" />
            <div className="flex flex-col">
              <span className="text-[10px] text-violet-400 uppercase font-bold tracking-wider">Latest Submission Processed</span>
              <span className="text-xs font-semibold text-slate-200">
                '{latestSub.question_title}' scored {latestSub.scores.correctness}% Correctness & {latestSub.scores.optimization}% Optimization
              </span>
            </div>
          </div>
          <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-950/30 text-emerald-400 border border-emerald-900/30 font-bold uppercase">
            {latestSub.status}
          </span>
        </div>
      )}

      {/* Grid Layout Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Overall Readiness Gauge (Phase 7) */}
        <Card className="border-white/10 bg-slate-900/20 backdrop-blur-md rounded-3xl flex flex-col justify-between overflow-hidden shadow-2xl relative group hover:border-white/20 transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-xl pointer-events-none group-hover:scale-125 transition-all duration-500" />
          <CardHeader className="pb-3 border-b border-white/5">
            <CardTitle className="text-xs uppercase tracking-widest font-bold flex items-center gap-2 text-slate-300">
              <Target className="w-4 h-4 text-violet-400" /> Overall Readiness
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 flex flex-col items-center gap-4 justify-between h-full">
            <div className="flex flex-col items-center gap-3 relative">
              <ProgressRing percentage={activeReadiness} size={130} strokeWidth={8} colorClass="text-primary" showText={false} />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                <span className="text-3xl font-black text-slate-100">{activeReadiness.toFixed(1)}%</span>
                <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Mastery</span>
              </div>
            </div>

            {/* Formula Inputs breakdown */}
            <div className="w-full border-t border-white/5 pt-4 mt-2">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Readiness Weight Index</span>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div className="flex justify-between p-2 rounded-xl bg-white/[0.01] border border-white/5">
                  <span className="text-slate-400">Consistency</span>
                  <span className="font-bold text-slate-200">{consistencyVal}%</span>
                </div>
                <div className="flex justify-between p-2 rounded-xl bg-white/[0.01] border border-white/5">
                  <span className="text-slate-400">Optimization</span>
                  <span className="font-bold text-slate-200">{optimizationVal.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between p-2 rounded-xl bg-white/[0.01] border border-white/5">
                  <span className="text-slate-400">Hard Solves</span>
                  <span className="font-bold text-slate-200">{hardSolveVal.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between p-2 rounded-xl bg-white/[0.01] border border-white/5">
                  <span className="text-slate-400">Coding Speed</span>
                  <span className="font-bold text-slate-200">{speedVal}%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dynamic Radar/Breakdown Chart of Topics */}
        <Card className="border-white/10 bg-slate-900/20 backdrop-blur-md rounded-3xl hover:border-white/20 transition-all duration-300">
          <CardHeader className="pb-3 border-b border-white/5">
            <CardTitle className="text-xs uppercase tracking-widest font-bold flex items-center gap-2 text-slate-300">
              <BookOpen className="w-4 h-4 text-emerald-400" /> Algorithmic Topic Coverage
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5 flex flex-col gap-4">
            {dynamicTopics.map(t => (
              <div key={t.topic_name} className="flex flex-col gap-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-300">{t.topic_name}</span>
                  <span className="text-slate-400">{t.readiness_percentage.toFixed(1)}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-800/80 rounded-full overflow-hidden flex items-center">
                  <div 
                    style={{ width: `${t.readiness_percentage}%` }} 
                    className={`h-full rounded-full bg-gradient-to-r ${
                      t.readiness_percentage >= 80 ? "from-emerald-500 to-teal-400" :
                      t.readiness_percentage >= 50 ? "from-amber-500 to-orange-400" :
                      "from-rose-500 to-red-400"
                    }`} 
                  />
                </div>
                <div className="flex justify-between text-[9px] text-slate-500">
                  <span>Confidence: <span className="font-bold text-slate-400">{t.confidence_level}</span></span>
                  <span>{t.solved_count} solved</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
 
        {/* Mock Online Assessment Engine Console */}
        <Card className="border-white/10 bg-slate-900/20 backdrop-blur-md rounded-3xl hover:border-white/20 transition-all duration-300 overflow-hidden flex flex-col justify-between">
          <CardHeader className="pb-3 border-b border-white/5">
            <CardTitle className="text-xs uppercase tracking-widest font-bold flex items-center gap-2 text-slate-300">
              <Award className="w-4 h-4 text-blue-400" /> Mock OA Simulator
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5 flex flex-col justify-between h-full gap-4">
            {!inOASession ? (
              <div className="flex flex-col gap-4">
                <span className="text-xs text-slate-300 leading-normal">
                  Simulate high-pressure corporate technical screening environments to benchmark cognitive endurance.
                </span>
                
                <div className="flex flex-col gap-2">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Target Placement Target</label>
                  <select 
                    value={oaCompany} 
                    onChange={(e) => setOaCompany(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-white/10 bg-slate-950 text-slate-200 text-xs focus:ring-0 focus:outline-none"
                  >
                    {finalTargets.map(c => (
                      <option key={c.name} value={c.name}>
                        {c.name} ({c.desc})
                      </option>
                    ))}
                  </select>
                </div>

                <button 
                  onClick={handleStartOASession}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold transition-all duration-300 flex items-center justify-center gap-2 active:scale-98 shadow-md cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5" /> Start Timed Mock Session
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-4 p-3 bg-white/[0.01] border border-white/5 rounded-2xl">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-200">{oaCompany} Simulation</span>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-bold font-mono">
                    <Clock className="w-3.5 h-3.5" /> {formatTime(oaTimeLeft)}
                  </div>
                </div>

                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Total Solved:</span>
                  <span className="font-bold text-slate-100">{oaQuestionsSolved} / 3 Challenges</span>
                </div>

                <div className="flex gap-2">
                  <button 
                    onClick={() => setOaQuestionsSolved(prev => Math.min(3, prev + 1))}
                    className="flex-1 py-2 rounded-lg bg-emerald-950/30 text-emerald-400 border border-emerald-900/40 hover:bg-emerald-900/30 text-[10px] font-bold uppercase transition-all active:scale-95 cursor-pointer"
                  >
                    Solve Challenge
                  </button>
                  <button 
                    onClick={handleEndOASession}
                    className="flex-1 py-2 rounded-lg bg-rose-950/30 text-rose-400 border border-rose-900/40 hover:bg-rose-900/30 text-[10px] font-bold uppercase transition-all active:scale-95 cursor-pointer"
                  >
                    Finish Session
                  </button>
                </div>
              </div>
            )}

            {/* Company Match Prediction Gauge list */}
            <div className="border-t border-white/5 pt-4 mt-2">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Company Target Match %</span>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                {companies.map(c => (
                  <div key={c.company_name} className="flex items-center justify-between p-2 rounded-xl bg-white/[0.01] border border-white/5">
                    <span className="text-slate-400 font-semibold">{c.company_name}</span>
                    <span className="font-bold text-indigo-400">{c.match_percentage.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Weakness report section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Active Weakness list */}
        <Card className="border-white/10 bg-slate-900/20 backdrop-blur-md rounded-3xl lg:col-span-1 hover:border-white/20 transition-all duration-300">
          <CardHeader className="pb-3 border-b border-white/5">
            <CardTitle className="text-xs uppercase tracking-widest font-bold flex items-center gap-2 text-slate-300">
              <AlertTriangle className="w-4 h-4 text-amber-400 animate-pulse" /> Weakness Tracking
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5 flex flex-col gap-3">
            {dynamicWeaknesses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-slate-500 text-xs gap-1">
                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                <span>Zero weaknesses detected. Excellent mastery!</span>
              </div>
            ) : (
              dynamicWeaknesses.map(w => (
                <div key={w.weakness_id} className="p-3 bg-white/[0.01] border border-white/5 rounded-2xl flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-200">{w.weak_topic}</span>
                    <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase ${
                      w.severity === "Critical" ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                    }`}>
                      {w.severity}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 leading-normal">{w.weakness_reason}</span>
                  <div className="flex justify-between items-center text-[9px] text-slate-500 border-t border-white/5 pt-2 mt-1">
                    <span>Frequency: <span className="font-bold text-slate-400">{w.detected_frequency}x</span></span>
                    <span className="text-indigo-400 font-bold uppercase text-[8px] tracking-wider">AI Tracked</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
 
        {/* Adaptive Curation Recommendations */}
        <Card className="border-white/10 bg-slate-900/20 backdrop-blur-md rounded-3xl lg:col-span-2 hover:border-white/20 transition-all duration-300">
          <CardHeader className="pb-3 border-b border-white/5">
            <CardTitle className="text-xs uppercase tracking-widest font-bold flex items-center gap-2 text-slate-300">
              <Lightbulb className="w-4 h-4 text-amber-300" /> Adaptive Preparation Queue
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5 flex flex-col gap-3">
            {adaptivePrepQueue.map(q => (
              <div key={q.step} className="p-3.5 bg-white/[0.01] border border-white/5 hover:border-primary/20 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all duration-300">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-xs text-primary shrink-0">
                    S{q.step}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-slate-200">{q.topic}</span>
                      <span className={`text-[8px] px-1.5 py-0.5 rounded font-black uppercase tracking-wider ${
                        q.difficulty === "Beginner" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                        q.difficulty === "Intermediate" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                        "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                      }`}>
                        {q.difficulty}
                      </span>
                      {q.percentage < 40 && (
                        <span className="px-1.5 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[8px] font-bold rounded uppercase tracking-widest">
                          Next Focus
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 leading-normal">{q.desc}</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[9px] text-slate-500">Mastery Level:</span>
                      <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden flex items-center">
                        <div 
                          style={{ width: `${q.percentage}%` }}
                          className={`h-full rounded-full ${q.percentage >= 75 ? "bg-emerald-500" : q.percentage >= 40 ? "bg-amber-500" : "bg-indigo-500"}`} 
                        />
                      </div>
                      <span className="text-[9px] text-slate-300 font-bold">{Math.round(q.percentage)}%</span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    const levelMap: Record<number, number> = {
                      1: 1, // Arrays & Strings
                      2: 2, // Lists, Stacks & Queues
                      3: 3, // Two Pointers -> Search & Sorting Logic
                      4: 3, // Binary Search -> Search & Sorting Logic
                      5: 5, // Recursion -> Graphs & Priority
                      6: 4, // BSTs -> Trees & Skew BSTs
                      7: 6, // DP -> DP & Prefix Trees
                      8: 5  // Graphs -> Graphs & Priority
                    }
                    const targetLevel = levelMap[q.step] || 1
                    setActiveArenaLevel(targetLevel)
                    addToast({ title: `Navigating to ${q.topic}`, description: `Loading Arena Level ${targetLevel}...`, type: "info" })
                    navigate({ to: "/dsa-buddy/arena" })
                  }}
                  className="px-3.5 py-1.5 bg-slate-950 border border-white/10 hover:border-primary text-slate-300 hover:text-white rounded-xl text-[10px] font-bold uppercase transition-all duration-300 active:scale-95 flex items-center gap-1.5 shrink-0 self-end sm:self-center cursor-pointer"
                >
                  <Play className="w-2.5 h-2.5" /> Practice
                </button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
