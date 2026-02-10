"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent, DragOverlay, DragStartEvent, useDroppable } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { tasksApi, type Task } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Pencil, Trash2 } from "lucide-react"

const columns = [
  { id: "Backlog", title: "Backlog", color: "bg-slate-100" },
  { id: "Todo", title: "À faire", color: "bg-blue-50" },
  { id: "In Progress", title: "En cours", color: "bg-yellow-50" },
  { id: "Validation", title: "Validation", color: "bg-purple-50" },
  { id: "Done", title: "Terminé", color: "bg-green-50" },
] as const

const priorityColors = {
  Low: "secondary",
  Medium: "warning",
  High: "destructive",
} as const

function TaskCard({
  task,
  onEdit,
  onDelete,
  isDragging = false
}: {
  task: Task
  onEdit?: (task: Task) => void
  onDelete?: (id: string) => void
  isDragging?: boolean
}) {
  return (
    <Card className={`${!isDragging ? "cursor-grab active:cursor-grabbing" : ""}`}>
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium line-clamp-2">
            {task.title}
          </p>
          <div className="flex items-center gap-1 shrink-0">
            <Badge
              variant={priorityColors[task.priority]}
              className="shrink-0"
            >
              {task.priority}
            </Badge>
          </div>
        </div>
        {task.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {task.description}
          </p>
        )}
        {task.tags && task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {task.tags.slice(0, 3).map((tag) => (
              <Badge
                key={tag}
                variant="outline"
                className="text-xs"
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between pt-1">
          {task.due_date && (
            <p className="text-xs text-muted-foreground">
              {new Date(task.due_date).toLocaleDateString()}
            </p>
          )}
          {!isDragging && onEdit && onDelete && (
            <div className="flex items-center gap-1 ml-auto">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit(task)
                }}
              >
                <Pencil className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(task.id)
                }}
              >
                <Trash2 className="h-3 w-3 text-red-500" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function SortableTask({
  task,
  onEdit,
  onDelete
}: {
  task: Task
  onEdit: (task: Task) => void
  onDelete: (id: string) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard task={task} onEdit={onEdit} onDelete={onDelete} />
    </div>
  )
}

function DroppableColumn({
  column,
  tasks,
  onEdit,
  onDelete
}: {
  column: typeof columns[number]
  tasks: Task[]
  onEdit: (task: Task) => void
  onDelete: (id: string) => void
}) {
  const { setNodeRef } = useDroppable({
    id: column.id,
  })

  const taskIds = tasks.map(t => t.id)

  return (
    <div className="flex flex-col">
      <Card className={column.color}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-sm">
            <span>{column.title}</span>
            <Badge variant="secondary">{tasks.length}</Badge>
          </CardTitle>
        </CardHeader>
      </Card>

      <div ref={setNodeRef}>
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          <div className="mt-2 space-y-2 min-h-[500px] rounded-lg p-2 bg-slate-50/50">
            {tasks.map((task) => (
              <SortableTask
                key={task.id}
                task={task}
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
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [formData, setFormData] = useState<{
    title: string
    description: string
    status: Task["status"]
    priority: Task["priority"]
    tags: string
  }>({
    title: "",
    description: "",
    status: "Backlog",
    priority: "Medium",
    tags: "",
  })
  const queryClient = useQueryClient()

  const { data: tasks, isLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => tasksApi.getAll(),
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => tasksApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] })
      setIsDialogOpen(false)
      setFormData({
        title: "",
        description: "",
        status: "Backlog",
        priority: "Medium",
        tags: "",
      })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Task> }) =>
      tasksApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] })
      setIsDialogOpen(false)
      setEditingTask(null)
      setFormData({
        title: "",
        description: "",
        status: "Backlog",
        priority: "Medium",
        tags: "",
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => tasksApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] })
    },
  })

  const handleEdit = (task: Task) => {
    setEditingTask(task)
    setFormData({
      title: task.title,
      description: task.description || "",
      status: task.status,
      priority: task.priority,
      tags: task.tags?.join(", ") || "",
    })
    setIsDialogOpen(true)
  }

  const handleDelete = (id: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer cette tâche ?")) {
      deleteMutation.mutate(id)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const tags = formData.tags ? formData.tags.split(",").map(t => t.trim()) : []

    if (editingTask) {
      updateMutation.mutate({
        id: editingTask.id,
        data: { ...formData, tags }
      })
    } else {
      createMutation.mutate({ ...formData, tags })
    }
  }

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      setEditingTask(null)
      setFormData({
        title: "",
        description: "",
        status: "Backlog",
        priority: "Medium",
        tags: "",
      })
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
    const task = tasks?.find(t => t.id === taskId)
    if (!task) return

    // Déterminer la colonne de destination
    let newStatus: Task["status"] | null = null

    // Si on drop sur une colonne directement
    const columnId = over.id as string
    if (columns.some(col => col.id === columnId)) {
      newStatus = columnId as Task["status"]
    } else {
      // Si on drop sur une tâche, trouver sa colonne
      const overTask = tasks?.find(t => t.id === over.id)
      if (overTask) {
        newStatus = overTask.status
      }
    }

    if (!newStatus || task.status === newStatus) return

    // Mettre à jour le statut
    updateMutation.mutate({
      id: taskId,
      data: { status: newStatus },
    })
  }

  const getTasksByColumn = (columnId: string) => {
    return tasks?.filter((task) => task.status === columnId) || []
  }

  const activeTask = tasks?.find(t => t.id === activeId)

  if (isLoading) {
    return <div className="text-center py-12">Chargement...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tasks - Kanban</h1>
          <p className="text-muted-foreground">
            Organisez vos tâches par glisser-déposer
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nouvelle Tâche
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingTask ? "Modifier la tâche" : "Nouvelle Tâche"}</DialogTitle>
              <DialogDescription>
                {editingTask ? "Modifiez les détails de la tâche" : "Créez une nouvelle tâche pour votre Kanban"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Titre *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Statut</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: any) =>
                      setFormData({ ...formData, status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Backlog">Backlog</SelectItem>
                      <SelectItem value="Todo">À faire</SelectItem>
                      <SelectItem value="In Progress">En cours</SelectItem>
                      <SelectItem value="Validation">Validation</SelectItem>
                      <SelectItem value="Done">Terminé</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="priority">Priorité</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value: any) =>
                      setFormData({ ...formData, priority: value })
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
                <Label htmlFor="tags">Tags (séparés par des virgules)</Label>
                <Input
                  id="tags"
                  value={formData.tags}
                  onChange={(e) =>
                    setFormData({ ...formData, tags: e.target.value })
                  }
                  placeholder="design, urgent, bug"
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleDialogClose(false)}
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {(createMutation.isPending || updateMutation.isPending)
                    ? (editingTask ? "Modification..." : "Création...")
                    : (editingTask ? "Modifier" : "Créer")}
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
        <div className="grid grid-cols-5 gap-4">
          {columns.map((column) => (
            <DroppableColumn
              key={column.id}
              column={column}
              tasks={getTasksByColumn(column.id)}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>

        <DragOverlay>
          {activeTask ? <TaskCard task={activeTask} isDragging /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
