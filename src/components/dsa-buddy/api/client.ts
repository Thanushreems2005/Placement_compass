import axios from "axios"

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
})

// Request interceptor to dynamically inject auth tokens
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token") || localStorage.getItem("placement_resume_career_token")
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for centralized error auditing
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Audit response status codes (e.g. handle expired tokens)
    if (error.response && error.response.status === 401) {
      console.warn("Unauthorized request. Clearing credentials...")
      localStorage.removeItem("token")
      localStorage.removeItem("placement_resume_career_token")
    }
    return Promise.reject(error)
  }
)

export default apiClient
