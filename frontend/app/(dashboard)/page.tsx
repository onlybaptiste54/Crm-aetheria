"use client"

import { useQuery } from "@tanstack/react-query"
import { clientsApi, statsApi, tasksApi } from "@/lib/api"
import { getTaskUrgencyLabel, getUpcomingMeetings, getUrgentTasks } from "@/lib/dashboard-service"
import { formatCurrency, formatDate } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, DollarSign, ListTodo, Users } from "lucide-react"

function getMeetingDelayLabel(date: string): string {
  const now = new Date()
  const target = new Date(date)
  const diffMs = target.getTime() - now.getTime()
  const dayDiff = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  if (dayDiff <= 0) return "Aujourd hui"
  if (dayDiff === 1) return "Demain"
  return `Dans ${dayDiff} jours`
}

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["stats"],
    queryFn: () => statsApi.getDashboard(),
  })

  const { data: clients, isLoading: clientsLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: () => clientsApi.getAll(),
  })

  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => tasksApi.getAll(),
  })

  const upcomingMeetings = getUpcomingMeetings(clients, 4)
  const urgentTasks = getUrgentTasks(tasks, 6)

  if (statsLoading || clientsLoading || tasksLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-[104px] animate-pulse rounded-xl border bg-muted/40" />
          ))}
        </div>
        <div className="grid gap-6 xl:grid-cols-2">
          <div className="h-64 animate-pulse rounded-xl border bg-muted/40" />
          <div className="h-64 animate-pulse rounded-xl border bg-muted/40" />
        </div>
      </div>
    )
  }

  const recurringMonthly = stats?.total_recurring_expenses_monthly ?? stats?.total_mrr ?? 0
  const monthExpenses = stats?.total_expenses_this_month ?? 0
  const activeClients = stats?.active_clients_count ?? 0
  const pendingTasks = stats?.pending_tasks_count ?? 0
  const dueToday = stats?.tasks_due_today ?? 0

  const kpis = [
    {
      label: "Dépenses récurrentes / mois",
      value: formatCurrency(recurringMonthly),
      hint: "Abonnements comptés chaque mois",
      icon: DollarSign,
      tint: "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400",
    },
    {
      label: "Dépenses du mois",
      value: formatCurrency(monthExpenses),
      hint: "Récurrent + ponctuel du mois",
      icon: DollarSign,
      tint: "bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400",
    },
    {
      label: "Clients actifs",
      value: String(activeClients),
      hint: "Statut client en cours",
      icon: Users,
      tint: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400",
    },
    {
      label: "Tâches ouvertes",
      value: String(pendingTasks),
      hint: `${dueToday} échéance(s) aujourd'hui`,
      icon: ListTodo,
      tint: "bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400",
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Bonjour 👋</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Vue globale : dépenses, priorités et prochaines actions.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="transition-shadow hover:shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{kpi.label}</span>
                <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${kpi.tint}`}>
                  <kpi.icon className="h-4 w-4" />
                </span>
              </div>
              <div className="mt-3 text-2xl font-semibold tracking-tight">{kpi.value}</div>
              <p className="mt-1 text-xs text-muted-foreground">{kpi.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Prochains rendez-vous
            </CardTitle>
            <CardDescription>Actions clients planifiees a venir</CardDescription>
          </CardHeader>
          <CardContent>
            {!upcomingMeetings.length ? (
              <p className="text-sm text-muted-foreground">
                Aucun RDV a venir. Ajoutez une date de prochaine action sur un client.
              </p>
            ) : (
              <div className="space-y-3">
                {upcomingMeetings.map((client) => (
                  <div
                    key={client.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
                  >
                    <div>
                      <p className="font-medium">{client.company_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(client.next_action_date as string)} -{" "}
                        {getMeetingDelayLabel(client.next_action_date as string)}
                      </p>
                    </div>
                    <Badge variant="outline">{client.pipeline_stage}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListTodo className="h-5 w-5" />
              Taches urgentes
            </CardTitle>
            <CardDescription>Priorite haute ou echeance proche</CardDescription>
          </CardHeader>
          <CardContent>
            {!urgentTasks.length ? (
              <p className="text-sm text-muted-foreground">Aucune tache urgente pour le moment.</p>
            ) : (
              <div className="space-y-3">
                {urgentTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
                  >
                    <div className="min-w-[220px] flex-1">
                      <p className="font-medium">{task.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {task.due_date ? `Echeance ${formatDate(task.due_date)}` : "Sans date limite"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={task.priority === "High" ? "destructive" : "warning"}>
                        {getTaskUrgencyLabel(task)}
                      </Badge>
                      <Badge variant="outline">{task.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
