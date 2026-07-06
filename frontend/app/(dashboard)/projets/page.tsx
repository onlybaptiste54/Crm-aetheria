"use client"

import { useRef, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  clientsApi,
  documentsApi,
  projectsApi,
  type Document as ProjectDocument,
  type Project,
} from "@/lib/api"
import { formatDate } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
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
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet"
import { Plus, FolderOpen, FileText, Download, Trash2, Upload, Building2 } from "lucide-react"

const statusVariants = {
  Active: "default",
  "On Hold": "warning",
  Done: "success",
  Archived: "outline",
} as const

function formatBytes(bytes?: number | null): string {
  if (!bytes) return "—"
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

function ProjectDocuments({ project }: { project: Project }) {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: documents, isLoading } = useQuery({
    queryKey: ["documents", project.id],
    queryFn: () => documentsApi.listByProject(project.id),
  })

  const uploadMutation = useMutation({
    mutationFn: (file: File) => documentsApi.upload(project.id, file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["documents", project.id] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => documentsApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["documents", project.id] }),
  })

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) uploadMutation.mutate(file)
    e.target.value = ""
  }

  const handleDownload = async (doc: ProjectDocument) => {
    try {
      await documentsApi.download(doc)
    } catch {
      alert("Téléchargement impossible.")
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <SheetTitle className="truncate">{project.name}</SheetTitle>
            <SheetDescription>
              <Badge variant={statusVariants[project.status]} className="mt-1">
                {project.status}
              </Badge>
            </SheetDescription>
          </div>
          <Button
            size="sm"
            className="mr-7 shrink-0"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadMutation.isPending}
          >
            <Upload className="mr-1.5 h-3.5 w-3.5" />
            {uploadMutation.isPending ? "Envoi..." : "Ajouter"}
          </Button>
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleFile} />
        </div>
        {project.description ? (
          <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">
            {project.description}
          </p>
        ) : null}
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Chargement...</p>
        ) : !documents?.length ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="mb-2 h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">Aucun document dans ce projet.</p>
            <p className="text-xs text-muted-foreground">
              Cliquez sur « Ajouter » pour déposer un fichier.
            </p>
          </div>
        ) : (
          <div className="flex flex-col">
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-center gap-3 border-t py-2.5 first:border-t-0">
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{doc.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatBytes(doc.file_size)} · {formatDate(doc.created_at)}
                  </p>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDownload(doc)}>
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    if (confirm("Supprimer ce document ?")) deleteMutation.mutate(doc.id)
                  }}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const defaultForm = {
  name: "",
  client_id: "",
  status: "Active" as Project["status"],
  description: "",
}

export default function ProjetsPage() {
  const queryClient = useQueryClient()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [formData, setFormData] = useState(defaultForm)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)

  const { data: projects, isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: () => projectsApi.getAll(),
  })

  const { data: clients } = useQuery({
    queryKey: ["clients"],
    queryFn: () => clientsApi.getAll(),
  })

  const createMutation = useMutation({
    mutationFn: (data: Partial<Project>) => projectsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] })
      setIsDialogOpen(false)
      setFormData(defaultForm)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => projectsApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projects"] }),
  })

  const clientName = (id: string) =>
    clients?.find((c) => c.id === id)?.company_name ?? "Client inconnu"

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.client_id) {
      alert("Veuillez sélectionner un client.")
      return
    }
    createMutation.mutate(formData)
  }

  // Group projects by client
  const grouped = (projects ?? []).reduce<Record<string, Project[]>>((acc, project) => {
    const list = acc[project.client_id] ?? []
    list.push(project)
    acc[project.client_id] = list
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projets</h1>
          <p className="text-sm text-muted-foreground">
            Rangez vos documents par projet client.
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nouveau projet
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nouveau projet</DialogTitle>
              <DialogDescription>Créez un projet rattaché à un client.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nom du projet *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Site vitrine v1"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="client">Client *</Label>
                  <Select
                    value={formData.client_id}
                    onValueChange={(value) => setFormData((p) => ({ ...p, client_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      {(clients ?? []).map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.company_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Statut</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) =>
                      setFormData((p) => ({ ...p, status: value as Project["status"] }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Actif</SelectItem>
                      <SelectItem value="On Hold">En pause</SelectItem>
                      <SelectItem value="Done">Terminé</SelectItem>
                      <SelectItem value="Archived">Archivé</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                  rows={2}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Création..." : "Créer"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="py-12 text-center text-sm text-muted-foreground">Chargement...</p>
      ) : !projects?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FolderOpen className="mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm font-medium">Aucun projet pour l&apos;instant</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Créez un projet pour commencer à y ranger des documents.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([clientId, clientProjects]) => (
            <div key={clientId} className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Building2 className="h-4 w-4" />
                {clientName(clientId)}
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {clientProjects.map((project) => (
                  <Card
                    key={project.id}
                    className="cursor-pointer transition-shadow hover:shadow-md"
                    onClick={() => setSelectedProject(project)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <FolderOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span className="truncate text-sm font-medium">{project.name}</span>
                        </div>
                        <Badge variant={statusVariants[project.status]}>{project.status}</Badge>
                      </div>
                      {project.description ? (
                        <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                          {project.description}
                        </p>
                      ) : null}
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          Créé le {formatDate(project.created_at)}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation()
                            if (confirm("Supprimer ce projet et ses documents ?")) {
                              deleteMutation.mutate(project.id)
                            }
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Sheet
        open={Boolean(selectedProject)}
        onOpenChange={(open) => {
          if (!open) setSelectedProject(null)
        }}
      >
        <SheetContent className="p-0">
          {selectedProject ? <ProjectDocuments project={selectedProject} /> : null}
        </SheetContent>
      </Sheet>
    </div>
  )
}
