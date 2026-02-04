"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { clientsApi, type Client } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { formatDate } from "@/lib/utils"
import { Plus, Pencil, Trash2, Search } from "lucide-react"

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

export default function ClientsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    company_name: "",
    contact_person: "",
    email: "",
    phone: "",
    sector: "",
    status: "Prospect" as const,
    pipeline_stage: "New" as const,
    priority: "Medium" as const,
    company_size: "TPE" as const,
    notes: "",
  })
  const queryClient = useQueryClient()

  const { data: allClients, isLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: () => clientsApi.getAll(),
  })

  // Filtrer uniquement les PROSPECTS
  const clients = allClients?.filter((c) => c.status === "Prospect") || []

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => clientsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] })
      setIsDialogOpen(false)
      setFormData({
        company_name: "",
        contact_person: "",
        email: "",
        phone: "",
        sector: "",
        status: "Prospect",
        pipeline_stage: "New",
        priority: "Medium",
        company_size: "TPE",
        notes: "",
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => clientsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate(formData)
  }

  const filteredClients = clients?.filter((client) => {
    const query = searchQuery.toLowerCase()
    return (
      client.company_name.toLowerCase().includes(query) ||
      client.contact_person?.toLowerCase().includes(query) ||
      client.email?.toLowerCase().includes(query)
    )
  })

  if (isLoading) {
    return <div className="text-center py-12">Chargement...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Prospection</h1>
          <p className="text-muted-foreground">
            Gérez vos prospects et leads
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nouveau Client
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nouveau Client</DialogTitle>
              <DialogDescription>
                Ajoutez un nouveau client ou prospect à votre CRM
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company_name">Nom de l'entreprise *</Label>
                  <Input
                    id="company_name"
                    value={formData.company_name}
                    onChange={(e) =>
                      setFormData({ ...formData, company_name: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact_person">Personne de contact</Label>
                  <Input
                    id="contact_person"
                    value={formData.contact_person}
                    onChange={(e) =>
                      setFormData({ ...formData, contact_person: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Téléphone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sector">Secteur</Label>
                  <Input
                    id="sector"
                    value={formData.sector}
                    onChange={(e) =>
                      setFormData({ ...formData, sector: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company_size">Taille entreprise</Label>
                  <Select
                    value={formData.company_size}
                    onValueChange={(value: any) =>
                      setFormData({ ...formData, company_size: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TPE">TPE (1-10)</SelectItem>
                      <SelectItem value="PME">PME (11-250)</SelectItem>
                      <SelectItem value="ETI">ETI (251-5000)</SelectItem>
                      <SelectItem value="GE">GE (5000+)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
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
                      <SelectItem value="Prospect">Prospect</SelectItem>
                      <SelectItem value="Client">Client</SelectItem>
                      <SelectItem value="Archive">Archive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pipeline_stage">Pipeline</Label>
                  <Select
                    value={formData.pipeline_stage}
                    onValueChange={(value: any) =>
                      setFormData({ ...formData, pipeline_stage: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="New">New</SelectItem>
                      <SelectItem value="Contacted">Contacted</SelectItem>
                      <SelectItem value="Meeting Booked">Meeting Booked</SelectItem>
                      <SelectItem value="Dev">Dev</SelectItem>
                      <SelectItem value="Signed">Signed</SelectItem>
                      <SelectItem value="Delivered">Delivered</SelectItem>
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
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  rows={3}
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
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom, contact, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="h-12 px-4 text-left text-sm font-medium">
                    Entreprise
                  </th>
                  <th className="h-12 px-4 text-left text-sm font-medium">
                    Contact
                  </th>
                  <th className="h-12 px-4 text-left text-sm font-medium">
                    Statut
                  </th>
                  <th className="h-12 px-4 text-left text-sm font-medium">
                    Pipeline
                  </th>
                  <th className="h-12 px-4 text-left text-sm font-medium">
                    Priorité
                  </th>
                  <th className="h-12 px-4 text-left text-sm font-medium">
                    Prochaine Action
                  </th>
                  <th className="h-12 px-4 text-left text-sm font-medium">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {!filteredClients?.length ? (
                  <tr>
                    <td colSpan={7} className="h-24 text-center">
                      <p className="text-muted-foreground">Aucun prospect trouvé</p>
                    </td>
                  </tr>
                ) : (
                  filteredClients.map((client) => (
                    <tr key={client.id} className="border-b last:border-0 hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium">{client.company_name}</p>
                          {client.sector && (
                            <p className="text-xs text-muted-foreground">{client.sector}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          {client.contact_person && (
                            <p className="text-sm">{client.contact_person}</p>
                          )}
                          {client.email && (
                            <p className="text-xs text-muted-foreground">{client.email}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={statusColors[client.status]}>
                          {client.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm">{client.pipeline_stage}</span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={priorityColors[client.priority]}>
                          {client.priority}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {client.next_action_date ? (
                          <span className="text-sm">
                            {formatDate(client.next_action_date)}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="icon">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteMutation.mutate(client.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-4 text-sm text-muted-foreground">
            {filteredClients?.length || 0} prospect(s) affiché(s)
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
