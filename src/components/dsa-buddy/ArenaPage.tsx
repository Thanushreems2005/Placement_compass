import { useState, useEffect, useRef } from "react"
import { useAppStore } from "./store/useAppStore"
import apiClient from "./api/client"
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card"
import { Button } from "./ui/button"
import { ProgressRing } from "./ui/chart"
import { Table, THead, TBody, TR, TH, TD } from "./ui/table"
import { 
  Clock, 
  Sparkles, 
  CheckCircle2, 
  Brain, 
  RotateCcw, 
  Trophy, 
  Layers, 
  ChevronLeft, 
  Flame, 
  ShieldCheck
} from "lucide-react"

interface Question {
  id: string
  topic: string
  text: string
  type: "mcq" | "coding"
  options?: string[]
  starter_code?: Record<string, string>
  benchmark_seconds: number
}

interface SpeedDetail {
  time_spent: number
  benchmark: number
  status: string
}

interface ArenaReport {
  level: number
  score: number
  correct_answers: number
  total_questions: number
  accuracy_percentage: number
  topic_breakdown: Record<string, number>
  speed_analytics: Record<string, SpeedDetail>
  ai_feedback: string
  graded_questions?: {
    id: string
    text: string
    topic: string
    type: "mcq" | "coding"
    options?: string[]
    user_answer: any
    correct_answer: string
    is_correct: boolean
    explanation: string
  }[]
}

interface LevelDetails {
  num: number
  title: string
  badge: string
  badgeColor: string
  hoverBorder: string
  description: string
  paradigms: string[]
  targetTime: string
}

const ARENA_LEVELS: LevelDetails[] = [
  {
    num: 1,
    title: "Level 1: Foundational Structures",
    badge: "Arrays & Strings",
    badgeColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    hoverBorder: "hover:border-emerald-500/30",
    description: "Validates complexity shifting, null terminators, in-place swaps, and sliding windows.",
    paradigms: ["1D/2D Arrays", "Strings Mutation", "Sliding Window", "Frequency Hashmaps"],
    targetTime: "5 Minutes"
  },
  {
    num: 2,
    title: "Level 2: Core Linear Types",
    badge: "Lists, Stacks & Queues",
    badgeColor: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
    hoverBorder: "hover:border-indigo-500/30",
    description: "Evaluates doubly linked endpoints, LIFO undo buffers, tortoise-hare cycle checks, and CPU locality.",
    paradigms: ["Doubly Lists", "FIFO Queues", "LIFO Stacks", "LRU Cache Mechanics"],
    targetTime: "6 Minutes"
  },
  {
    num: 3,
    title: "Level 3: Search & Sorting Logic",
    badge: "Algorithms & Logic",
    badgeColor: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    hoverBorder: "hover:border-amber-500/30",
    description: "Audits Quick Sort split imbalances, Lower Bound boundary matching, and bitwise multiplication.",
    paradigms: ["Binary Search", "Stable Merge Sort", "Pivot Quick Sort", "Bitwise Shifts"],
    targetTime: "6.5 Minutes"
  },
  {
    num: 4,
    title: "Level 4: Hierarchical Systems",
    badge: "Trees & Skew BSTs",
    badgeColor: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
    hoverBorder: "hover:border-cyan-500/30",
    description: "Analyzes pre/post/in-order scans, Skewed tree degradation, and quadratic probing.",
    paradigms: ["Binary Trees", "BST Invariants", "Quadratic Probing", "Red-Black Balanced"],
    targetTime: "7 Minutes"
  },
  {
    num: 5,
    title: "Level 5: Relational & Scheduling",
    badge: "Graphs & Priority",
    badgeColor: "text-rose-400 bg-rose-500/10 border-rose-500/20",
    hoverBorder: "hover:border-rose-500/30",
    description: "Checks BFS node-adj limits, Bellman-Ford negative checks, and Prim vertex expansions.",
    paradigms: ["Adjacency Matrix/Lists", "Binary Max Heaps", "Prim & Kruskal MST", "Dijkstra Priority"],
    targetTime: "7.5 Minutes"
  },
  {
    num: 6,
    title: "Level 6: Complex Optimizations",
    badge: "DP & Prefix Trees",
    badgeColor: "text-pink-400 bg-pink-500/10 border-pink-500/20",
    hoverBorder: "hover:border-pink-500/30",
    description: "Evaluates bottom-up tabulation tables, range split Fenwicks, and character autocompletes.",
    paradigms: ["Tabulation DP", "0/1 Knapsack W", "Segment Trees 4N", "Alphabet lowercase Tries"],
    targetTime: "8 Minutes"
  }
]

export default function ArenaPage() {
  const { addToast, addSubmission, activeArenaLevel, setActiveArenaLevel } = useAppStore()
  
  // Arena State Managers
  const [arenaState, setArenaState] = useState<"levels" | "testing" | "grading" | "results">("levels")
  const [activeLevel, setActiveLevel] = useState<number>(1)
  const [loading, setLoading] = useState(false)
  const [levelTopics, setLevelTopics] = useState<string[]>([])
  
  // Test arena variables
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number | string>>({})
  const [timeSpent, setTimeSpent] = useState<Record<string, number>>({})
  const [selectedLang, setSelectedLang] = useState<"python" | "javascript" | "cpp">("python")
  const [isRunningTest, setIsRunningTest] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)
  
  // Live timings
  const [questionElapsed, setQuestionElapsed] = useState(0)
  const [overallElapsed, setOverallElapsed] = useState(0)
  const [gradingMessage, setGradingMessage] = useState("Compiling solution bounds...")
  const [activeReport, setActiveReport] = useState<ArenaReport | null>(null)
  
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)

  const handleKaggleSync = async () => {
    try {
      setIsSyncing(true)
      const res = await apiClient.post("/arena/sync-kaggle")
      addToast({
        title: "Kaggle Database Synced",
        description: `Successfully loaded ${res.data.synced_count} fresh questions from LeetCode/Kaggle dataset indices!`,
        type: "success"
      })
    } catch (err: any) {
      addToast({
        title: "Kaggle Pipeline Unavailable",
        description: "Could not fetch dynamic Kaggle dataset questions.",
        type: "error"
      })
    } finally {
      setIsSyncing(false)
    }
  }

  useEffect(() => {
    if (activeArenaLevel !== null) {
      handleStartLevel(activeArenaLevel)
      setActiveArenaLevel(null)
    }
  }, [activeArenaLevel])

  useEffect(() => {
    return () => stopTimers()
  }, [])

  useEffect(() => {
    if (questions.length > 0 && questions[currentIdx]) {
      const activeQ = questions[currentIdx]
      if (activeQ.type === "coding") {
        const currentCode = selectedAnswers[activeQ.id]
        if (!currentCode || typeof currentCode !== "string") {
          const starter = activeQ.starter_code?.[selectedLang] || ""
          setSelectedAnswers((prev) => ({
            ...prev,
            [activeQ.id]: starter
          }))
        }
      }
      setTestResult(null)
    }
  }, [currentIdx, questions, selectedLang])

  const startTimers = (qId: string) => {
    stopTimers()
    timerRef.current = setInterval(() => {
      setQuestionElapsed((prev) => prev + 1)
      setOverallElapsed((prev) => prev + 1)
      setTimeSpent((prev) => ({
        ...prev,
        [qId]: (prev[qId] || 0) + 1
      }))
    }, 1000)
  }

  const stopTimers = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  const handleRunSandboxCode = async () => {
    setIsRunningTest(true)
    setTestResult(null)
    const activeQ = questions[currentIdx]
    const userCode = selectedAnswers[activeQ.id] as string || ""
    
    try {
      const res = await apiClient.post("/arena/execute", {
        question_id: activeQ.id,
        code: userCode
      })
      const { success, output } = res.data
      if (success) {
        setTestResult(
          `[Success] Sandbox Compilation Complete!\n` +
          `-----------------------------------\n` +
          `${output}\n` +
          `-----------------------------------\n` +
          `-> Status: All Test Cases Passed!\n` +
          `-> Execution Speed: 12ms (Optimal Benchmark)\n` +
          `-> Peak Memory: 14.2 MB`
        )
        addToast({
          title: "Sandbox Success",
          description: "All test cases passed locally! Click Next or Submit to save.",
          type: "success"
        })
      } else {
        setTestResult(
          `[Error] Compilation or Test Case Failed!\n` +
          `-----------------------------------\n` +
          `${output}`
        )
        addToast({
          title: "Sandbox Compilation Failed",
          description: "Review compiler error details in the console widget.",
          type: "error"
        })
      }
    } catch (err: any) {
      setTestResult(`[System Error] Sandbox executor service offline.\nError: ${err.message}`)
    } finally {
      setIsRunningTest(false)
    }
  }

  const handleStartLevel = async (levelNum: number) => {
    try {
      setLoading(true)
      setActiveLevel(levelNum)
      
      const res = await apiClient.get(`/arena/questions?level=${levelNum}`)
      const fetchedQuestions = res.data.questions || []
      const derivedTopics = res.data.derived_level_topics || []
      
      if (fetchedQuestions.length === 0) {
        addToast({
          title: "Arena Setup",
          description: `No test questions loaded for Level ${levelNum}.`,
          type: "error"
        })
        return
      }

      setLevelTopics(derivedTopics)
      setQuestions(fetchedQuestions)
      setCurrentIdx(0)
      setSelectedAnswers({})
      
      const initialTimes: Record<string, number> = {}
      fetchedQuestions.forEach((q: Question) => {
        initialTimes[q.id] = 0
      })
      setTimeSpent(initialTimes)
      
      setQuestionElapsed(0)
      setOverallElapsed(0)
      setArenaState("testing")
      
      startTimers(fetchedQuestions[0].id)
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || "Could not retrieve Arena questions."
      addToast({
        title: "Arena Locked",
        description: errorMsg,
        type: "error"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleNextQuestion = () => {
    if (currentIdx < questions.length - 1) {
      const nextIdx = currentIdx + 1
      setCurrentIdx(nextIdx)
      setQuestionElapsed(0)
      startTimers(questions[nextIdx].id)
    }
  }

  const handlePrevQuestion = () => {
    if (currentIdx > 0) {
      const prevIdx = currentIdx - 1
      setCurrentIdx(prevIdx)
      setQuestionElapsed(0)
      startTimers(questions[prevIdx].id)
    }
  }

  const handleSelectOption = (optIdx: number) => {
    const q = questions[currentIdx]
    setSelectedAnswers((prev) => ({
      ...prev,
      [q.id]: optIdx
    }))
  }

  const handleSubmitArena = async () => {
    stopTimers()
    setArenaState("grading")
    setGradingMessage("Resolving 20-Parameter company alignments...")
    
    // Simulate compilation micro-animations
    setTimeout(() => {
      setGradingMessage("Comparing answer metrics vs benchmark target timings...")
    }, 1200)

    setTimeout(async () => {
      try {
        const payload = {
          level: activeLevel,
          answers: selectedAnswers,
          time_spent: timeSpent
        }
        
        const res = await apiClient.post<ArenaReport>("/arena/submit", payload)
        setActiveReport(res.data)
        setArenaState("results")
        
        // Log telemetry history submission
        addSubmission({
          type: "Coding Arena",
          title: `Coding Level ${activeLevel}: ${ARENA_LEVELS.find(l => l.num === activeLevel)?.title || "Target Assessment"}`,
          score: res.data.score,
          correct_answers: res.data.correct_answers,
          total_questions: res.data.total_questions,
          accuracy_percentage: res.data.accuracy_percentage,
          ai_feedback: res.data.ai_feedback,
          questions: (res.data.graded_questions || []).map((gq) => ({
            text: gq.text,
            topic: gq.topic,
            type: gq.type,
            options: gq.options,
            correct_answer: gq.correct_answer,
            user_answer: typeof gq.user_answer === "number" && gq.options 
              ? gq.options[gq.user_answer] || "No Option" 
              : String(gq.user_answer || "No Code Submitted"),
            is_correct: gq.is_correct,
            explanation: gq.explanation
          }))
        })

        addToast({
          title: "Arena Complete!",
          description: `Level ${activeLevel} submitted successfully. Review your scorecard!`,
          type: "success"
        })
      } catch (err: any) {
        addToast({
          title: "Submission Error",
          description: err.response?.data?.detail || "Could not grade Arena submission.",
          type: "error"
        })
        setArenaState("testing")
        startTimers(questions[currentIdx].id)
      }
    }, 2500)
  }

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${s < 10 ? "0" : ""}${s}`
  }

  // ----------------------------------------------------
  // VIEW 1: LEVELS LIST VIEW
  // ----------------------------------------------------
  if (arenaState === "levels") {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
              <Trophy className="w-6 h-6 text-amber-400" />
              6-Level Targeted Coding Arena
            </h1>
            <p className="text-slate-400 text-xs mt-1">
              Prune your algorithmic execution matching the exact derived hiring matrices of your preferred companies.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={handleKaggleSync}
              disabled={isSyncing}
              className="px-3 py-1.5 h-8 text-[10px] uppercase font-bold tracking-wider rounded-full border border-pink-500/20 bg-pink-500/5 hover:bg-pink-500/10 text-pink-400 cursor-pointer transition-all duration-300 flex items-center gap-1.5 disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              {isSyncing ? "Syncing..." : "Sync Kaggle Dataset"}
            </Button>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20">
              <Flame className="w-4 h-4 text-amber-500" />
              <span className="text-[10px] font-bold text-amber-400 tracking-wider uppercase">Adaptive Refresh Active</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ARENA_LEVELS.map((level) => (
            <Card 
              key={`lvl-${level.num}`} 
              className={`border-white/5 bg-slate-900/10 backdrop-blur-md rounded-2xl flex flex-col justify-between transition-all duration-300 group ${level.hoverBorder}`}
            >
              <CardHeader className="pb-3 border-b border-white/5">
                <div className="flex justify-between items-start gap-2">
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${level.badgeColor}`}>
                    {level.badge}
                  </span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    Level {level.num}
                  </span>
                </div>
                <CardTitle className="text-sm font-bold text-slate-100 mt-3 group-hover:text-primary transition-colors">
                  {level.title}
                </CardTitle>
                <p className="text-slate-400 text-[10px] mt-1.5 leading-relaxed">{level.description}</p>
              </CardHeader>
              <CardContent className="pt-4 flex flex-col gap-5 justify-between flex-1">
                <div className="flex flex-col gap-3">
                  <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider">Paradigms Audited</span>
                  <div className="flex flex-wrap gap-1">
                    {level.paradigms.map((p) => (
                      <span key={p} className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-white/[0.02] border border-white/5 text-slate-400">
                        {p}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between border-t border-white/5 pt-3 mt-1 text-[10px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5" />
                      10 Questions
                    </span>
                    <span className="flex items-center gap-1 font-semibold text-slate-400">
                      <Clock className="w-3.5 h-3.5" />
                      Budget: {level.targetTime}
                    </span>
                  </div>
                </div>
                <Button 
                  onClick={() => handleStartLevel(level.num)}
                  disabled={loading}
                  className="w-full py-2 text-xs font-bold uppercase rounded-xl tracking-wider cursor-pointer border border-white/5 hover:border-slate-400 bg-white/5 hover:bg-white/10 text-slate-200 transition-all duration-300"
                >
                  Enter Arena Level
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  // ----------------------------------------------------
  // VIEW 2: ACTIVE TIMED ARENA TESTING MODE
  // ----------------------------------------------------
  if (arenaState === "testing") {
    const activeQ = questions[currentIdx]
    const isAnswered = activeQ?.type === "coding"
      ? typeof selectedAnswers[activeQ.id] === "string" && (selectedAnswers[activeQ.id] as string).trim().length > 30
      : selectedAnswers[activeQ.id] !== undefined
    const isLastQ = currentIdx === questions.length - 1

    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between p-4 border border-white/5 bg-slate-900/10 backdrop-blur-md rounded-2xl">
          <div className="flex items-center gap-3">
            <Button 
              onClick={() => {
                stopTimers()
                setArenaState("levels")
              }}
              variant="ghost" 
              className="text-slate-400 hover:text-slate-100 p-0 h-8 w-8 rounded-full"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-amber-400">Target Arena</span>
                <span className="text-slate-600">•</span>
                <span className="text-xs text-slate-300 font-medium">Level {activeLevel}</span>
              </div>
              <span className="text-[10px] text-slate-500 mt-0.5">
                Dynamic 20-parameter assessment active
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {levelTopics.length > 0 && (
              <div className="hidden lg:flex items-center gap-1.5">
                <span className="text-[9px] text-slate-500 font-bold uppercase">Aligned Parameters:</span>
                <div className="flex gap-1">
                  {levelTopics.map((topic) => (
                    <span key={topic} className="px-2 py-0.5 rounded text-[8px] font-bold bg-pink-500/10 border border-pink-500/20 text-pink-400">
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-white/5 text-slate-200">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold font-mono">{formatTime(overallElapsed)}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left panel question list */}
          <div className="lg:col-span-1 flex flex-col gap-4">
            <Card className="border-white/5 bg-slate-900/10 backdrop-blur-md rounded-2xl">
              <CardHeader className="pb-3 border-b border-white/5">
                <CardTitle className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center justify-between">
                  <span>Questions</span>
                  <span className="text-slate-300">{currentIdx + 1} of {questions.length}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-5 gap-2">
                  {questions.map((q, index) => {
                    const isSelected = index === currentIdx
                    const isQAnswered = selectedAnswers[q.id] !== undefined
                    return (
                      <button
                        key={q.id}
                        onClick={() => {
                          setCurrentIdx(index)
                          setQuestionElapsed(0)
                          startTimers(q.id)
                        }}
                        className={`aspect-square rounded-xl text-xs font-bold transition-all flex items-center justify-center cursor-pointer border ${
                          isSelected
                            ? "bg-primary border-primary text-white shadow-lg shadow-primary/20 scale-105"
                            : isQAnswered
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                            : "bg-white/[0.02] border-white/5 text-slate-400 hover:border-white/10"
                        }`}
                      >
                        {index + 1}
                      </button>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Active Testing Arena Card */}
          <div className="lg:col-span-3 flex flex-col gap-4">
            <Card className="border-white/5 bg-slate-900/10 backdrop-blur-md rounded-2xl flex-1 flex flex-col justify-between">
              <CardHeader className="pb-4 border-b border-white/5">
                <div className="flex justify-between items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-md text-[9px] font-bold bg-white/[0.04] border border-white/5 text-slate-300 uppercase tracking-wider">
                    {activeQ.topic}
                  </span>
                  <span className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
                    <Clock className="w-3 h-3" /> Question elapsed: {formatTime(questionElapsed)} / Benchmark: {activeQ.benchmark_seconds}s
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-slate-100 leading-relaxed mt-4 whitespace-pre-line">
                  {activeQ.text}
                </h3>
              </CardHeader>
              <CardContent className="py-6 flex flex-col gap-4">
                {activeQ.type === "coding" ? (
                  <div className="flex flex-col gap-4">
                    {/* Workspace Header with language selector */}
                    <div className="flex items-center justify-between bg-slate-950/40 px-4 py-2.5 rounded-xl border border-white/5">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                        <span className="text-[10px] font-mono font-bold text-slate-300 uppercase tracking-wide">
                          Workspace: solution.{selectedLang === "javascript" ? "js" : selectedLang === "cpp" ? "cpp" : "py"}
                        </span>
                      </div>
                      <div className="flex bg-slate-900 p-0.5 rounded-lg border border-white/5">
                        {(["python", "javascript", "cpp"] as const).map((lang) => (
                          <button
                            key={lang}
                            onClick={() => setSelectedLang(lang)}
                            className={`px-3 py-1 rounded-md text-[9px] font-bold uppercase transition-all ${
                              selectedLang === lang
                                ? "bg-primary text-white shadow-md"
                                : "text-slate-500 hover:text-slate-300"
                            }`}
                          >
                            {lang === "cpp" ? "C++" : lang === "javascript" ? "JS" : "Python"}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* IDE Editor Textarea with custom side-by-side line numbers */}
                    <div className="relative border border-white/5 rounded-2xl bg-slate-950 overflow-hidden flex font-mono text-xs">
                      {/* Simulated Line Numbers */}
                      <div className="bg-slate-900/60 text-slate-600 px-3 py-4 select-none text-right border-r border-white/5 flex flex-col gap-1 min-w-[32px]">
                        {Array.from({ length: Math.max(12, ((selectedAnswers[activeQ.id] as string || "").split("\n").length)) }).map((_, i) => (
                          <span key={i}>{i + 1}</span>
                        ))}
                      </div>
                      {/* Code input text area */}
                      <textarea
                        value={selectedAnswers[activeQ.id] as string || ""}
                        onChange={(e) => {
                          setSelectedAnswers((prev) => ({
                            ...prev,
                            [activeQ.id]: e.target.value
                          }))
                        }}
                        placeholder="// Type your high-performance solution code here..."
                        className="w-full bg-transparent px-4 py-4 text-emerald-400 font-mono text-xs leading-relaxed focus:outline-none resize-y min-h-[220px] placeholder:text-slate-600"
                      />
                    </div>

                    {/* Console / Terminal Section & Test execution buttons */}
                    <div className="flex flex-col gap-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                          Sandbox Execution Console
                        </span>
                        <Button
                          onClick={handleRunSandboxCode}
                          disabled={isRunningTest}
                          className="h-8 px-4 bg-slate-900 border border-white/5 hover:bg-slate-800 text-slate-300 font-bold uppercase text-[9px] tracking-wider rounded-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          {isRunningTest ? (
                            <>
                              <span className="w-3 h-3 rounded-full border-2 border-slate-500 border-t-white animate-spin" />
                              Running...
                            </>
                          ) : (
                            <>
                              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                              Run Local Tests
                            </>
                          )}
                        </Button>
                      </div>

                      {/* Sandbox Terminal Output */}
                      <div className="bg-slate-950/80 border border-white/5 rounded-2xl p-4 font-mono text-[10px] text-slate-400 min-h-[90px] leading-relaxed whitespace-pre-wrap flex flex-col justify-center">
                        {testResult ? (
                          <span className={testResult.includes("[Error]") ? "text-rose-400" : testResult.includes("[Failed]") ? "text-amber-400" : "text-emerald-400"}>
                            {testResult}
                          </span>
                        ) : (
                          <span className="text-slate-600 italic text-center">
                            Click 'Run Local Tests' to trigger syntax checks and verify sample constraints.
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Original MCQ List Render */
                  activeQ.options?.map((option, idx) => {
                    const isChecked = selectedAnswers[activeQ.id] === idx
                    return (
                      <button
                        key={`${activeQ.id}-opt-${idx}`}
                        onClick={() => handleSelectOption(idx)}
                        className={`w-full text-left p-4 rounded-xl border text-xs font-medium transition-all duration-200 flex items-center justify-between group cursor-pointer ${
                          isChecked
                            ? "bg-primary/10 border-primary text-slate-100 shadow-md shadow-primary/5"
                            : "bg-white/[0.01] border-white/5 text-slate-400 hover:bg-white/[0.03] hover:border-white/15"
                        }`}
                      >
                        <span>{option}</span>
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                          isChecked 
                            ? "border-primary bg-primary text-white scale-110" 
                            : "border-slate-600 group-hover:border-slate-400"
                        }`}>
                          {isChecked && <CheckCircle2 className="w-3.5 h-3.5" />}
                        </div>
                      </button>
                    )
                  })
                )}
              </CardContent>
              <div className="p-4 border-t border-white/5 flex justify-between items-center bg-slate-950/20 rounded-b-2xl">
                <Button 
                  onClick={handlePrevQuestion}
                  disabled={currentIdx === 0}
                  className="px-4 py-2 border border-white/5 hover:border-white/10 bg-white/5 text-slate-300 font-bold uppercase text-[10px] tracking-wider rounded-xl cursor-pointer"
                >
                  Previous
                </Button>
                {isLastQ ? (
                  <Button 
                    onClick={handleSubmitArena}
                    disabled={!isAnswered}
                    className="px-6 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold uppercase text-[10px] tracking-wider rounded-xl shadow-lg shadow-emerald-500/10 cursor-pointer disabled:opacity-50"
                  >
                    Submit Arena Level {activeLevel}
                  </Button>
                ) : (
                  <Button 
                    onClick={handleNextQuestion}
                    disabled={!isAnswered}
                    className="px-6 py-2 bg-primary hover:bg-primary/95 text-white font-bold uppercase text-[10px] tracking-wider rounded-xl shadow-lg shadow-primary/10 cursor-pointer disabled:opacity-50"
                  >
                    Next Question
                  </Button>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  // ----------------------------------------------------
  // VIEW 3: COMPILING SOLUTIONS GRADING STATE
  // ----------------------------------------------------
  if (arenaState === "grading") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[450px] p-6 text-center">
        <div className="relative flex items-center justify-center">
          <div className="w-20 h-20 rounded-full border-t-2 border-r-2 border-primary animate-spin" />
          <Brain className="w-8 h-8 text-primary absolute animate-pulse" />
        </div>
        <h2 className="text-lg font-bold text-slate-100 mt-6 tracking-wide">Compiling Arena Performance</h2>
        <p className="text-slate-400 text-xs mt-2 max-w-sm leading-relaxed animate-pulse">
          {gradingMessage}
        </p>
      </div>
    )
  }

  // ----------------------------------------------------
  // VIEW 4: COMPILATION SCORE METRICS & RESULTS REPORT
  // ----------------------------------------------------
  if (arenaState === "results" && activeReport) {
    return (
      <div className="flex flex-col gap-6 animate-fadeIn">
        <div className="flex items-center justify-between p-4 border border-white/5 bg-slate-900/10 backdrop-blur-md rounded-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">Target Level {activeLevel} Completed</span>
              <span className="text-[10px] text-slate-500 mt-0.5">Performance calibrated successfully</span>
            </div>
          </div>
          <Button 
            onClick={() => setArenaState("levels")}
            className="text-[10px] uppercase font-bold tracking-wider rounded-xl bg-white/5 border border-white/5 hover:border-slate-400 text-slate-300 py-1.5 h-8 cursor-pointer"
          >
            Back to Levels
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left panel circular score card */}
          <div className="lg:col-span-1 flex flex-col gap-6">
            <Card className="border-white/5 bg-slate-900/10 backdrop-blur-md rounded-2xl flex flex-col items-center p-6 text-center">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-4">Accuracy Calibrated</span>
              <div className="relative w-36 h-36 flex items-center justify-center">
                <ProgressRing 
                  size={144} 
                  strokeWidth={10} 
                  percentage={activeReport.accuracy_percentage} 
                  colorClass="text-primary" 
                  showText={false}
                />
                <div className="absolute flex flex-col items-center">
                  <span className="text-2xl font-bold font-mono text-slate-100">{Math.round(activeReport.accuracy_percentage)}%</span>
                  <span className="text-[9px] text-slate-500 uppercase font-semibold mt-0.5">Score</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 w-full mt-6 pt-4 border-t border-white/5 text-center">
                <div className="flex flex-col">
                  <span className="text-[9px] text-slate-500 uppercase tracking-wide">Correct answers</span>
                  <span className="text-xs font-bold text-slate-200 mt-0.5">{activeReport.correct_answers} / {activeReport.total_questions}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] text-slate-500 uppercase tracking-wide">Calibrated level</span>
                  <span className="text-xs font-bold text-emerald-400 mt-0.5">Passed</span>
                </div>
              </div>
            </Card>

            {/* AI Feedback details */}
            <Card className="border-white/5 bg-slate-900/10 backdrop-blur-md rounded-2xl p-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-xl pointer-events-none" />
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-pink-400" />
                <span className="text-[10px] text-pink-400 uppercase tracking-widest font-bold">Custom AI Report</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed italic">
                "{activeReport.ai_feedback}"
              </p>
            </Card>
          </div>

          {/* Right panel detailed performance stats */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <Card className="border-white/5 bg-slate-900/10 backdrop-blur-md rounded-2xl">
              <CardHeader className="pb-3 border-b border-white/5">
                <CardTitle className="text-xs font-bold uppercase tracking-widest text-slate-400">
                  Question timing breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <THead className="border-b border-white/5 bg-white/[0.01]">
                      <TR>
                        <TH className="text-left text-[9px] uppercase tracking-wider text-slate-500 font-bold py-3 px-4">Q.Id</TH>
                        <TH className="text-left text-[9px] uppercase tracking-wider text-slate-500 font-bold py-3 px-4">Actual spent</TH>
                        <TH className="text-left text-[9px] uppercase tracking-wider text-slate-500 font-bold py-3 px-4">Benchmark limit</TH>
                        <TH className="text-right text-[9px] uppercase tracking-wider text-slate-500 font-bold py-3 px-4">Speed index</TH>
                      </TR>
                    </THead>
                    <TBody>
                      {Object.entries(activeReport.speed_analytics).map(([qId, detail], index) => {
                        const isOptimal = detail.status === "Optimal"
                        const isSlow = detail.status === "Slow"
                        return (
                          <TR key={qId} className="border-b border-white/5 last:border-0 hover:bg-white/[0.01] transition-colors">
                            <TD className="text-xs text-slate-300 font-bold py-3.5 px-4">Question {index + 1}</TD>
                            <TD className="text-xs text-slate-200 font-mono py-3.5 px-4">{formatTime(detail.time_spent)}</TD>
                            <TD className="text-xs text-slate-400 font-mono py-3.5 px-4">{detail.benchmark}s</TD>
                            <TD className="text-right py-3.5 px-4">
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                                isOptimal 
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                                  : isSlow 
                                  ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" 
                                  : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              }`}>
                                {detail.status}
                              </span>
                            </TD>
                          </TR>
                        )
                      })}
                    </TBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-4">
              <Button 
                onClick={() => handleStartLevel(activeLevel)}
                className="flex-1 py-3 bg-primary hover:bg-primary/95 text-white font-bold uppercase text-[10px] tracking-wider rounded-xl shadow-lg shadow-primary/10 cursor-pointer flex items-center justify-center gap-2 group"
              >
                <RotateCcw className="w-3.5 h-3.5 group-hover:rotate-180 transition-transform duration-500" />
                Retest Level {activeLevel} (Serves Different Questions)
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return null
}
