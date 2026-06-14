import { useState, useEffect, useRef } from "react"
import { useAppStore } from "./store/useAppStore"
import apiClient from "./api/client"
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card"
import { Button } from "./ui/button"
import { Loader } from "./ui/loader"
import { ProgressRing } from "./ui/chart"
import { Table, THead, TBody, TR, TH, TD } from "./ui/table"
import { 
  Award, 
  Clock, 
  Sparkles, 
  CheckCircle2, 
  Brain, 
  ChevronRight, 
  AlertCircle, 
  RotateCcw, 
  Compass, 
  FileText, 
  History, 
  Zap, 
  TrendingUp,
  Target
} from "lucide-react"

interface Question {
  id: string
  topic: string
  text: string
  options: string[]
  benchmark_seconds: number
}

interface AssessmentReport {
  id: string
  user_id: string
  skill_level: string
  score: number
  accuracy: number
  speed_index: number
  speed_category: string
  topic_scores: Record<string, number>
  ai_analysis: string
  completed: boolean
  created_at: string
  graded_questions?: {
    id: string
    text: string
    topic: string
    type: "mcq"
    options: string[]
    user_answer: number | null
    correct_answer: string
    is_correct: boolean
    explanation: string
  }[]
}

export default function AssessmentPage() {
  const { token, setAuth, addToast, addSubmission } = useAppStore()
  
  // Navigation & Core States
  const [assessmentState, setAssessmentState] = useState<"select" | "testing" | "grading" | "results" | "history">("select")
  const [selectedLevel, setSelectedLevel] = useState<"Beginner" | "Intermediate" | "Advanced">("Beginner")
  const [, setLoading] = useState(false)
  const [historyList, setHistoryList] = useState<AssessmentReport[]>([])
  
  // Active Test States
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({})
  const [timeSpent, setTimeSpent] = useState<Record<string, number>>({})
  
  // Live Timers
  const [questionElapsed, setQuestionElapsed] = useState(0)
  const [overallElapsed, setOverallElapsed] = useState(0)
  const [activeReport, setActiveReport] = useState<AssessmentReport | null>(null)
  
  // AI Grading Loading State Phrases
  const [gradingMessage, setGradingMessage] = useState("Grading responses...")
  
  // Timing references
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  
  // Session Warning & Activation
  const [authError, setAuthError] = useState<boolean>(false)
  const [activatingDemo, setActivatingDemo] = useState(false)

  // Load Assessment History & verify authentication on Mount/token change
  useEffect(() => {
    const activeToken = token || localStorage.getItem("token") || localStorage.getItem("placement_resume_career_token");
    if (!activeToken) {
      setAuthError(true)
    } else {
      if (!token) {
        setAuth({ id: "student-demo", email: "student@example.com" } as any, activeToken);
      }
      setAuthError(false)
      fetchHistory(false)
    }
  }, [token])

  // Clear timers on unmount
  useEffect(() => {
    return () => stopTimers()
  }, [])

  const activateDemoSession = async () => {
    try {
      setActivatingDemo(true)
      const params = new URLSearchParams()
      params.append("username", "student@example.com")
      params.append("password", "student123")

      const res = await fetch("http://localhost:8000/api/v1/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: params
      })

      if (!res.ok) {
        throw new Error("Activation server responded with status: " + res.status)
      }

      const data = await res.json()
      if (data.access_token) {
        setAuth({ id: "student-demo", email: "student@example.com" } as any, data.access_token)
        setAuthError(false)
        addToast({
          title: "Session Activated Successfully",
          description: "Authenticated as student@example.com. Placement diagnostics are now live!",
          type: "success"
        })
      }
    } catch (err: any) {
      console.error(err)
      addToast({
        title: "Activation Failed",
        description: "Please upload your resume in the Career Intelligence tab to authenticate naturally.",
        type: "error"
      })
    } finally {
      setActivatingDemo(false)
    }
  }

  const fetchHistory = async (showToast = false) => {
    try {
      setLoading(true)
      const res = await apiClient.get<AssessmentReport[]>("/assessments/history")
      setHistoryList(res.data)
      if (showToast) {
        addToast({
          title: "History Updated",
          description: "Successfully loaded assessment records from your secure profile.",
          type: "success"
        })
      }
    } catch (err: any) {
      console.error(err)
      if (err.response?.status === 401) {
        setAuthError(true)
      }
    } finally {
      setLoading(false)
    }
  }

  // Start Assessment Test Loop
  const startAssessment = async (level: "Beginner" | "Intermediate" | "Advanced") => {
    const activeToken = token || localStorage.getItem("token") || localStorage.getItem("placement_resume_career_token");
    if (!activeToken) {
      addToast({
        title: "Authentication Required",
        description: "Diagnostic tests require an active profile. Please activate a demo session or upload your resume in the Career Intelligence tab.",
        type: "error"
      })
      setAuthError(true)
      return
    }

    try {
      setLoading(true)
      setSelectedLevel(level)
      
      const res = await apiClient.get(`/assessments/questions?level=${level}`)
      const fetchedQuestions = res.data.questions || []
      
      if (fetchedQuestions.length === 0) {
        addToast({
          title: "System Configuration",
          description: `No assessment questions configured for the '${level}' level.`,
          type: "error"
        })
        return
      }

      setQuestions(fetchedQuestions)
      setCurrentQuestionIdx(0)
      setSelectedAnswers({})
      
      // Initialize time spent dictionaries
      const initialTimes: Record<string, number> = {}
      fetchedQuestions.forEach((q: Question) => {
        initialTimes[q.id] = 0
      })
      setTimeSpent(initialTimes)
      
      setQuestionElapsed(0)
      setOverallElapsed(0)
      setAssessmentState("testing")
      
      // Fire timers
      startTimers(fetchedQuestions[0].id)
    } catch (err: any) {
      if (err.response?.status === 401) {
        setAuthError(true)
      }
      const errorMsg = err.response?.data?.detail || "Could not retrieve assessment questions."
      addToast({
        title: "Assessment Initialization Failed",
        description: errorMsg,
        type: "error"
      })
    } finally {
      setLoading(false)
    }
  }

  // Timers Controller
  const startTimers = (questionId: string) => {
    stopTimers()
    
    timerRef.current = setInterval(() => {
      setOverallElapsed((prev) => prev + 1)
      setQuestionElapsed((prev) => {
        const nextTime = prev + 1
        setTimeSpent((prevTimes) => ({
          ...prevTimes,
          [questionId]: nextTime
        }))
        return nextTime
      })
    }, 1000)
  }

  const stopTimers = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  // Next Question triggers reset of question-specific timers
  const handleNextQuestion = () => {
    if (currentQuestionIdx < questions.length - 1) {
      const nextIdx = currentQuestionIdx + 1
      setCurrentQuestionIdx(nextIdx)
      setQuestionElapsed(0)
      startTimers(questions[nextIdx].id)
    }
  }

  // Back Question
  const handlePrevQuestion = () => {
    if (currentQuestionIdx > 0) {
      const prevIdx = currentQuestionIdx - 1
      setCurrentQuestionIdx(prevIdx)
      setQuestionElapsed(timeSpent[questions[prevIdx].id] || 0)
      startTimers(questions[prevIdx].id)
    }
  }

  // Submit assessment answers
  const handleSubmitAssessment = async () => {
    stopTimers()
    setAssessmentState("grading")
    
    // Cycle messages to mimic AI thinking loops
    const phrases = [
      "🔍 Grading responses against standardized semantic test keys...",
      "⏱️ Auditing speed indices and benchmark latency offsets...",
      "🧠 Generating comprehensive Placement AI Capability Report...",
      "📊 Calibrating recruiting strategy guidelines & target matrices...",
      "🚀 Personalizing student profile skill level & company dashboard..."
    ]
    
    let phraseIdx = 0
    setGradingMessage(phrases[0])
    
    const phraseInterval = setInterval(() => {
      phraseIdx = (phraseIdx + 1) % phrases.length
      setGradingMessage(phrases[phraseIdx])
    }, 1800)

    try {
      // Ensure all questions have a time_spent recording
      const finalTimeSpent = { ...timeSpent }
      questions.forEach((q) => {
        if (!finalTimeSpent[q.id]) {
          finalTimeSpent[q.id] = q.benchmark_seconds
        }
      })

      const payload = {
        skill_level: selectedLevel,
        answers: selectedAnswers,
        time_spent: finalTimeSpent
      }

      const res = await apiClient.post<AssessmentReport>("/assessments/submit", payload)
      setActiveReport(res.data)
      
      // Log telemetry history submission
      addSubmission({
        type: "Skill Assessment",
        title: `${selectedLevel} Skill Diagnostic`,
        score: res.data.score,
        correct_answers: Math.round((res.data.accuracy / 100) * (res.data.graded_questions?.length || 10)),
        total_questions: res.data.graded_questions?.length || 10,
        accuracy_percentage: res.data.accuracy,
        ai_feedback: res.data.ai_analysis,
        questions: (res.data.graded_questions || []).map((gq) => ({
          text: gq.text,
          topic: gq.topic,
          type: "mcq",
          options: gq.options,
          correct_answer: gq.correct_answer,
          user_answer: gq.user_answer !== null && gq.options 
            ? gq.options[gq.user_answer] || "No Option selected" 
            : "No Option selected",
          is_correct: gq.is_correct,
          explanation: gq.explanation
        }))
      })

      // Auto refresh list
      await fetchHistory(false)
      
      setTimeout(() => {
        clearInterval(phraseInterval)
        setAssessmentState("results")
        addToast({
          title: "Assessment Successfully Graded",
          description: `Your skill assessment is completed. Calibrated Score: ${res.data.score}/100.`,
          type: "success"
        })
      }, 1000)

    } catch (err: any) {
      clearInterval(phraseInterval)
      setAssessmentState("testing")
      stopTimers()
      startTimers(questions[currentQuestionIdx].id)
      
      const errorMsg = err.response?.data?.detail || "Could not submit assessment results."
      addToast({
        title: "Evaluation Submission Error",
        description: errorMsg,
        type: "error"
      })
    }
  }

  // Handle Option Click
  const handleSelectOption = (questionId: string, optionIdx: number) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: optionIdx
    }))
  }

  // View past report details from history list
  const handleViewReport = (report: AssessmentReport) => {
    setActiveReport(report)
    setSelectedLevel(report.skill_level as any)
    setAssessmentState("results")
  }

  // Custom Markdown AI analysis parser to return beautiful TSX elements
  const renderAIAnalysisReport = (markdown: string) => {
    if (!markdown) return null

    // Split markdown sections
    const lines = markdown.split("\n")
    let strengths: string[] = []
    let developments: string[] = []
    let recruitingStrategy: string[] = []
    let companyTargetHeader = ""
    
    let currentSection: "none" | "strengths" | "developments" | "strategy" = "none"

    lines.forEach((line) => {
      const trimmed = line.trim()
      if (trimmed.startsWith("### 💪 Promising Strengths")) {
        currentSection = "strengths"
        return
      }
      if (trimmed.startsWith("### ⚠️ Target Areas for Development")) {
        currentSection = "developments"
        return
      }
      if (trimmed.startsWith("## 🚀 Tailored Recruiting Strategy")) {
        currentSection = "strategy"
        companyTargetHeader = trimmed.replace("## 🚀 ", "")
        return
      }
      if (trimmed.startsWith("---") || trimmed.startsWith("## ")) {
        if (currentSection !== "strategy") {
          currentSection = "none"
        }
      }

      if (currentSection === "strengths" && trimmed.startsWith("-")) {
        strengths.push(trimmed.substring(1).trim())
      }
      if (currentSection === "developments" && trimmed.startsWith("-")) {
        developments.push(trimmed.substring(1).trim())
      }
      if (currentSection === "strategy" && trimmed.startsWith("-")) {
        recruitingStrategy.push(trimmed.substring(1).trim())
      }
    })

    return (
      <div className="flex flex-col gap-6">
        {/* Splits: Strengths & Development Needs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Strengths Card */}
          <Card className="border-emerald-500/10 bg-emerald-500/[0.01] rounded-2xl p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5 mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" /> Promising Core Strengths
            </span>
            <div className="flex flex-col gap-3">
              {strengths.length === 0 ? (
                <p className="text-slate-400 text-xs italic">Reviewing algorithmic telemetry to establish strength indexes...</p>
              ) : (
                strengths.map((str, i) => {
                  const parts = str.split(":")
                  return (
                    <div key={i} className="flex gap-3 text-xs text-slate-300">
                      <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 text-[10px] font-bold shrink-0">
                        ✓
                      </div>
                      <p className="leading-relaxed">
                        {parts.length > 1 ? (
                          <>
                            <strong className="text-slate-100 font-semibold">{parts[0]}:</strong>
                            {parts.slice(1).join(":")}
                          </>
                        ) : str}
                      </p>
                    </div>
                  )
                })
              )}
            </div>
          </Card>

          {/* Development Cards */}
          <Card className="border-amber-500/10 bg-amber-500/[0.01] rounded-2xl p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5 mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" /> Targeted Calibration Needs
            </span>
            <div className="flex flex-col gap-3">
              {developments.length === 0 ? (
                <p className="text-slate-400 text-xs italic">Flawless structural evaluation achieved!</p>
              ) : (
                developments.map((dev, i) => {
                  const parts = dev.split(":")
                  return (
                    <div key={i} className="flex gap-3 text-xs text-slate-300">
                      <div className="w-5 h-5 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-400 text-[10px] font-bold shrink-0">
                        !
                      </div>
                      <p className="leading-relaxed">
                        {parts.length > 1 ? (
                          <>
                            <strong className="text-slate-100 font-semibold">{parts[0]}:</strong>
                            {parts.slice(1).join(":")}
                          </>
                        ) : dev}
                      </p>
                    </div>
                  )
                })
              )}
            </div>
          </Card>
        </div>

        {/* Recruiting Strategy Card */}
        <Card className="border-primary/20 bg-slate-900/40 rounded-3xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-primary/5 rounded-full blur-[80px] pointer-events-none" />
          
          <span className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-1.5 mb-4">
            <Zap className="w-4 h-4 text-violet-400 animate-bounce" /> {companyTargetHeader || "Tailored Recruiting Strategy"}
          </span>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-2">
            {recruitingStrategy.map((item, i) => {
              const parts = item.split(":")
              const title = parts[0] || ""
              const desc = parts.slice(1).join(":") || ""

              const cardsConfig = [
                { bg: "bg-slate-950/40 border-white/5", text: "text-indigo-400" },
                { bg: "bg-slate-950/40 border-white/5", text: "text-violet-400" },
                { bg: "bg-slate-950/40 border-white/5", text: "text-emerald-400" },
                { bg: "bg-slate-950/40 border-white/5", text: "text-pink-400" },
              ]
              const config = cardsConfig[i % cardsConfig.length]

              return (
                <div key={i} className={`p-4 rounded-2xl border ${config.bg} flex flex-col justify-between gap-2 shadow-sm`}>
                  <div className="flex flex-col gap-1">
                    <span className={`text-[10px] font-black uppercase tracking-wider ${config.text}`}>
                      Phase {i + 1}
                    </span>
                    <h4 className="text-xs font-bold text-slate-100 tracking-tight mt-1">{title.replace(/\*\*/g, "")}</h4>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-relaxed mt-2">{desc.replace(/\*\*/g, "")}</p>
                </div>
              )
            })}
          </div>
        </Card>
      </div>
    )
  }

  // Format code blocks in question texts dynamically
  const parseQuestionText = (text: string) => {
    if (!text.includes("```")) {
      return <p className="text-sm text-slate-200 leading-relaxed font-sans">{text}</p>
    }

    const segments = text.split("```")
    return (
      <div className="flex flex-col gap-3 font-sans">
        <p className="text-sm text-slate-200 leading-relaxed">{segments[0]}</p>
        {segments[1] && (
          <pre className="bg-slate-950 border border-white/5 rounded-2xl p-4 font-mono text-xs overflow-x-auto text-slate-300 leading-relaxed shadow-inner">
            <code>
              {segments[1].replace(/python/g, "").trim()}
            </code>
          </pre>
        )}
        {segments[2] && <p className="text-sm text-slate-200 leading-relaxed">{segments[2]}</p>}
      </div>
    )
  }

  // ----------------------------------------------------
  // VIEW: 1. SELECT / INITIAL ASSESSMENT
  // ----------------------------------------------------
  if (assessmentState === "select") {
    return (
      <div className="flex flex-col gap-6">
        {/* Banner */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
              <Award className="w-6 h-6 text-violet-400" /> Algorithmic Diagnostics
            </h1>
            <p className="text-slate-400 text-xs mt-1">
              Initiate assessment tests to calibrate your skill baseline, evaluate metrics, and program your study paths.
            </p>
          </div>

          <Button 
            onClick={() => setAssessmentState("history")}
            className="bg-white/[0.02] border border-white/10 hover:bg-white/5 hover:border-white/20 text-slate-300 py-1.5 px-3 rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer font-semibold"
          >
            <History className="w-3.5 h-3.5" /> Assessment Archives ({historyList.length})
          </Button>
        </div>

        {/* Diagnostic Welcome Showcase */}
        <Card className="border-primary/20 bg-gradient-to-r from-indigo-950/30 to-violet-950/20 backdrop-blur-md rounded-3xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
          <div className="max-w-2xl relative z-10 flex flex-col gap-4">
            <span className="px-3 py-1 rounded-full text-[9px] font-bold bg-primary/10 border border-primary/20 text-primary w-fit uppercase tracking-wider flex items-center gap-1.5">
              <Brain className="w-3.5 h-3.5" /> Placement Intelligence calibrator
            </span>
            <h2 className="text-xl font-bold text-slate-100 leading-tight">
              Calibrate Your Coding Profile with Live Benchmark Assessments
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Our skill diagnostics test your algorithmic, mathematical, and data structure fluency. 
              By tracking your solving precision alongside microsecond latency, the engine automatically updates your 
              <strong> Profile Capability Rating</strong> and designs optimized revision paths for Google, Meta, and Amazon.
            </p>
            <div className="flex flex-wrap gap-6 border-t border-white/5 pt-4 mt-2">
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <Clock className="w-4 h-4 text-emerald-400" />
                <span>Speed Latency Auditing</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                <span>Sub-topic Accuracy Metrics</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <Sparkles className="w-4 h-4 text-pink-400" />
                <span>Placement Recruiting Calibrator</span>
              </div>
            </div>
          </div>
        </Card>

        {authError && (
          <Card className="border-amber-500/20 bg-gradient-to-r from-amber-950/20 to-yellow-950/10 backdrop-blur-md rounded-3xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-amber-500/10 rounded-full blur-[80px] pointer-events-none" />
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div className="flex flex-col gap-2 max-w-xl">
                <span className="px-3 py-1 rounded-full text-[9px] font-bold bg-amber-500/10 border border-amber-500/20 text-amber-400 w-fit uppercase tracking-wider flex items-center gap-1.5 font-semibold">
                  <AlertCircle className="w-3.5 h-3.5" /> Diagnostic Session Locked
                </span>
                <h3 className="text-base font-bold text-slate-100 leading-tight">
                  Session Token or Profile is Missing
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  To calculate personalized score metrics and target company readiness, the engine requires a registered student session. Please upload your resume in the <strong>Career Intelligence</strong> dashboard to dynamically configure your profile, or activate a developer demo session below to start immediately!
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 shrink-0 w-full md:w-auto mt-2 md:mt-0">
                <Button
                  onClick={activateDemoSession}
                  disabled={activatingDemo}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 py-2 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-lg shadow-amber-500/20 flex items-center justify-center gap-1.5"
                >
                  {activatingDemo ? (
                    <>
                      <Loader className="w-3.5 h-3.5 animate-spin" />
                      <span>Activating...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5" />
                      <span>Activate Demo Session</span>
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => window.location.href = "/career-intelligence"}
                  className="bg-white/[0.02] border border-white/10 hover:bg-white/5 hover:border-white/20 text-slate-300 py-2 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 inline mr-1" /> Go to Career Intelligence
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Tier Cards Selection Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-2">
          {/* Beginner Card */}
          <Card className="border-white/5 bg-slate-900/10 backdrop-blur-md rounded-2xl flex flex-col justify-between hover:border-emerald-500/20 transition-all duration-300 group">
            <CardHeader className="pb-3 border-b border-white/5">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Baseline Tier</span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 group-hover:animate-ping" />
              </div>
              <CardTitle className="text-base font-bold text-slate-100 mt-2">Beginner Assessment</CardTitle>
              <p className="text-slate-400 text-[10px] leading-normal">Perfect for validating complexity bounds and baseline data layouts.</p>
            </CardHeader>
            <CardContent className="pt-4 flex flex-col gap-6 justify-between flex-1">
              <div className="flex flex-col gap-3">
                <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider">Assessed Paradigms</span>
                <div className="flex flex-wrap gap-1.5">
                  {["Complexity O(1)", "Palindromes", "1D/2D Arrays", "Dict/Set Hashing", "Linked Lists", "Queues & Stacks"].map((t) => (
                    <span key={t} className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-white/[0.02] border border-white/5 text-slate-300">
                      {t}
                    </span>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-4 mt-2">
                  <div className="flex flex-col">
                    <span className="text-[9px] text-slate-500 uppercase tracking-wide">Telemetry count</span>
                    <span className="text-xs font-bold text-slate-200 mt-0.5">10 Questions</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] text-slate-500 uppercase tracking-wide">Target budget</span>
                    <span className="text-xs font-bold text-slate-200 mt-0.5">6 Minutes</span>
                  </div>
                </div>
              </div>
              <Button 
                onClick={() => startAssessment("Beginner")}
                className="w-full py-2 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/20 hover:border-emerald-500 rounded-xl font-bold text-xs tracking-wider uppercase transition-all duration-300 cursor-pointer"
              >
                Start Beginner Diagnostic
              </Button>
            </CardContent>
          </Card>

          {/* Intermediate Card */}
          <Card className="border-white/5 bg-slate-900/10 backdrop-blur-md rounded-2xl flex flex-col justify-between hover:border-primary/20 transition-all duration-300 group">
            <CardHeader className="pb-3 border-b border-white/5">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Calibration Tier</span>
                <span className="w-2.5 h-2.5 rounded-full bg-primary group-hover:animate-ping" />
              </div>
              <CardTitle className="text-base font-bold text-slate-100 mt-2">Intermediate Assessment</CardTitle>
              <p className="text-slate-400 text-[10px] leading-normal">Evaluates standard structural patterns, BST loops, and pointer bounds.</p>
            </CardHeader>
            <CardContent className="pt-4 flex flex-col gap-6 justify-between flex-1">
              <div className="flex flex-col gap-3">
                <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider">Assessed Paradigms</span>
                <div className="flex flex-wrap gap-1.5">
                  {["Two Pointers", "Stacks & Queues", "Binary Searches", "Binary Trees", "Recursions", "Sliding Window", "Greedy Sorting"].map((t) => (
                    <span key={t} className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-white/[0.02] border border-white/5 text-slate-300">
                      {t}
                    </span>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-4 mt-2">
                  <div className="flex flex-col">
                    <span className="text-[9px] text-slate-500 uppercase tracking-wide">Telemetry count</span>
                    <span className="text-xs font-bold text-slate-200 mt-0.5">10 Questions</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] text-slate-500 uppercase tracking-wide">Target budget</span>
                    <span className="text-xs font-bold text-slate-200 mt-0.5">7 Minutes</span>
                  </div>
                </div>
              </div>
              <Button 
                onClick={() => startAssessment("Intermediate")}
                className="w-full py-2 bg-primary/10 hover:bg-primary text-primary hover:text-white border border-primary/20 hover:border-primary rounded-xl font-bold text-xs tracking-wider uppercase transition-all duration-300 cursor-pointer"
              >
                Start Intermediate Diagnostic
              </Button>
            </CardContent>
          </Card>

          {/* Advanced Card */}
          <Card className="border-white/5 bg-slate-900/10 backdrop-blur-md rounded-2xl flex flex-col justify-between hover:border-pink-500/20 transition-all duration-300 group">
            <CardHeader className="pb-3 border-b border-white/5">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-pink-400 uppercase tracking-widest">Enterprise Tier</span>
                <span className="w-2.5 h-2.5 rounded-full bg-pink-500 group-hover:animate-ping" />
              </div>
              <CardTitle className="text-base font-bold text-slate-100 mt-2">Advanced Assessment</CardTitle>
              <p className="text-slate-400 text-[10px] leading-normal">Audits heavy optimizations, DP grids, prefix matching, and LRU custom lists.</p>
            </CardHeader>
            <CardContent className="pt-4 flex flex-col gap-6 justify-between flex-1">
              <div className="flex flex-col gap-3">
                <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider">Assessed Paradigms</span>
                <div className="flex flex-wrap gap-1.5">
                  {["Tabulation DP", "Dijkstra Priority", "Prefix Tries", "Bitwise powerOf2", "LRU DoublyList", "Segment Trees", "Tarjan SCCs"].map((t) => (
                    <span key={t} className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-white/[0.02] border border-white/5 text-slate-300">
                      {t}
                    </span>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-4 mt-2">
                  <div className="flex flex-col">
                    <span className="text-[9px] text-slate-500 uppercase tracking-wide">Telemetry count</span>
                    <span className="text-xs font-bold text-slate-200 mt-0.5">10 Questions</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] text-slate-500 uppercase tracking-wide">Target budget</span>
                    <span className="text-xs font-bold text-slate-200 mt-0.5">10 Minutes</span>
                  </div>
                </div>
              </div>
              <Button 
                onClick={() => startAssessment("Advanced")}
                className="w-full py-2 bg-pink-500/10 hover:bg-pink-500 text-pink-400 hover:text-white border border-pink-500/20 hover:border-pink-500 rounded-xl font-bold text-xs tracking-wider uppercase transition-all duration-300 cursor-pointer"
              >
                Start Advanced Diagnostic
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // ----------------------------------------------------
  // VIEW: 2. TESTING INTERACTIVE ARENA
  // ----------------------------------------------------
  if (assessmentState === "testing") {
    const activeQ = questions[currentQuestionIdx]
    if (!activeQ) return null

    const totalQuestions = questions.length
    const answeredCount = Object.keys(selectedAnswers).length
    const progressPct = Math.round(((currentQuestionIdx + 1) / totalQuestions) * 100)
    
    // Live question benchmark ratios for timing status warnings
    const qBenchmark = activeQ.benchmark_seconds
    const isExceeded = questionElapsed > qBenchmark
    const speedRatio = questionElapsed / qBenchmark
    
    let timerTheme = "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
    let timerStatus = "Optimal Pace"
    if (speedRatio > 1.5) {
      timerTheme = "bg-rose-500/10 border-rose-500/20 text-rose-400 animate-pulse"
      timerStatus = "Slow (Exceeds Target)"
    } else if (isExceeded) {
      timerTheme = "bg-amber-500/10 border-amber-500/20 text-amber-400"
      timerStatus = "Standard Pace"
    }

    return (
      <div className="flex flex-col gap-6 max-w-4xl mx-auto">
        {/* Dynamic header tracker progress */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Diagnostics Test In Progress</span>
            <h2 className="text-lg font-bold text-slate-100">
              {selectedLevel} Coding Arena
            </h2>
          </div>

          <div className="flex gap-4 shrink-0">
            {/* Question specific benchmark indicator */}
            <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 text-xs font-bold ${timerTheme}`}>
              <Clock className="w-3.5 h-3.5" />
              <span>{questionElapsed}s / {qBenchmark}s ({timerStatus})</span>
            </div>

            {/* Total elapsed time */}
            <div className="px-3 py-1.5 rounded-xl border border-white/10 bg-slate-900/40 text-slate-300 flex items-center gap-2 text-xs font-bold">
              <span>Overall Duration: {overallElapsed}s</span>
            </div>
          </div>
        </div>

        {/* Global Progress Line Bar */}
        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden flex">
          <div 
            className="bg-primary h-full transition-all duration-500 ease-out" 
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Main interactive Question container card */}
        <Card className="border-white/10 bg-slate-900/30 backdrop-blur-md rounded-3xl p-6 flex flex-col gap-6">
          <div className="flex justify-between items-center border-b border-white/5 pb-4">
            <span className="px-2.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-primary/10 border border-primary/20 text-primary">
              Domain Paradigm: {activeQ.topic}
            </span>
            <span className="text-[10px] text-slate-400 font-bold">
              Question {currentQuestionIdx + 1} of {totalQuestions}
            </span>
          </div>

          {/* Formatted snippet question */}
          <div className="flex flex-col gap-4">
            {parseQuestionText(activeQ.text)}
          </div>

          {/* Select Options Cards Grid */}
          <div className="flex flex-col gap-3.5 mt-2">
            {activeQ.options.map((opt, idx) => {
              const isSelected = selectedAnswers[activeQ.id] === idx
              return (
                <button
                  key={idx}
                  onClick={() => handleSelectOption(activeQ.id, idx)}
                  className={`p-4 rounded-2xl border text-left text-xs font-medium transition-all duration-300 cursor-pointer flex gap-4 items-center group active:scale-[0.99] ${
                    isSelected 
                      ? "bg-primary/10 border-primary text-slate-100 shadow-[inset_0_1px_0_rgba(99,102,241,0.05),0_0_10px_rgba(99,102,241,0.15)]"
                      : "border-white/5 bg-white/[0.01] text-slate-300 hover:border-white/10 hover:text-slate-100 hover:bg-white/[0.02]"
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[9px] shrink-0 border transition-all ${
                    isSelected 
                      ? "bg-primary border-primary text-white" 
                      : "border-white/10 text-slate-500 group-hover:border-white/20 group-hover:text-slate-300"
                  }`}>
                    {String.fromCharCode(65 + idx)}
                  </div>
                  <span className="leading-relaxed">{opt}</span>
                </button>
              )
            })}
          </div>
        </Card>

        {/* Navigation Action Buttons footer */}
        <div className="flex justify-between items-center mt-2">
          <Button
            onClick={handlePrevQuestion}
            disabled={currentQuestionIdx === 0}
            className="px-4 py-2 border border-white/5 bg-slate-900/20 text-slate-400 hover:text-slate-200 hover:border-white/10 rounded-xl text-xs cursor-pointer font-bold disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Previous
          </Button>

          {currentQuestionIdx < totalQuestions - 1 ? (
            <Button
              onClick={handleNextQuestion}
              disabled={selectedAnswers[activeQ.id] === undefined}
              className="px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5"
            >
              Next Question <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmitAssessment}
              disabled={answeredCount < totalQuestions}
              className="px-5 py-2.5 rounded-xl text-xs font-black tracking-widest uppercase transition-all bg-gradient-to-r from-violet-600 to-indigo-600 shadow-[0_0_15px_rgba(99,102,241,0.25)] hover:brightness-110 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Submit Evaluation
            </Button>
          )}
        </div>
      </div>
    )
  }

  // ----------------------------------------------------
  // VIEW: 3. GRADING ANALYSIS LOADER OVERLAY
  // ----------------------------------------------------
  if (assessmentState === "grading") {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center p-6 text-center font-sans">
        <Card className="max-w-md w-full border-white/5 bg-slate-900/30 backdrop-blur-xl p-8 rounded-3xl flex flex-col items-center gap-6 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-2 border border-primary/20 relative">
            <Loader size="lg" />
            <Brain className="w-6 h-6 absolute text-violet-400 animate-pulse" />
          </div>
          <h3 className="text-lg font-bold text-slate-100">Grading System Calibrating</h3>
          <p className="text-xs text-slate-400 leading-normal max-w-xs">
            Please stand by as our analytical telemetry checks your speed variables against algorithmic benchmark baselines.
          </p>
          <div className="w-full bg-white/[0.02] border border-white/5 p-3 rounded-xl flex items-center gap-3 text-left">
            <span className="w-2.5 h-2.5 rounded-full bg-primary animate-ping shrink-0" />
            <span className="text-[10px] font-semibold text-slate-300 leading-relaxed italic">{gradingMessage}</span>
          </div>
        </Card>
      </div>
    )
  }

  // ----------------------------------------------------
  // VIEW: 4. DETAILED ASSESSMENT INTERACTIVE REPORT
  // ----------------------------------------------------
  if (assessmentState === "results") {
    if (!activeReport) return null
    
    // Parse topic score metrics
    const topicScores = activeReport.topic_scores || {}

    return (
      <div className="flex flex-col gap-6">
        {/* Header Action menu */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Diagnostic Report</span>
            <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6 text-emerald-400" /> Evaluation Analysis Portal
            </h1>
          </div>

          <div className="flex gap-3 shrink-0">
            <Button
              onClick={() => setAssessmentState("select")}
              className="bg-white/[0.02] border border-white/10 hover:bg-white/5 hover:border-white/20 text-slate-300 py-1.5 px-3 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer font-semibold transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Start New Test
            </Button>
            <Button
              onClick={() => setAssessmentState("history")}
              className="bg-white/[0.02] border border-white/10 hover:bg-white/5 hover:border-white/20 text-slate-300 py-1.5 px-3 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer font-semibold transition-all"
            >
              <History className="w-3.5 h-3.5" /> Assessment Archives
            </Button>
          </div>
        </div>

        {/* Diagnostic Telemetry Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          
          {/* Radial score card */}
          <Card className="border-white/10 bg-slate-900/20 backdrop-blur-md rounded-2xl p-5 flex flex-col items-center justify-center text-center">
            <ProgressRing percentage={activeReport.score} size={110} strokeWidth={9} />
            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mt-4">Calibrated Score</span>
            <span className="text-[9px] text-slate-500 mt-1">Tier Level: {activeReport.skill_level}</span>
          </Card>

          {/* Speed analysis profile */}
          <Card className="border-white/10 bg-slate-900/20 backdrop-blur-md rounded-2xl p-5 flex flex-col justify-between">
            <CardHeader className="pb-2 p-0">
              <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold flex items-center gap-1">
                <Clock className="w-4 h-4 text-indigo-400" /> Speed Profile
              </span>
            </CardHeader>
            <CardContent className="p-0 flex flex-col justify-end mt-4">
              <span className={`text-base font-extrabold uppercase tracking-wide ${
                activeReport.speed_category.includes("Optimal") ? "text-emerald-400" :
                activeReport.speed_category.includes("Standard") ? "text-yellow-400" :
                "text-rose-400"
              }`}>
                {activeReport.speed_category.split("/")[0]}
              </span>
              <span className="text-[9px] text-slate-500 mt-1">{activeReport.speed_category.split("/")[1] || "Solving Speed"}</span>
              <div className="border-t border-white/5 pt-3 mt-4 text-[10px] text-slate-400 flex justify-between items-center">
                <span>Overall Duration:</span>
                <span className="font-bold text-slate-200">{activeReport.speed_index} seconds</span>
              </div>
            </CardContent>
          </Card>

          {/* Test Accuracy */}
          <Card className="border-white/10 bg-slate-900/20 backdrop-blur-md rounded-2xl p-5 flex flex-col justify-between">
            <CardHeader className="pb-2 p-0">
              <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold flex items-center gap-1">
                <Target className="w-4 h-4 text-emerald-400" /> Test Accuracy
              </span>
            </CardHeader>
            <CardContent className="p-0 flex flex-col justify-end mt-4">
              <span className="text-2xl font-black text-slate-100 tracking-tight">{activeReport.accuracy}%</span>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-3">
                <div className="bg-emerald-500 h-full" style={{ width: `${activeReport.accuracy}%` }} />
              </div>
              <div className="border-t border-white/5 pt-3 mt-4 text-[10px] text-slate-400 flex justify-between items-center">
                <span>Evaluation precision:</span>
                <span className="font-bold text-slate-200">{Math.round((activeReport.accuracy / 100) * 5)}/5 Correct</span>
              </div>
            </CardContent>
          </Card>

          {/* Calibrated capability updates */}
          <Card className="border-white/10 bg-slate-900/20 backdrop-blur-md rounded-2xl p-5 flex flex-col justify-between">
            <CardHeader className="pb-2 p-0">
              <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold flex items-center gap-1">
                <TrendingUp className="w-4 h-4 text-pink-400" /> Capability Rating
              </span>
            </CardHeader>
            <CardContent className="p-0 flex flex-col justify-end mt-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-pink-500/10 flex items-center justify-center text-pink-400 text-xs font-bold border border-pink-500/20">
                  {activeReport.skill_level[0]}
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-extrabold text-slate-200 tracking-tight">{activeReport.skill_level}</span>
                  <span className="text-[9px] text-slate-500 mt-0.5">Dynamically updated in Student Profile</span>
                </div>
              </div>
              <div className="border-t border-white/5 pt-3 mt-4 text-[10px] text-slate-400 flex justify-between items-center">
                <span>Calibrated date:</span>
                <span className="font-bold text-slate-300">{new Date(activeReport.created_at).toLocaleDateString()}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Competency Matrix Topic mapping */}
        <Card className="border-white/10 bg-slate-900/20 backdrop-blur-md rounded-3xl p-6 mt-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-4 border-b border-white/5 pb-2">
            Topic Competency Matrix
          </span>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {Object.entries(topicScores).map(([topic, score]) => {
              const isMastered = score === 100
              return (
                <div 
                  key={topic} 
                  className={`p-3.5 rounded-2xl border flex flex-col justify-between gap-3 shadow-inner ${
                    isMastered 
                      ? "bg-emerald-500/[0.02] border-emerald-500/15" 
                      : "bg-rose-500/[0.01] border-rose-500/10"
                  }`}
                >
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-semibold text-slate-400 truncate tracking-wide" title={topic}>
                      {topic}
                    </span>
                    <span className="text-[9px] text-slate-500">Paradigm sub-topic</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {isMastered ? (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-400">Mastered</span>
                      </>
                    ) : (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                        <span className="text-[9px] font-bold uppercase tracking-wider text-rose-400">Needs Review</span>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </Card>

        {/* Stylized custom parser AI report */}
        {renderAIAnalysisReport(activeReport.ai_analysis)}
      </div>
    )
  }

  // ----------------------------------------------------
  // VIEW: 5. HISTORICAL ASSESSMENTS LIST VIEW
  // ----------------------------------------------------
  if (assessmentState === "history") {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
              <History className="w-6 h-6 text-violet-400" /> Assessment Archives
            </h1>
            <p className="text-slate-400 text-xs mt-1">
              Browse historical solving stats, accuracy averages, and reload placement recruiting profiles.
            </p>
          </div>

          <Button
            onClick={() => setAssessmentState("select")}
            className="bg-white/[0.02] border border-white/10 hover:bg-white/5 hover:border-white/20 text-slate-300 py-1.5 px-3.5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer font-semibold transition-all"
          >
            <Compass className="w-3.5 h-3.5" /> Diagnostics Hub
          </Button>
        </div>

        {/* History Table */}
        <Card className="border-white/10 bg-slate-900/10 backdrop-blur-md rounded-2xl flex flex-col overflow-hidden">
          <CardHeader className="pb-3 border-b border-white/5 flex flex-row justify-between items-center">
            <CardTitle className="text-sm font-semibold text-slate-200">Historical Assessments Telemetry</CardTitle>
            <Button 
              onClick={() => fetchHistory(true)}
              className="bg-transparent border-0 hover:bg-white/5 text-[10px] text-primary font-bold py-1 px-2.5 rounded-lg flex items-center gap-1.5"
            >
              Refresh Logs
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {historyList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-500 text-xs gap-3">
                <AlertCircle className="w-10 h-10 text-slate-600 animate-pulse" />
                <span className="font-semibold text-slate-400">No assessment records found.</span>
                <p className="max-w-xs text-center text-slate-500 leading-normal mt-1">
                  Start your first baseline diagnostic to populate student capability calibrations!
                </p>
              </div>
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>Evaluation Date</TH>
                    <TH>Assessed Skill Level</TH>
                    <TH>Calibrated Score</TH>
                    <TH>Accuracy</TH>
                    <TH>Speed Category</TH>
                    <TH>Timing index</TH>
                    <TH className="text-right">Actions</TH>
                  </TR>
                </THead>
                <TBody>
                  {historyList.map((item) => {
                    const statusColors = {
                      "Optimal / Speed Champion": "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
                      "Standard / Satisfactory": "bg-yellow-500/10 border-yellow-500/30 text-yellow-400",
                      "Slow / Needs Practice": "bg-rose-500/10 border-rose-500/30 text-rose-400"
                    }
                    
                    const scoreColors = 
                      item.score >= 80 ? "text-emerald-400 bg-emerald-500/5" :
                      item.score >= 50 ? "text-yellow-400 bg-yellow-500/5" :
                      "text-rose-400 bg-rose-500/5"

                    return (
                      <TR key={item.id}>
                        <TD className="text-slate-300 font-semibold">{new Date(item.created_at).toLocaleString()}</TD>
                        <TD>
                          <span className="px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-primary/10 border border-primary/20 text-primary">
                            {item.skill_level}
                          </span>
                        </TD>
                        <TD>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${scoreColors}`}>
                            {item.score}/100
                          </span>
                        </TD>
                        <TD className="text-slate-300 font-bold">{item.accuracy}%</TD>
                        <TD>
                          <span className={`px-2.5 py-0.5 rounded-md border text-[9px] font-bold ${statusColors[item.speed_category as keyof typeof statusColors] || "text-slate-400"}`}>
                            {item.speed_category.split("/")[0]}
                          </span>
                        </TD>
                        <TD className="text-slate-400 text-xs font-mono">{item.speed_index}s</TD>
                        <TD className="text-right">
                          <button
                            onClick={() => handleViewReport(item)}
                            className="bg-primary hover:brightness-110 text-white font-bold text-[9px] tracking-wide uppercase py-1 px-3 rounded-lg flex items-center gap-1.5 ml-auto cursor-pointer"
                          >
                            <FileText className="w-3 h-3" /> View Report
                          </button>
                        </TD>
                      </TR>
                    )
                  })}
                </TBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  return null
}
