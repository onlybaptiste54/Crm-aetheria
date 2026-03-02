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
    return <div className="py-12 text-center">Chargement...</div>
  }

  const recurringMonthly = stats?.total_recurring_expenses_monthly ?? stats?.total_mrr ?? 0
  const monthExpenses = stats?.total_expenses_this_month ?? 0
  const activeClients = stats?.active_clients_count ?? 0
  const pendingTasks = stats?.pending_tasks_count ?? 0
  const dueToday = stats?.tasks_due_today ?? 0

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-gradient-to-r from-slate-50 to-slate-100 p-6">
        <h1 className="text-3xl font-bold">Dashboard CRM</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Vue globale: depenses, priorites et prochaines actions.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Depenses recurrentes / mois</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(recurringMonthly)}</div>
            <p className="text-xs text-muted-foreground">Abonnements comptes chaque mois</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Depenses du mois</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(monthExpenses)}</div>
            <p className="text-xs text-muted-foreground">Recurrent + ponctuel du mois</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clients actifs</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeClients}</div>
            <p className="text-xs text-muted-foreground">Statut client en cours</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taches ouvertes</CardTitle>
            <ListTodo className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingTasks}</div>
            <p className="text-xs text-muted-foreground">{dueToday} echeance(s) aujourd hui</p>
          </CardContent>
        </Card>
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
