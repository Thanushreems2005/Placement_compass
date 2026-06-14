import React from "react"

interface LoaderProps {
  size?: "sm" | "md" | "lg"
  className?: string
}

export const Loader: React.FC<LoaderProps> = ({ size = "md", className = "" }) => {
  const sizeClasses = {
    sm: "w-6 h-6 border-2",
    md: "w-10 h-10 border-3",
    lg: "w-16 h-16 border-4",
  }

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div
        className={`${sizeClasses[size]} rounded-full border-t-transparent border-primary animate-spin relative`}
      >
        <div className="absolute inset-0 rounded-full border-inherit opacity-10 border-white"></div>
      </div>
    </div>
  )
}
