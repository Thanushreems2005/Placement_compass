import { create } from "zustand"

export interface User {
  id: string
  email: string
  is_active: boolean
  is_superuser: boolean
}

export interface SubmissionQuestion {
  text: string
  topic: string
  type: "mcq" | "coding"
  options?: string[]
  correct_answer: string
  user_answer: string
  is_correct: boolean
  explanation?: string
}

export interface Submission {
  id: string
  timestamp: string
  type: "Skill Assessment" | "Coding Arena"
  title: string
  score: number
  correct_answers: number
  total_questions: number
  accuracy_percentage: number
  ai_feedback: string
  questions: SubmissionQuestion[]
}

export interface ToastMessage {
  id: string
  title: string
  description?: string
  type: "success" | "error" | "info"
}

interface AppState {
  user: User | null
  token: string | null
  dbConnected: boolean
  redisConnected: boolean
  isLoading: boolean
  theme: "dark" | "light"
  toasts: ToastMessage[]
  submissions: Submission[]
  activeArenaLevel: number | null
  setActiveArenaLevel: (level: number | null) => void
  setAuth: (user: User | null, token: string | null) => void
  logout: () => void
  setSystemStatus: (dbConnected: boolean, redisConnected: boolean) => void
  setIsLoading: (loading: boolean) => void
  setTheme: (theme: "dark" | "light") => void
  addToast: (toast: Omit<ToastMessage, "id">) => void
  removeToast: (id: string) => void
  addSubmission: (sub: Omit<Submission, "id" | "timestamp">) => void
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  token: localStorage.getItem("token") || localStorage.getItem("placement_resume_career_token"),
  dbConnected: false,
  redisConnected: false,
  isLoading: false,
  activeArenaLevel: null,
  setActiveArenaLevel: (level) => set({ activeArenaLevel: level }),
  theme: (localStorage.getItem("theme") as "dark" | "light") || "dark",
  toasts: [],
  submissions: (() => {
    try {
      return JSON.parse(localStorage.getItem("portal_submissions") || "[]")
    } catch {
      return []
    }
  })(),
  
  setAuth: (user, token) => {
    if (token) {
      localStorage.setItem("token", token)
      localStorage.setItem("placement_resume_career_token", token)
    } else {
      localStorage.removeItem("token")
      localStorage.removeItem("placement_resume_career_token")
    }
    set({ user, token })
  },
  
  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("placement_career_token");
    localStorage.removeItem("placement_resume_career_token");
    localStorage.removeItem("placement_resume_optimizer_analysis");
    localStorage.removeItem("portal_submissions");
    localStorage.removeItem("portal_assessments");
    localStorage.removeItem("portal_diagnostics");
    set({ user: null, token: null, submissions: [] });
  },
  
  setSystemStatus: (dbConnected, redisConnected) => 
    set({ dbConnected, redisConnected }),
  
  setIsLoading: (isLoading) => 
    set({ isLoading }),

  setTheme: (theme) => {
    localStorage.setItem("theme", theme)
    // Apply class to HTML tag for Tailwind v4 theme targeting
    if (theme === "dark") {
      document.documentElement.classList.add("dark")
      document.documentElement.classList.remove("light")
    } else {
      document.documentElement.classList.add("light")
      document.documentElement.classList.remove("dark")
    }
    set({ theme })
  },

  addToast: (toast) => {
    const id = Math.random().toString(36).substring(2, 9)
    const newToast = { ...toast, id }
    set((state) => ({ toasts: [...state.toasts, newToast] }))
    // Auto remove after 4 seconds
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
    }, 4000)
  },

  removeToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
  },

  addSubmission: (sub) => {
    const id = "SUB-" + Math.random().toString(36).substring(2, 8).toUpperCase()
    const timestamp = new Date().toLocaleString()
    const newSubmission = { ...sub, id, timestamp }
    set((state) => {
      const updated = [newSubmission, ...state.submissions]
      localStorage.setItem("portal_submissions", JSON.stringify(updated))
      return { submissions: updated }
    })
  }
}))
