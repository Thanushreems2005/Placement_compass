import React from "react"

interface BarChartProps {
  data: { label: string; value: number }[]
  maxValue?: number
  height?: number
}

export const BarChart: React.FC<BarChartProps> = ({ data, maxValue, height = 150 }) => {
  const computedMax = maxValue || Math.max(...data.map(d => d.value), 1)

  return (
    <div className="flex flex-col w-full relative">
      <div className="flex items-end justify-between gap-4 w-full px-2" style={{ height: `${height}px` }}>
        {data.map((bar, idx) => {
          const pct = Math.round((bar.value / computedMax) * 100)
          return (
            <div key={idx} className="flex flex-col items-center flex-1 group h-full justify-end relative">
              {/* Hover Value Pop */}
              <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-slate-900 border border-white/10 text-white text-[9px] px-1.5 py-0.5 rounded absolute -top-6 z-10 shadow-xl pointer-events-none">
                {bar.value}
              </span>
              
              {/* Column Bar with glowing gradient */}
              <div 
                className="w-full rounded-t bg-gradient-to-t from-primary/20 to-primary/90 group-hover:to-violet-400 group-hover:shadow-[0_0_12px_rgba(99,102,241,0.4)] transition-all duration-500" 
                style={{ height: `${Math.max(pct, 5)}%` }}
              />
            </div>
          )
        })}
      </div>
      
      {/* Axis Line & Labels */}
      <div className="flex justify-between w-full border-t border-white/10 mt-3 pt-2 text-[9px] text-slate-400">
        {data.map((bar, idx) => (
          <span key={idx} className="flex-1 text-center truncate px-1">{bar.label}</span>
        ))}
      </div>
    </div>
  )
}

interface ProgressRingProps {
  percentage: number
  size?: number
  strokeWidth?: number
  colorClass?: string
  showText?: boolean
}

export const ProgressRing: React.FC<ProgressRingProps> = ({
  percentage,
  size = 100,
  strokeWidth = 8,
  colorClass = "text-primary",
  showText = true
}) => {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (percentage / 100) * circumference

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        {/* Background circular track */}
        <circle
          className="text-white/[0.04]"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        {/* Foreground completed segment ring */}
        <circle
          className={`${colorClass} transition-all duration-1000 ease-out`}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          style={{ filter: "drop-shadow(0 0 3px currentColor)" }}
        />
      </svg>
      {/* Percentage Center Text */}
      {showText && (
        <div className="absolute flex flex-col items-center justify-center">
          <span className="text-lg font-bold text-slate-100">{percentage}%</span>
        </div>
      )}
    </div>
  )
}
