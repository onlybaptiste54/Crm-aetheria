"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/lib/auth-store"

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const { isAuthenticated, hydrated, initAuth } = useAuthStore()

  useEffect(() => {
    // Initialize auth from localStorage on mount
    if (!hydrated) {
      initAuth()
    }
  }, [hydrated, initAuth])

  useEffect(() => {
    if (hydrated) {
      if (!isAuthenticated) {
        router.push("/login")
      } else {
        setIsLoading(false)
      }
    }
  }, [isAuthenticated, hydrated, router])

  if (!hydrated || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Chargement...</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return <>{children}</>
}
