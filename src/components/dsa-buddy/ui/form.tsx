import React from "react"

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input: React.FC<InputProps> = ({ label, error, className = "", ...props }) => {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && <label className="text-[10px] font-semibold text-slate-400 tracking-wider uppercase">{label}</label>}
      <input
        className={`w-full rounded-xl border border-white/10 bg-slate-900/40 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 backdrop-blur-md outline-none transition-all duration-300 focus:border-primary/50 focus:shadow-[0_0_10px_rgba(99,102,241,0.15)] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
        {...props}
      />
      {error && <span className="text-xs text-rose-400 mt-0.5">{error}</span>}
    </div>
  )
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  children: React.ReactNode
}

export const Select: React.FC<SelectProps> = ({ label, error, children, className = "", ...props }) => {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && <label className="text-[10px] font-semibold text-slate-400 tracking-wider uppercase">{label}</label>}
      <select
        className={`w-full rounded-xl border border-white/10 bg-slate-900/40 px-4 py-2.5 text-sm text-slate-100 backdrop-blur-md outline-none transition-all duration-300 focus:border-primary/50 focus:shadow-[0_0_10px_rgba(99,102,241,0.15)] ${className}`}
        {...props}
      >
        {children}
      </select>
      {error && <span className="text-xs text-rose-400 mt-0.5">{error}</span>}
    </div>
  )
}
