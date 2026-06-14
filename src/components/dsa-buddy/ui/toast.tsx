import React from "react"
import { useAppStore } from "../store/useAppStore"
import { X, CheckCircle, AlertTriangle, Info } from "lucide-react"

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useAppStore()

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-3 max-w-sm w-full animate-in fade-in slide-in-from-bottom-5 duration-300">
      {toasts.map((toast) => {
        const iconMap = {
          success: <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />,
          error: <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />,
          info: <Info className="w-5 h-5 text-cyan-400 shrink-0" />,
        }

        const bgMap = {
          success: "bg-slate-900/95 border-emerald-500/30 text-slate-100 shadow-emerald-500/5",
          error: "bg-slate-900/95 border-rose-500/30 text-slate-100 shadow-rose-500/5",
          info: "bg-slate-900/95 border-cyan-500/30 text-slate-100 shadow-cyan-500/5",
        }

        return (
          <div
            key={toast.id}
            className={`flex items-start gap-3 p-4 rounded-xl border backdrop-blur-md shadow-lg transition-all duration-300 hover:scale-[1.02] ${bgMap[toast.type]}`}
          >
            {iconMap[toast.type]}
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-sm leading-none mb-1 text-slate-100">{toast.title}</h4>
              {toast.description && (
                <p className="text-xs text-slate-400 leading-normal mt-1">{toast.description}</p>
              )}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-500 hover:text-slate-300 transition-colors shrink-0 active:scale-95 ml-2 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
