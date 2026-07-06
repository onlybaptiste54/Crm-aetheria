"use client"

import { usePathname } from "next/navigation"
import { Sidebar } from "@/components/sidebar"
import { AuthGuard } from "@/components/auth-guard"
import { CommandPalette } from "@/components/command-palette"

const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/clients": "Prospection",
  "/suivi-client": "Suivi Client",
  "/projets": "Projets",
  "/tasks": "Tasks",
  "/finances": "Finances",
  "/meeting-notes": "Meeting Notes",
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const title = pageTitles[pathname] ?? "Aetheria OS"

  return (
    <AuthGuard>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-background/80 px-6 backdrop-blur">
            <span className="text-sm font-medium">{title}</span>
          </header>
          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-[1400px] px-6 py-6">{children}</div>
          </main>
        </div>
      </div>
      <CommandPalette />
    </AuthGuard>
  )
}
