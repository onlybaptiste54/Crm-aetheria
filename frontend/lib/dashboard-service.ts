import type { Client, Task } from "@/lib/api"

const MS_IN_TWO_DAYS = 1000 * 60 * 60 * 48

export function getUpcomingMeetings(clients: Client[] | undefined, limit = 4): Client[] {
  if (!clients?.length) return []

  const now = new Date()
  return clients
    .filter((client) => {
      if (!client.next_action_date) return false
      if (client.status === "Archive") return false
      return new Date(client.next_action_date).getTime() >= now.getTime()
    })
    .sort(
      (a, b) =>
        new Date(a.next_action_date as string).getTime() -
        new Date(b.next_action_date as string).getTime()
    )
    .slice(0, limit)
}

export function getUrgentTasks(tasks: Task[] | undefined, limit = 6): Task[] {
  if (!tasks?.length) return []

  const now = new Date()
  return tasks
    .filter((task) => {
      if (task.status === "Done") return false
      if (task.priority === "High") return true
      if (!task.due_date) return false
      const timeLeft = new Date(task.due_date).getTime() - now.getTime()
      return timeLeft <= MS_IN_TWO_DAYS
    })
    .sort((a, b) => {
      const rank = { High: 0, Medium: 1, Low: 2 }
      const priorityDiff = rank[a.priority] - rank[b.priority]
      if (priorityDiff !== 0) return priorityDiff

      const aDue = a.due_date ? new Date(a.due_date).getTime() : Number.MAX_SAFE_INTEGER
      const bDue = b.due_date ? new Date(b.due_date).getTime() : Number.MAX_SAFE_INTEGER
      return aDue - bDue
    })
    .slice(0, limit)
}

export function getTaskUrgencyLabel(task: Task): string {
  if (task.priority === "High") return "Haute"
  if (!task.due_date) return "Normale"

  const dueTime = new Date(task.due_date).getTime()
  const now = Date.now()
  if (dueTime < now) return "En retard"
  if (dueTime - now <= MS_IN_TWO_DAYS) return "Imminente"
  return "Normale"
}
