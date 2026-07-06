"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { useAuthStore } from "@/lib/auth-store"
import { useCommandStore } from "@/lib/command-store"
import { Button } from "@/components/ui/button"
import {
  LayoutDashboard,
  Users,
  UserCheck,
  ListTodo,
  DollarSign,
  FileText,
  FolderKanban,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  Search,
  Command,
} from "lucide-react"

const sections = [
  {
    label: "Pilotage",
    items: [{ name: "Dashboard", href: "/", icon: LayoutDashboard }],
  },
  {
    label: "CRM",
    items: [
      { name: "Prospection", href: "/clients", icon: Users },
      { name: "Suivi Client", href: "/suivi-client", icon: UserCheck },
      { name: "Projets", href: "/projets", icon: FolderKanban },
      { name: "Meeting Notes", href: "/meeting-notes", icon: FileText },
    ],
  },
  {
    label: "Exécution",
    items: [
      { name: "Tasks", href: "/tasks", icon: ListTodo },
      { name: "Finances", href: "/finances", icon: DollarSign },
    ],
  },
]

const SIDEBAR_STORAGE_KEY = "crm_sidebar_collapsed"

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const logout = useAuthStore((state) => state.logout)
  const user = useAuthStore((state) => state.user)
  const openCommand = useCommandStore((state) => state.setOpen)
  const [isCollapsed, setIsCollapsed] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    const savedState = window.localStorage.getItem(SIDEBAR_STORAGE_KEY)
    setIsCollapsed(savedState === "1")
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, isCollapsed ? "1" : "0")
  }, [isCollapsed])

  const handleLogout = () => {
    logout()
    router.push("/login")
  }

  const isItemActive = (href: string) => {
    if (href === "/") return pathname === "/"
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  const initials = (user?.email ?? "A").slice(0, 2).toUpperCase()

  return (
    <div
      className={cn(
        "flex h-screen flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-200",
        isCollapsed ? "w-[68px]" : "w-60"
      )}
    >
      {/* Brand */}
      <div
        className={cn(
          "flex h-14 items-center border-b border-sidebar-border",
          isCollapsed ? "justify-center px-2" : "justify-between px-4"
        )}
      >
        {!isCollapsed ? (
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-bold">
              A
            </div>
            <span className="text-sm font-semibold tracking-tight">Aetheria OS</span>
          </div>
        ) : (
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-bold">
            A
          </div>
        )}
        {!isCollapsed ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground"
            onClick={() => setIsCollapsed(true)}
            title="Réduire la navigation"
            aria-label="Réduire la navigation"
          >
            <PanelLeftClose className="h-4 w-4" />
          </Button>
        ) : null}
      </div>

      {/* Search trigger */}
      <div className={cn("pt-3", isCollapsed ? "px-2" : "px-3")}>
        {isCollapsed ? (
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 bg-background"
            onClick={() => openCommand(true)}
            title="Rechercher (Ctrl K)"
            aria-label="Rechercher"
          >
            <Search className="h-4 w-4" />
          </Button>
        ) : (
          <button
            type="button"
            onClick={() => openCommand(true)}
            className="flex h-9 w-full items-center gap-2 rounded-lg border border-input bg-background px-3 text-sm text-muted-foreground transition-colors hover:bg-accent"
          >
            <Search className="h-4 w-4" />
            <span className="flex-1 text-left">Rechercher...</span>
            <kbd className="pointer-events-none flex items-center gap-0.5 rounded border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground">
              <Command className="h-2.5 w-2.5" />K
            </kbd>
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className={cn("flex-1 space-y-4 overflow-y-auto py-4", isCollapsed ? "px-2" : "px-3")}>
        {sections.map((section) => (
          <div key={section.label} className="space-y-1">
            {!isCollapsed ? (
              <p className="px-2 pb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground/70">
                {section.label}
              </p>
            ) : null}
            {section.items.map((item) => {
              const isActive = isItemActive(item.href)
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  title={isCollapsed ? item.name : undefined}
                  className={cn(
                    "flex items-center rounded-lg text-sm font-medium transition-colors",
                    isCollapsed ? "h-9 w-9 justify-center" : "gap-3 px-3 py-2",
                    isActive
                      ? "bg-sidebar-accent text-foreground"
                      : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
                  )}
                >
                  <item.icon className={cn("h-[18px] w-[18px] shrink-0", isActive && "text-foreground")} />
                  {!isCollapsed ? item.name : null}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className={cn("border-t border-sidebar-border", isCollapsed ? "p-2" : "p-3")}>
        {isCollapsed ? (
          <div className="flex flex-col items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground"
              onClick={() => setIsCollapsed(false)}
              title="Étendre la navigation"
              aria-label="Étendre la navigation"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground"
              onClick={handleLogout}
              title="Déconnexion"
              aria-label="Déconnexion"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-lg px-1 py-1">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{user?.email ?? "Admin"}</p>
              <p className="truncate text-xs text-muted-foreground">{user?.role ?? "admin"}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-muted-foreground"
              onClick={handleLogout}
              title="Déconnexion"
              aria-label="Déconnexion"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
