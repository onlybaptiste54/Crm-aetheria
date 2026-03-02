"use client"

import { useState } from "react"
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { tasksApi, type Task } from "@/lib/api"
import { cn, formatDate } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  Calendar,
  ChevronDown,
  Clock3,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react"

const columns = [
  { id: "Backlog", title: "Backlog", color: "bg-slate-100" },
  { id: "Todo", title: "A faire", color: "bg-blue-50" },
  { id: "In Progress", title: "En cours", color: "bg-amber-50" },
  { id: "Validation", title: "Validation", color: "bg-indigo-50" },
  { id: "Done", title: "Termine", color: "bg-emerald-50" },
] as const

const priorityColors = {
  Low: "secondary",
  Medium: "warning",
  High: "destructive",
} as const

const priorityBorders = {
  Low: "border-l-slate-300",
  Medium: "border-l-amber-400",
  High: "border-l-red-500",
} as const

type TaskFormData = {
  title: string
  description: string
  status: Task["status"]
  priority: Task["priority"]
  due_date: string
  estimated_hours: string
  actual_hours: string
  tags: string
}

const defaultFormData: TaskFormData = {
  title: "",
  description: "",
  status: "Backlog",
  priority: "Medium",
  due_date: "",
  estimated_hours: "",
  actual_hours: "",
  tags: "",
}

function parseOptionalNumber(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = Number.parseFloat(trimmed)
  return Number.isFinite(parsed) ? parsed : null
}

function TaskCard({
  task,
  isExpanded,
  onToggleExpand,
  onEdit,
  onDelete,
  isDragging = false,
}: {
  task: Task
  isExpanded: boolean
  onToggleExpand: (taskId: string) => void
  onEdit?: (task: Task) => void
  onDelete?: (id: string) => void
  isDragging?: boolean
}) {
  const dueDateText = task.due_date ? formatDate(task.due_date) : "Pas de date"
  const estimatedText =
    task.estimated_hours === null || task.estimated_hours === undefined
      ? "-"
      : `${Number(task.estimated_hours)} h`
  const actualText =
    task.actual_hours === null || task.actual_hours === undefined
      ? "-"
      : `${Number(task.actual_hours)} h`

  return (
    <Card
      className={cn(
        "border-l-4 transition-all",
        priorityBorders[task.priority],
        !isDragging && "cursor-grab active:cursor-grabbing hover:shadow-md"
      )}
      onClick={() => onToggleExpand(task.id)}
    >
      <CardContent className="space-y-3 p-3">
        <div className="flex items-start justify-between gap-2">
          <p className={cn("text-sm font-semibold", !isExpanded && "line-clamp-2")}>{task.title}</p>
          <div className="flex shrink-0 items-center gap-1">
            <Badge variant={priorityColors[task.priority]}>{task.priority}</Badge>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation()
                onToggleExpand(task.id)
              }}
              aria-label={isExpanded ? "Replier la tache" : "Developper la tache"}
            >
              <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
            </Button>
          </div>
        </div>

        {task.description ? (
          <p className={cn("text-xs text-muted-foreground", !isExpanded && "line-clamp-2")}>
            {task.description}
          </p>
        ) : null}

        {isExpanded ? (
          <div className="rounded-md border bg-slate-50 p-2">
            <div className="grid grid-cols-1 gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5" />
                <span>Echeance: {dueDateText}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock3 className="h-3.5 w-3.5" />
                <span>Estime: {estimatedText}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock3 className="h-3.5 w-3.5" />
                <span>Realise: {actualText}</span>
              </div>
            </div>
          </div>
        ) : null}

        {task.tags && task.tags.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {(isExpanded ? task.tags : task.tags.slice(0, 3)).map((tag) => (
              <Badge key={tag} variant="outline" className="text-[10px]">
                {tag}
              </Badge>
            ))}
          </div>
        ) : null}

        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-muted-foreground">{dueDateText}</span>
          {!isDragging && onEdit && onDelete ? (
            <div className="ml-auto flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit(task)
                }}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(task.id)
                }}
              >
                <Trash2 className="h-3.5 w-3.5 text-red-500" />
              </Button>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}

function SortableTask({
  task,
  isExpanded,
  onToggleExpand,
  onEdit,
  onDelete,
}: {
  task: Task
  isExpanded: boolean
  onToggleExpand: (taskId: string) => void
  onEdit: (task: Task) => void
  onDelete: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard
        task={task}
        isExpanded={isExpanded}
        onToggleExpand={onToggleExpand}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </div>
  )
}

function DroppableColumn({
  column,
  tasks,
  expandedTaskIds,
  onToggleExpand,
  onEdit,
  onDelete,
}: {
  column: (typeof columns)[number]
  tasks: Task[]
  expandedTaskIds: Record<string, boolean>
  onToggleExpand: (taskId: string) => void
  onEdit: (task: Task) => void
  onDelete: (id: string) => void
}) {
  const { setNodeRef } = useDroppable({
    id: column.id,
  })

  return (
    <div className="flex min-w-[240px] flex-col">
      <Card className={cn(column.color, "border-dashed")}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-sm">
            <span>{column.title}</span>
            <Badge variant="secondary">{tasks.length}</Badge>
          </CardTitle>
        </CardHeader>
      </Card>

      <div ref={setNodeRef}>
        <SortableContext items={tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
          <div className="mt-2 min-h-[420px] space-y-2 rounded-lg bg-slate-50/60 p-2">
            {tasks.map((task) => (
              <SortableTask
                key={task.id}
                task={task}
                isExpanded={Boolean(expandedTaskIds[task.id])}
                onToggleExpand={onToggleExpand}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </div>
        </SortableContext>
      </div>
    </div>
  )
}

export default function TasksPage() {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [expandedTaskIds, setExpandedTaskIds] = useState<Record<string, boolean>>({})
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [formData, setFormData] = useState<TaskFormData>(defaultFormData)

  const queryClient = useQueryClient()

  const { data: tasks, isLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => tasksApi.getAll(),
  })

  const createMutation = useMutation({
    mutationFn: (data: Partial<Task>) => tasksApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] })
      setIsDialogOpen(false)
      setFormData(defaultFormData)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Task> }) => tasksApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] })
      setIsDialogOpen(false)
      setEditingTask(null)
      setFormData(defaultFormData)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => tasksApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] })
    },
  })

  const toggleTaskExpansion = (taskId: string) => {
    setExpandedTaskIds((prev) => ({ ...prev, [taskId]: !prev[taskId] }))
  }

  const handleEdit = (task: Task) => {
    setEditingTask(task)
    setFormData({
      title: task.title,
      description: task.description || "",
      status: task.status,
      priority: task.priority,
      due_date: task.due_date ? String(task.due_date).slice(0, 10) : "",
      estimated_hours:
        task.estimated_hours === null || task.estimated_hours === undefined
          ? ""
          : String(task.estimated_hours),
      actual_hours:
        task.actual_hours === null || task.actual_hours === undefined
          ? ""
          : String(task.actual_hours),
      tags: task.tags?.join(", ") || "",
    })
    setIsDialogOpen(true)
  }

  const handleDelete = (id: string) => {
    if (confirm("Supprimer cette tache ?")) {
      deleteMutation.mutate(id)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const tags = formData.tags
      ? formData.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean)
      : []

    const payload: Partial<Task> = {
      title: formData.title.trim(),
      description: formData.description.trim() || undefined,
      status: formData.status,
      priority: formData.priority,
      due_date: formData.due_date ? `${formData.due_date}T09:00:00` : undefined,
      estimated_hours: parseOptionalNumber(formData.estimated_hours),
      actual_hours: parseOptionalNumber(formData.actual_hours),
      tags,
    }

    if (!payload.due_date && editingTask?.due_date) {
      payload.due_date = null
    }

    if (editingTask) {
      updateMutation.mutate({
        id: editingTask.id,
        data: payload,
      })
    } else {
      createMutation.mutate(payload)
    }
  }

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      setEditingTask(null)
      setFormData(defaultFormData)
    }
    setIsDialogOpen(open)
  }

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)
    if (!over) return

    const taskId = active.id as string
    const task = tasks?.find((item) => item.id === taskId)
    if (!task) return

    let nextStatus: Task["status"] | null = null
    const targetId = over.id as string

    if (columns.some((column) => column.id === targetId)) {
      nextStatus = targetId as Task["status"]
    } else {
      const targetTask = tasks?.find((item) => item.id === targetId)
      if (targetTask) {
        nextStatus = targetTask.status
      }
    }

    if (!nextStatus || nextStatus === task.status) return

    updateMutation.mutate({
      id: taskId,
      data: { status: nextStatus },
    })
  }

  const getTasksByColumn = (columnId: string) => tasks?.filter((task) => task.status === columnId) || []
  const activeTask = tasks?.find((task) => task.id === activeId)

  if (isLoading) {
    return <div className="py-12 text-center">Chargement...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Tasks - Kanban</h1>
          <p className="text-muted-foreground">
            Cliquez sur une carte pour la developper. Glissez-deposez pour changer de colonne.
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nouvelle tache
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingTask ? "Modifier la tache" : "Nouvelle tache"}</DialogTitle>
              <DialogDescription>
                Version simple type Trello: statut, priorite, echeance et suivi de temps.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Titre *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Statut</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, status: value as Task["status"] }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Backlog">Backlog</SelectItem>
                      <SelectItem value="Todo">A faire</SelectItem>
                      <SelectItem value="In Progress">En cours</SelectItem>
                      <SelectItem value="Validation">Validation</SelectItem>
                      <SelectItem value="Done">Termine</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority">Priorite</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, priority: value as Task["priority"] }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="due_date">Date d echeance</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData((prev) => ({ ...prev, due_date: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="estimated_hours">Temps estime (heures)</Label>
                  <Input
                    id="estimated_hours"
                    type="number"
                    min="0"
                    step="0.25"
                    value={formData.estimated_hours}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, estimated_hours: e.target.value }))
                    }
                    placeholder="ex: 3.5"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="actual_hours">Temps realise (heures)</Label>
                  <Input
                    id="actual_hours"
                    type="number"
                    min="0"
                    step="0.25"
                    value={formData.actual_hours}
                    onChange={(e) => setFormData((prev) => ({ ...prev, actual_hours: e.target.value }))}
                    placeholder="ex: 2.75"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tags">Tags (separes par des virgules)</Label>
                <Input
                  id="tags"
                  value={formData.tags}
                  onChange={(e) => setFormData((prev) => ({ ...prev, tags: e.target.value }))}
                  placeholder="urgent, design, bug"
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => handleDialogClose(false)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {createMutation.isPending || updateMutation.isPending
                    ? editingTask
                      ? "Modification..."
                      : "Creation..."
                    : editingTask
                      ? "Modifier"
                      : "Creer"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="overflow-x-auto pb-2">
          <div className="grid min-w-[1200px] grid-cols-5 gap-4">
            {columns.map((column) => (
              <DroppableColumn
                key={column.id}
                column={column}
                tasks={getTasksByColumn(column.id)}
                expandedTaskIds={expandedTaskIds}
                onToggleExpand={toggleTaskExpansion}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </div>

        <DragOverlay>
          {activeTask ? (
            <TaskCard
              task={activeTask}
              isExpanded={false}
              onToggleExpand={() => undefined}
              isDragging
            />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
