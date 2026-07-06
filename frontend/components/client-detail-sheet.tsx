"use client"

import { useQuery } from "@tanstack/react-query"
import { meetingNotesApi, tasksApi, type Client } from "@/lib/api"
import { formatDate } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet"
import { Pencil, FileText, Phone, Mail, Calendar } from "lucide-react"

const statusColors = {
  Prospect: "secondary",
  Client: "success",
  Archive: "outline",
} as const

const priorityColors = {
  Low: "secondary",
  Medium: "warning",
  High: "destructive",
} as const

const taskStatusDot: Record<string, string> = {
  Backlog: "bg-slate-400",
  Todo: "bg-blue-500",
  "In Progress": "bg-amber-500",
  Validation: "bg-indigo-500",
  Done: "bg-emerald-500",
}

function Property({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="truncate text-sm">{value}</div>
    </div>
  )
}

export function ClientDetailSheet({
  client,
  onOpenChange,
  onEdit,
}: {
  client: Client | null
  onOpenChange: (open: boolean) => void
  onEdit?: (client: Client) => void
}) {
  const { data: tasks } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => tasksApi.getAll(),
    enabled: Boolean(client),
  })
  const { data: notes } = useQuery({
    queryKey: ["meeting-notes"],
    queryFn: () => meetingNotesApi.getAll(),
    enabled: Boolean(client),
  })

  const clientTasks = client ? (tasks ?? []).filter((t) => t.client_id === client.id) : []
  const clientNotes = client ? (notes ?? []).filter((n) => n.client_id === client.id) : []
  const initials = client ? client.company_name.slice(0, 2).toUpperCase() : ""

  return (
    <Sheet open={Boolean(client)} onOpenChange={onOpenChange}>
      <SheetContent className="p-0">
        {client ? (
          <div className="flex h-full flex-col">
            {/* Header */}
            <div className="border-b p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-secondary text-sm font-semibold">
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <SheetTitle className="truncate">{client.company_name}</SheetTitle>
                    <Badge variant={statusColors[client.status]}>{client.status}</Badge>
                  </div>
                  <SheetDescription className="truncate">
                    {client.contact_person || "Sans contact"}
                  </SheetDescription>
                </div>
                {onEdit ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mr-7 shrink-0"
                    onClick={() => onEdit(client)}
                  >
                    <Pencil className="mr-1.5 h-3.5 w-3.5" />
                    Modifier
                  </Button>
                ) : null}
              </div>

              {/* Contact quick row */}
              {client.email || client.phone ? (
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  {client.email ? (
                    <a href={`mailto:${client.email}`} className="flex items-center gap-1.5 hover:text-foreground">
                      <Mail className="h-3.5 w-3.5" />
                      {client.email}
                    </a>
                  ) : null}
                  {client.phone ? (
                    <a href={`tel:${client.phone}`} className="flex items-center gap-1.5 hover:text-foreground">
                      <Phone className="h-3.5 w-3.5" />
                      {client.phone}
                    </a>
                  ) : null}
                </div>
              ) : null}
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto">
              {/* Properties */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 border-b p-5">
                <Property label="Pipeline" value={client.pipeline_stage} />
                <Property
                  label="Priorité"
                  value={<Badge variant={priorityColors[client.priority]}>{client.priority}</Badge>}
                />
                <Property label="Secteur" value={client.sector || "—"} />
                <Property label="Taille" value={client.company_size || "—"} />
                <Property
                  label="Prochaine action"
                  value={
                    client.next_action_date ? (
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        {formatDate(client.next_action_date)}
                      </span>
                    ) : (
                      "—"
                    )
                  }
                />
                <Property label="Ajouté le" value={formatDate(client.created_at)} />
              </div>

              {/* Notes libres */}
              {client.notes ? (
                <div className="border-b p-5">
                  <div className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Notes
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">{client.notes}</p>
                </div>
              ) : null}

              {/* Linked tasks */}
              <div className="border-b p-5">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium">
                    Tâches liées <span className="text-muted-foreground">{clientTasks.length}</span>
                  </span>
                </div>
                {clientTasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucune tâche liée à ce client.</p>
                ) : (
                  <div className="flex flex-col">
                    {clientTasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center gap-2.5 border-t py-2 first:border-t-0"
                      >
                        <span
                          className={`h-2 w-2 shrink-0 rounded-full ${taskStatusDot[task.status] ?? "bg-slate-400"}`}
                        />
                        <span className="min-w-0 flex-1 truncate text-sm">{task.title}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">{task.status}</span>
                        {task.due_date ? (
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {formatDate(task.due_date)}
                          </span>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Linked meeting notes */}
              <div className="p-5">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium">
                    Comptes-rendus <span className="text-muted-foreground">{clientNotes.length}</span>
                  </span>
                </div>
                {clientNotes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucun compte-rendu pour ce client.</p>
                ) : (
                  <div className="flex flex-col">
                    {clientNotes.map((note) => (
                      <div
                        key={note.id}
                        className="flex items-center gap-2.5 border-t py-2 first:border-t-0"
                      >
                        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="min-w-0 flex-1 truncate text-sm">{note.title}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {formatDate(note.date)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
