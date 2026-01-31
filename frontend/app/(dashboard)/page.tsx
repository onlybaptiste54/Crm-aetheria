"use client"

import { useQuery } from "@tanstack/react-query"
import { statsApi, clientsApi, tasksApi } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatCurrency, formatDate } from "@/lib/utils"
import { TrendingUp, Users, ListTodo, DollarSign, Calendar } from "lucide-react"

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["stats"],
    queryFn: () => statsApi.getDashboard(),
  })

  const { data: clients } = useQuery({
    queryKey: ["clients"],
    queryFn: () => clientsApi.getAll(),
  })

  const { data: tasks } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => tasksApi.getAll(),
  })

  // Prochains RDV (clients avec next_action_date)
  const upcomingMeetings = clients
    ?.filter((c) => c.next_action_date)
    .sort((a, b) => 
      new Date(a.next_action_date!).getTime() - new Date(b.next_action_date!).getTime()
    )
    .slice(0, 3)

  // Tâches urgentes (High priority + pas Done)
  const urgentTasks = tasks
    ?.filter((t) => t.priority === "High" && t.status !== "Done")
    .slice(0, 5)

  if (statsLoading) {
    return <div className="text-center py-12">Chargement...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Vue d'ensemble de votre activité</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">MRR Total</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats?.total_mrr || 0)}
            </div>
            <p className="text-xs text-muted-foreground">Abonnements mensuels</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dépenses ce mois</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats?.total_expenses_this_month || 0)}
            </div>
            <p className="text-xs text-muted-foreground">Total des dépenses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clients Actifs</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.active_clients_count || 0}</div>
            <p className="text-xs text-muted-foreground">En cours de projet</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tâches en Cours</CardTitle>
            <ListTodo className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pending_tasks_count || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.tasks_due_today || 0} à échéance aujourd'hui
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Prochains RDV */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Prochains RDV
            </CardTitle>
            <CardDescription>Les 3 prochaines actions clients</CardDescription>
          </CardHeader>
          <CardContent>
            {!upcomingMeetings?.length ? (
              <p className="text-sm text-muted-foreground">Aucun RDV planifié</p>
            ) : (
              <div className="space-y-3">
                {upcomingMeetings.map((client) => (
                  <div
                    key={client.id}
                    className="flex items-center justify-between border-b pb-3 last:border-0"
                  >
                    <div>
                      <p className="font-medium">{client.company_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(client.next_action_date!)}
                      </p>
                    </div>
                    <Badge>{client.pipeline_stage}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tâches Urgentes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListTodo className="h-5 w-5" />
              Tâches Urgentes
            </CardTitle>
            <CardDescription>Priorité haute à traiter</CardDescription>
          </CardHeader>
          <CardContent>
            {!urgentTasks?.length ? (
              <p className="text-sm text-muted-foreground">Aucune tâche urgente</p>
            ) : (
              <div className="space-y-3">
                {urgentTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between border-b pb-3 last:border-0"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{task.title}</p>
                      <p className="text-sm text-muted-foreground">{task.status}</p>
                    </div>
                    <Badge variant="destructive">High</Badge>
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
