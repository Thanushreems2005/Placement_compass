import { useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { useAppStore } from "./store/useAppStore"
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card"
import { Button } from "./ui/button"
import { 
  History as HistoryIcon, 
  Sparkles, 
  Award,
  Clock, 
  CheckCircle2, 
  BrainCircuit, 
  Layers,
  Search,
  ExternalLink
} from "lucide-react"

export default function SubmissionsPage() {
  const { submissions } = useAppStore()
  const navigate = useNavigate()
  const [activeReportModal, setActiveReportModal] = useState<any | null>(null)
  const [filterType, setFilterType] = useState<"all" | "Skill Assessment" | "Coding Arena">("all")

  const filteredSubmissions = submissions.filter(sub => {
    if (filterType === "all") return true
    return sub.type === filterType
  })

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <HistoryIcon className="w-6 h-6 text-indigo-400" />
            Telemetry & Historical Records
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Real-time performance metrics, code correctness calibrations, and personalized AI improvisation plans.
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex bg-slate-900 p-0.5 rounded-xl border border-white/5">
          {(["all", "Skill Assessment", "Coding Arena"] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all uppercase tracking-wider ${
                filterType === type
                  ? "bg-primary text-white shadow-md"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {type === "all" ? "All" : type.split(" ")[0]}
            </button>
          ))}
        </div>
      </div>

      {filteredSubmissions.length === 0 ? (
        <div className="border border-white/5 bg-slate-900/10 backdrop-blur-md rounded-3xl p-12 flex flex-col items-center justify-center text-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 text-indigo-400">
            <HistoryIcon className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-200">No Assessment Telemetry Yet</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              Complete your first Skill Assessment or Coding Arena Level to populate your secure placement records.
            </p>
          </div>
          <div className="flex gap-3 mt-2">
            <Button onClick={() => navigate({ to: "/dsa-buddy/assessment" })} className="text-xs py-1.5 h-9 cursor-pointer">
              Take Assessment
            </Button>
            <Button onClick={() => navigate({ to: "/dsa-buddy/arena" })} variant="outline" className="text-xs py-1.5 h-9 cursor-pointer">
              Enter Coding Arena
            </Button>
          </div>
        </div>
      ) : (
        <Card className="border border-white/5 bg-slate-900/10 backdrop-blur-md rounded-2xl overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-white/[0.02] text-[10px] uppercase text-slate-500 border-b border-white/5">
                  <tr>
                    <th className="px-5 py-4 font-bold">Submission ID</th>
                    <th className="px-5 py-4 font-bold">Category</th>
                    <th className="px-5 py-4 font-bold">Topic / alignment</th>
                    <th className="px-5 py-4 font-bold">Correctness</th>
                    <th className="px-5 py-4 font-bold text-right">Score</th>
                    <th className="px-5 py-4 font-bold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredSubmissions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-white/[0.01] transition-colors">
                      <td className="px-5 py-4 font-mono text-indigo-400 font-bold">{sub.id}</td>
                      <td className="px-5 py-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          sub.type === "Coding Arena" 
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/20" 
                            : "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                        }`}>
                          {sub.type}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-semibold text-slate-200">{sub.title}</td>
                      <td className="px-5 py-4 text-slate-400">
                        {sub.correct_answers} / {sub.total_questions} Correct
                      </td>
                      <td className="px-5 py-4 text-right font-extrabold text-slate-100">
                        {Math.round(sub.score)}%
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Button 
                          onClick={() => setActiveReportModal(sub)} 
                          className="text-[10px] py-1.5 h-8 bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 rounded-xl cursor-pointer"
                        >
                          View Report
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dynamic Interactive AI Diagnostic Report Modal */}
      {activeReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-4xl max-h-[85vh] overflow-y-auto border border-white/10 bg-slate-900 rounded-3xl p-6 flex flex-col gap-6 relative shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-left">
            <button 
              onClick={() => setActiveReportModal(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 text-sm font-bold bg-white/5 w-8 h-8 rounded-full flex items-center justify-center border border-white/5 transition-colors"
            >
              ✕
            </button>
            
            <div className="flex flex-col gap-1.5 border-b border-white/5 pb-4">
              <span className="text-[10px] text-indigo-400 uppercase font-bold tracking-widest">{activeReportModal.type} Report</span>
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                {activeReportModal.title}
                <span className="text-xs font-mono text-slate-400 px-2 py-0.5 bg-white/5 rounded border border-white/5">{activeReportModal.id}</span>
              </h2>
              <p className="text-[10px] text-slate-400">Completed on {activeReportModal.timestamp}</p>
            </div>

            {/* AI Recommendations Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1 border border-indigo-500/20 bg-indigo-500/5 rounded-2xl p-4 flex flex-col justify-between">
                <div>
                  <span className="text-[9px] uppercase font-bold text-indigo-400 tracking-wider">Calibration Score</span>
                  <div className="text-4xl font-extrabold text-slate-100 mt-2">{Math.round(activeReportModal.score)}%</div>
                  <p className="text-[11px] text-indigo-300/80 mt-2">Accuracy: {activeReportModal.accuracy_percentage}%</p>
                </div>
                <div className="text-[10px] text-slate-400 mt-4">
                  Passed {activeReportModal.correct_answers} of {activeReportModal.total_questions} evaluation checks.
                </div>
              </div>

              <div className="md:col-span-2 border border-emerald-500/20 bg-emerald-500/5 rounded-2xl p-4 flex flex-col gap-2">
                <span className="text-[9px] uppercase font-bold text-emerald-400 tracking-wider">AI Improvisation Plan</span>
                <p className="text-xs text-slate-300 leading-relaxed font-sans mt-1">
                  {activeReportModal.ai_feedback || "Analyzing performance metrics..."}
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 text-[9px] text-emerald-300 rounded">💡 Target Weak Spots</span>
                  <span className="px-2 py-1 bg-indigo-500/10 border border-indigo-500/20 text-[9px] text-indigo-300 rounded">📚 Spaced Repetition Focus</span>
                </div>
              </div>
            </div>

            {/* Questions Breakdown */}
            <div className="flex flex-col gap-4">
              <h3 className="text-sm font-bold text-slate-300">Detailed Question Audits</h3>
              <div className="flex flex-col gap-3">
                {(activeReportModal.questions || []).map((q: any, i: number) => (
                  <div key={i} className={`p-4 border rounded-2xl flex flex-col gap-3 transition-all ${
                    q.is_correct 
                      ? "border-emerald-500/10 bg-emerald-500/5" 
                      : "border-rose-500/10 bg-rose-500/5"
                  }`}>
                    <div className="flex items-center justify-between gap-4">
                      <span className="px-2.5 py-0.5 bg-slate-800 text-[9px] font-bold text-slate-300 rounded border border-white/5 uppercase">
                        {q.topic}
                      </span>
                      <span className={`text-[10px] font-bold ${q.is_correct ? "text-emerald-400" : "text-rose-400"}`}>
                        {q.is_correct ? "✓ Correct" : "✗ Incorrect"}
                      </span>
                    </div>

                    <p className="text-xs text-slate-200 font-medium">{q.text}</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-1">
                      <div className="p-3 bg-slate-950/40 rounded-xl border border-white/5">
                        <span className="text-[9px] text-slate-500 uppercase font-bold">Your Response</span>
                        <p className="text-xs text-slate-300 mt-1 font-mono break-all whitespace-pre-wrap max-h-32 overflow-y-auto">
                          {q.user_answer || "No response provided."}
                        </p>
                      </div>
                      <div className="p-3 bg-slate-950/40 rounded-xl border border-white/5">
                        <span className="text-[9px] text-slate-500 uppercase font-bold">Reference / Correct Answer</span>
                        <p className="text-xs text-slate-300 mt-1 font-mono break-all whitespace-pre-wrap max-h-32 overflow-y-auto">
                          {q.correct_answer}
                        </p>
                      </div>
                    </div>

                    {q.explanation && (
                      <div className="mt-1 text-[11px] text-slate-400 bg-white/5 p-3 rounded-xl border border-white/5">
                        <strong className="text-[10px] uppercase tracking-wider text-indigo-400 block mb-1">AI Explanation & Guidance:</strong>
                        {q.explanation}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-white/5 pt-4">
              <Button onClick={() => setActiveReportModal(null)} className="text-xs py-1.5 px-4 h-9 rounded-xl cursor-pointer">
                Close Report
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
