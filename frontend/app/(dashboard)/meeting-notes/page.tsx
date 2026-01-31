"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { meetingNotesApi, clientsApi } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
import { formatDateTime } from "@/lib/utils"
import { Plus, Trash2, Search, FileText } from "lucide-react"

export default function MeetingNotesPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    client_id: "",
    meeting_date: new Date().toISOString().split("T")[0],
  })
  const queryClient = useQueryClient()

  const { data: notes, isLoading } = useQuery({
    queryKey: ["meeting-notes"],
    queryFn: () => meetingNotesApi.getAll(),
  })

  const { data: clients } = useQuery({
    queryKey: ["clients"],
    queryFn: () => clientsApi.getAll(),
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => meetingNotesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meeting-notes"] })
      setIsDialogOpen(false)
      setFormData({
        title: "",
        content: "",
        client_id: "",
        meeting_date: new Date().toISOString().split("T")[0],
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => meetingNotesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meeting-notes"] })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate(formData)
  }

  const getClientName = (clientId: string) => {
    return clients?.find((c) => c.id === clientId)?.company_name || "Client inconnu"
  }

  const filteredNotes = notes?.filter((note) => {
    const query = searchQuery.toLowerCase()
    return (
      note.title.toLowerCase().includes(query) ||
      note.content?.toLowerCase().includes(query)
    )
  })

  if (isLoading) {
    return <div className="text-center py-12">Chargement...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Comptes-Rendus</h1>
          <p className="text-muted-foreground">
            Notes de réunions et entretiens clients
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nouveau CR
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Nouvelle Note de Réunion</DialogTitle>
              <DialogDescription>
                Enregistrez un compte-rendu de réunion avec un client
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="client_id">Client</Label>
                  <Select
                    value={formData.client_id}
                    onValueChange={(value) =>
                      setFormData({ ...formData, client_id: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients?.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.company_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="meeting_date">Date de réunion</Label>
                  <Input
                    id="meeting_date"
                    type="date"
                    value={formData.meeting_date}
                    onChange={(e) =>
                      setFormData({ ...formData, meeting_date: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Contenu</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) =>
                    setFormData({ ...formData, content: e.target.value })
                  }
                  rows={6}
                  placeholder="Notes de la réunion..."
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
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

      <Card>
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher dans les comptes-rendus..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
        </CardHeader>
        <CardContent>
          {!filteredNotes?.length ? (
            <p className="text-center py-12 text-muted-foreground">
              Aucun compte-rendu trouvé
            </p>
          ) : (
            <div className="space-y-4">
              {filteredNotes.map((note) => (
                <Card key={note.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <h3 className="font-semibold">{note.title}</h3>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">
                            {getClientName(note.client_id)}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {formatDateTime(note.date)}
                          </span>
                        </div>
                        {note.content && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {note.content}
                          </p>
                        )}
                        {note.attachments && note.attachments.length > 0 && (
                          <div className="flex gap-2">
                            <Badge variant="outline">
                              {note.attachments.length} pièce(s) jointe(s)
                            </Badge>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">
                          Voir
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteMutation.mutate(note.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          <div className="mt-4 text-sm text-muted-foreground">
            {filteredNotes?.length || 0} compte(s)-rendu(s) affiché(s)
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
