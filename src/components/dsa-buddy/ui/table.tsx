import React from "react"

export const Table: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = "" }) => (
  <div className="w-full overflow-x-auto rounded-xl border border-white/10 bg-slate-900/30 backdrop-blur-md">
    <table className={`w-full border-collapse text-left text-sm ${className}`}>{children}</table>
  </div>
)

export const THead: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = "" }) => (
  <thead className={`border-b border-white/10 bg-white/[0.02] text-slate-400 font-semibold uppercase text-[10px] tracking-wider ${className}`}>{children}</thead>
)

export const TBody: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = "" }) => (
  <tbody className={`divide-y divide-white/5 ${className}`}>{children}</tbody>
)

export const TR: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = "" }) => (
  <tr className={`transition-colors hover:bg-white/[0.01] ${className}`}>{children}</tr>
)

export const TH: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = "" }) => (
  <th className={`px-6 py-3 font-semibold text-slate-300 ${className}`}>{children}</th>
)

export const TD: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = "" }) => (
  <td className={`px-6 py-4 text-slate-300 align-middle ${className}`}>{children}</td>
)
