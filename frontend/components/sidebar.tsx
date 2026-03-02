"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { useAuthStore } from "@/lib/auth-store"
import { Button } from "@/components/ui/button"
import {
  LayoutDashboard,
  Users,
  UserCheck,
  ListTodo,
  DollarSign,
  FileText,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
} from "lucide-react"

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Prospection", href: "/clients", icon: Users },
  { name: "Suivi Client", href: "/suivi-client", icon: UserCheck },
  { name: "Tasks", href: "/tasks", icon: ListTodo },
  { name: "Finances", href: "/finances", icon: DollarSign },
  { name: "Meeting Notes", href: "/meeting-notes", icon: FileText },
]

const SIDEBAR_STORAGE_KEY = "crm_sidebar_collapsed"

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const logout = useAuthStore((state) => state.logout)
  const user = useAuthStore((state) => state.user)
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

  return (
    <div
      className={cn(
        "flex h-screen flex-col border-r bg-slate-50 transition-all duration-200",
        isCollapsed ? "w-20" : "w-64"
      )}
    >
      <div
        className={cn(
          "flex h-16 items-center border-b",
          isCollapsed ? "justify-center px-2" : "justify-between px-4"
        )}
      >
        {!isCollapsed ? <h1 className="text-xl font-bold">Aetheria OS</h1> : null}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed((value) => !value)}
          title={isCollapsed ? "Etendre la navigation" : "Reduire la navigation"}
          aria-label={isCollapsed ? "Etendre la navigation" : "Reduire la navigation"}
        >
          {isCollapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </Button>
      </div>

      <nav className={cn("flex-1 space-y-1", isCollapsed ? "p-2" : "p-4")}>
        {navigation.map((item) => {
          const isActive = isItemActive(item.href)
          return (
            <Link
              key={item.name}
              href={item.href}
              title={isCollapsed ? item.name : undefined}
              className={cn(
                "flex items-center rounded-lg py-2 text-sm font-medium transition-colors",
                isCollapsed ? "justify-center px-2" : "gap-3 px-3",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              {!isCollapsed ? item.name : null}
            </Link>
          )
        })}
      </nav>

      <div className={cn("border-t space-y-2", isCollapsed ? "p-2" : "p-4")}>
        {!isCollapsed ? (
          <div className="px-3 py-2 text-sm">
            <p className="font-medium">{user?.email}</p>
            <p className="text-xs text-muted-foreground">{user?.role}</p>
          </div>
        ) : null}
        <Button
          variant="outline"
          className={cn("w-full", isCollapsed ? "justify-center" : "justify-start")}
          onClick={handleLogout}
          title="Deconnexion"
          aria-label="Deconnexion"
        >
          <LogOut className={cn("h-4 w-4", !isCollapsed && "mr-2")} />
          {!isCollapsed ? "Deconnexion" : null}
        </Button>
      </div>
    </div>
  )
}
