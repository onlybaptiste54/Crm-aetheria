import axios from "axios"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
})

// Interceptor pour ajouter le token à chaque requête
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token")
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Interceptor pour gérer les erreurs
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expiré ou invalide, redirect vers login
      localStorage.removeItem("token")
      if (typeof window !== "undefined") {
        window.location.href = "/login"
      }
    }
    return Promise.reject(error)
  }
)

// Types
export interface Client {
  id: string
  company_name: string
  contact_person?: string
  status: "Prospect" | "Client" | "Archive"
  pipeline_stage: "New" | "Contacted" | "Meeting Booked" | "Dev" | "Signed" | "Delivered"
  priority: "Low" | "Medium" | "High"
  sector?: string
  company_size?: "TPE" | "PME" | "ETI" | "GE"
  phone?: string
  email?: string
  next_action_date?: string
  notes?: string
  created_at: string
}

export interface Task {
  id: string
  title: string
  description?: string
  status: "Backlog" | "Todo" | "In Progress" | "Validation" | "Done"
  priority: "Low" | "Medium" | "High"
  due_date?: string | null
  estimated_hours?: number | null
  actual_hours?: number | null
  tags?: string[]
  client_id?: string | null
  created_at: string
}

export interface Finance {
  id: string
  name: string
  type: "Subscription" | "One-off"
  category: "Software" | "Hardware" | "Service" | "Office"
  amount: number
  currency: string
  billing_date: string
  renewal_date?: string
  is_paid: boolean
  invoice_path?: string
  created_at: string
}

export interface Project {
  id: string
  name: string
  description?: string | null
  status: "Active" | "On Hold" | "Done" | "Archived"
  client_id: string
  created_at: string
}

export interface Document {
  id: string
  name: string
  file_path: string
  file_size?: number | null
  content_type?: string | null
  project_id: string
  created_at: string
}

export interface MeetingNote {
  id: string
  title: string
  date: string
  content?: string
  attachments?: string[]
  client_id: string
}

export interface DashboardStats {
  total_mrr: number
  total_recurring_expenses_monthly: number
  total_expenses_this_month: number
  active_clients_count: number
  pending_tasks_count: number
  tasks_due_today: number
}

export interface User {
  id: string
  email: string
  is_active: boolean
  role: string
  created_at: string
}

// Auth API
export const authApi = {
  login: async (email: string, password: string) => {
    const formData = new FormData()
    formData.append("username", email)
    formData.append("password", password)
    
    const response = await api.post("/auth/token", formData, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    })
    return response.data
  },
  
  getMe: async (): Promise<User> => {
    const response = await api.get("/users/me")
    return response.data
  },
}

// Clients API
export const clientsApi = {
  getAll: async (): Promise<Client[]> => {
    const response = await api.get("/clients")
    return response.data
  },
  
  getById: async (id: string): Promise<Client> => {
    const response = await api.get(`/clients/${id}`)
    return response.data
  },
  
  create: async (data: Partial<Client>): Promise<Client> => {
    const response = await api.post("/clients", data)
    return response.data
  },
  
  update: async (id: string, data: Partial<Client>): Promise<Client> => {
    const response = await api.put(`/clients/${id}`, data)
    return response.data
  },
  
  delete: async (id: string): Promise<void> => {
    await api.delete(`/clients/${id}`)
  },
}

// Tasks API
export const tasksApi = {
  getAll: async (): Promise<Task[]> => {
    const response = await api.get("/tasks")
    return response.data
  },
  
  getById: async (id: string): Promise<Task> => {
    const response = await api.get(`/tasks/${id}`)
    return response.data
  },
  
  create: async (data: Partial<Task>): Promise<Task> => {
    const response = await api.post("/tasks", data)
    return response.data
  },
  
  update: async (id: string, data: Partial<Task>): Promise<Task> => {
    const response = await api.put(`/tasks/${id}`, data)
    return response.data
  },
  
  delete: async (id: string): Promise<void> => {
    await api.delete(`/tasks/${id}`)
  },
}

// Finances API
export const financesApi = {
  getAll: async (): Promise<Finance[]> => {
    const response = await api.get("/finances")
    return response.data
  },
  
  getById: async (id: string): Promise<Finance> => {
    const response = await api.get(`/finances/${id}`)
    return response.data
  },
  
  create: async (data: Partial<Finance>): Promise<Finance> => {
    const response = await api.post("/finances", data)
    return response.data
  },
  
  update: async (id: string, data: Partial<Finance>): Promise<Finance> => {
    const response = await api.put(`/finances/${id}`, data)
    return response.data
  },
  
  delete: async (id: string): Promise<void> => {
    await api.delete(`/finances/${id}`)
  },
}

// Meeting Notes API
export const meetingNotesApi = {
  getAll: async (): Promise<MeetingNote[]> => {
    const response = await api.get("/meeting-notes")
    return response.data
  },
  
  getById: async (id: string): Promise<MeetingNote> => {
    const response = await api.get(`/meeting-notes/${id}`)
    return response.data
  },
  
  create: async (data: Partial<MeetingNote>): Promise<MeetingNote> => {
    const response = await api.post("/meeting-notes", data)
    return response.data
  },
  
  update: async (id: string, data: Partial<MeetingNote>): Promise<MeetingNote> => {
    const response = await api.put(`/meeting-notes/${id}`, data)
    return response.data
  },
  
  delete: async (id: string): Promise<void> => {
    await api.delete(`/meeting-notes/${id}`)
  },
}

// Projects API
export const projectsApi = {
  getAll: async (clientId?: string): Promise<Project[]> => {
    const response = await api.get("/projects", {
      params: clientId ? { client_id: clientId } : undefined,
    })
    return response.data
  },

  create: async (data: Partial<Project>): Promise<Project> => {
    const response = await api.post("/projects", data)
    return response.data
  },

  update: async (id: string, data: Partial<Project>): Promise<Project> => {
    const response = await api.put(`/projects/${id}`, data)
    return response.data
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/projects/${id}`)
  },
}

// Documents API
export const documentsApi = {
  listByProject: async (projectId: string): Promise<Document[]> => {
    const response = await api.get(`/projects/${projectId}/documents`)
    return response.data
  },

  upload: async (projectId: string, file: File): Promise<Document> => {
    const formData = new FormData()
    formData.append("file", file)
    const response = await api.post(`/projects/${projectId}/documents`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    return response.data
  },

  download: async (doc: Document): Promise<void> => {
    const response = await api.get(`/documents/${doc.id}/download`, {
      responseType: "blob",
    })
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement("a")
    link.href = url
    link.download = doc.name
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/documents/${id}`)
  },
}

// Stats API
export const statsApi = {
  getDashboard: async (): Promise<DashboardStats> => {
    const response = await api.get("/stats")
    return response.data
  },
}

// Upload API
export const uploadApi = {
  uploadFile: async (file: File) => {
    const formData = new FormData()
    formData.append("file", file)
    
    const response = await api.post("/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    })
    return response.data
  },
}
