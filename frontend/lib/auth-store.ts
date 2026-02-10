"use client"

import { create } from "zustand"
import { authApi, type User } from "./api"

interface AuthState {
  token: string | null
  user: User | null
  isAuthenticated: boolean
  hydrated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  setUser: (user: User) => void
  initAuth: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isAuthenticated: false,
  hydrated: false,

  initAuth: () => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token")
      const userStr = localStorage.getItem("user")
      const user = userStr ? JSON.parse(userStr) : null
      
      set({
        token,
        user,
        isAuthenticated: !!token,
        hydrated: true,
      })
    }
  },

  login: async (email: string, password: string) => {
    const data = await authApi.login(email, password)
    localStorage.setItem("token", data.access_token)
    
    // Récupérer le profil user
    const user = await authApi.getMe()
    localStorage.setItem("user", JSON.stringify(user))
    
    set({
      token: data.access_token,
      user,
      isAuthenticated: true,
    })
  },

  logout: () => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    set({
      token: null,
      user: null,
      isAuthenticated: false,
    })
  },

  setUser: (user: User) => {
    localStorage.setItem("user", JSON.stringify(user))
    set({ user })
  },
}))
