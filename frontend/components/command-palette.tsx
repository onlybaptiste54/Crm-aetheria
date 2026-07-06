"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { useQuery } from "@tanstack/react-query"
import { clientsApi, tasksApi } from "@/lib/api"
import { useCommandStore } from "@/lib/command-store"
import { cn } from "@/lib/utils"
import {
  Search,
  LayoutDashboard,
  Users,
  UserCheck,
  ListTodo,
  DollarSign,
  FileText,
  FolderKanban,
  Building2,
  CornerDownLeft,
} from "lucide-react"

type CommandItem = {
  id: string
  label: string
  hint?: string
  group: string
  icon: React.ComponentType<{ className?: string }>
  keywords?: string
  run: () => void
}

const pages = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard, keywords: "accueil home" },
  { name: "Prospection", href: "/clients", icon: Users, keywords: "prospects leads" },
  { name: "Suivi Client", href: "/suivi-client", icon: UserCheck, keywords: "clients actifs" },
  { name: "Projets", href: "/projets", icon: FolderKanban, keywords: "documents fichiers depot" },
  { name: "Tasks", href: "/tasks", icon: ListTodo, keywords: "kanban taches todo" },
  { name: "Finances", href: "/finances", icon: DollarSign, keywords: "depenses abonnements" },
  { name: "Meeting Notes", href: "/meeting-notes", icon: FileText, keywords: "comptes rendus cr" },
]

export function CommandPalette() {
  const { open, setOpen } = useCommandStore()
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState("")
  const [activeIndex, setActiveIndex] = useState(0)

  const { data: clients } = useQuery({
    queryKey: ["clients"],
    queryFn: () => clientsApi.getAll(),
    staleTime: 30_000,
  })
  const { data: tasks } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => tasksApi.getAll(),
    staleTime: 30_000,
  })

  // Global keyboard shortcut
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        useCommandStore.getState().toggle()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  useEffect(() => {
    if (open) {
      setQuery("")
      setActiveIndex(0)
    }
  }, [open])

  const go = (href: string) => {
    setOpen(false)
    router.push(href)
  }

  const items = useMemo<CommandItem[]>(() => {
    const nav: CommandItem[] = pages.map((p) => ({
      id: `page-${p.href}`,
      label: p.name,
      group: "Navigation",
      icon: p.icon,
      keywords: p.keywords,
      run: () => go(p.href),
    }))

    const clientItems: CommandItem[] = (clients ?? []).map((c) => ({
      id: `client-${c.id}`,
      label: c.company_name,
      hint: c.status === "Client" ? "Client" : c.status === "Prospect" ? "Prospect" : "Archive",
      group: "Clients",
      icon: Building2,
      keywords: `${c.contact_person ?? ""} ${c.email ?? ""} ${c.sector ?? ""}`,
      run: () => go(c.status === "Client" ? "/suivi-client" : "/clients"),
    }))

    const taskItems: CommandItem[] = (tasks ?? []).map((t) => ({
      id: `task-${t.id}`,
      label: t.title,
      hint: t.status,
      group: "Tâches",
      icon: ListTodo,
      keywords: (t.tags ?? []).join(" "),
      run: () => go("/tasks"),
    }))

    return [...nav, ...clientItems, ...taskItems]
  }, [clients, tasks]) // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items.filter((i) => i.group === "Navigation")
    return items
      .filter((i) => `${i.label} ${i.keywords ?? ""} ${i.hint ?? ""}`.toLowerCase().includes(q))
      .slice(0, 40)
  }, [items, query])

  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  const grouped = useMemo(() => {
    const map = new Map<string, CommandItem[]>()
    filtered.forEach((item) => {
      const list = map.get(item.group) ?? []
      list.push(item)
      map.set(item.group, list)
    })
    return Array.from(map.entries())
  }, [filtered])

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === "Enter") {
      e.preventDefault()
      filtered[activeIndex]?.run()
    }
  }

  let runningIndex = -1

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          onOpenAutoFocus={(e) => {
            e.preventDefault()
            inputRef.current?.focus()
          }}
          className="fixed left-[50%] top-[15%] z-50 w-full max-w-xl translate-x-[-50%] overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          <DialogPrimitive.Title className="sr-only">Recherche</DialogPrimitive.Title>
          <div className="flex items-center gap-2 border-b px-3">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Rechercher une page, un client, une tâche..."
              className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>

          <div className="max-h-[360px] overflow-y-auto p-2">
            {filtered.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                Aucun résultat pour « {query} »
              </p>
            ) : (
              grouped.map(([group, groupItems]) => (
                <div key={group} className="mb-1">
                  <p className="px-2 py-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    {group}
                  </p>
                  {groupItems.map((item) => {
                    runningIndex += 1
                    const index = runningIndex
                    const isActive = index === activeIndex
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => item.run()}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm transition-colors",
                          isActive ? "bg-accent text-accent-foreground" : "text-foreground"
                        )}
                      >
                        <item.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="flex-1 truncate">{item.label}</span>
                        {item.hint ? (
                          <span className="shrink-0 text-xs text-muted-foreground">{item.hint}</span>
                        ) : null}
                        {isActive ? (
                          <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        ) : null}
                      </button>
                    )
                  })}
                </div>
              ))
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
