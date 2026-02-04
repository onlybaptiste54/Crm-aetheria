"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { financesApi, type Finance } from "@/lib/api"
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
import { formatCurrency, formatDate } from "@/lib/utils"
import { Plus, Upload, Trash2, Search, DollarSign } from "lucide-react"

export default function FinancesPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [filterType, setFilterType] = useState<"all" | "Subscription" | "One-off">("all")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    type: "Subscription" as const,
    category: "Software",
    amount: "",
    currency: "EUR",
    billing_date: new Date().toISOString().split("T")[0],
    renewal_date: "",
    is_paid: true,
    notes: "",
  })
  const queryClient = useQueryClient()

  const { data: finances, isLoading } = useQuery({
    queryKey: ["finances"],
    queryFn: () => financesApi.getAll(),
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => financesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finances"] })
      setIsDialogOpen(false)
      setFormData({
        name: "",
        type: "Subscription",
        category: "Software",
        amount: "",
        currency: "EUR",
        billing_date: new Date().toISOString().split("T")[0],
        renewal_date: "",
        is_paid: true,
        notes: "",
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => financesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finances"] })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate({
      ...formData,
      amount: parseFloat(formData.amount),
    })
  }

  const filteredFinances = finances?.filter((finance) => {
    const query = searchQuery.toLowerCase()
    const matchesSearch = finance.name.toLowerCase().includes(query)
    const matchesType = filterType === "all" || finance.type === filterType
    return matchesSearch && matchesType
  })

  // Calculs
  const totalMRR = finances
    ?.filter((f) => f.type === "Subscription")
    .reduce((acc, f) => acc + Number(f.amount), 0) || 0

  const totalOneOff = finances
    ?.filter((f) => f.type === "One-off")
    .reduce((acc, f) => acc + Number(f.amount), 0) || 0

  if (isLoading) {
    return <div className="text-center py-12">Chargement...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Finances</h1>
          <p className="text-muted-foreground">
            Gérez vos dépenses et abonnements
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nouvelle Dépense
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Nouvelle Dépense</DialogTitle>
              <DialogDescription>
                Ajoutez un abonnement ou une dépense ponctuelle
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nom *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value: any) =>
                      setFormData({ ...formData, type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Subscription">Abonnement</SelectItem>
                      <SelectItem value="One-off">Ponctuel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Catégorie</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) =>
                      setFormData({ ...formData, category: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Software">Software</SelectItem>
                      <SelectItem value="Hardware">Hardware</SelectItem>
                      <SelectItem value="Service">Service</SelectItem>
                      <SelectItem value="Marketing">Marketing</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Montant *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) =>
                      setFormData({ ...formData, amount: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Devise</Label>
                  <Select
                    value={formData.currency}
                    onValueChange={(value) =>
                      setFormData({ ...formData, currency: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="billing_date">Date facturation</Label>
                  <Input
                    id="billing_date"
                    type="date"
                    value={formData.billing_date}
                    onChange={(e) =>
                      setFormData({ ...formData, billing_date: e.target.value })
                    }
                  />
                </div>
                {formData.type === "Subscription" && (
                  <div className="space-y-2">
                    <Label htmlFor="renewal_date">Date renouvellement</Label>
                    <Input
                      id="renewal_date"
                      type="date"
                      value={formData.renewal_date}
                      onChange={(e) =>
                        setFormData({ ...formData, renewal_date: e.target.value })
                      }
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  rows={2}
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

      {/* Stats rapides */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">MRR Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalMRR)}</div>
            <p className="text-xs text-muted-foreground">Abonnements mensuels</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dépenses Ponctuelles</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalOneOff)}</div>
            <p className="text-xs text-muted-foreground">Achats uniques</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Général</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalMRR + totalOneOff)}
            </div>
            <p className="text-xs text-muted-foreground">Toutes catégories</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher une dépense..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={filterType === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterType("all")}
              >
                Tout
              </Button>
              <Button
                variant={filterType === "Subscription" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterType("Subscription")}
              >
                Abonnements
              </Button>
              <Button
                variant={filterType === "One-off" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterType("One-off")}
              >
                Ponctuel
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="h-12 px-4 text-left text-sm font-medium">
                    Nom
                  </th>
                  <th className="h-12 px-4 text-left text-sm font-medium">
                    Type
                  </th>
                  <th className="h-12 px-4 text-left text-sm font-medium">
                    Catégorie
                  </th>
                  <th className="h-12 px-4 text-left text-sm font-medium">
                    Montant
                  </th>
                  <th className="h-12 px-4 text-left text-sm font-medium">
                    Date Facturation
                  </th>
                  <th className="h-12 px-4 text-left text-sm font-medium">
                    Renouvellement
                  </th>
                  <th className="h-12 px-4 text-left text-sm font-medium">
                    Statut
                  </th>
                  <th className="h-12 px-4 text-left text-sm font-medium">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {!filteredFinances?.length ? (
                  <tr>
                    <td colSpan={8} className="h-24 text-center">
                      <p className="text-muted-foreground">Aucune dépense trouvée</p>
                    </td>
                  </tr>
                ) : (
                  filteredFinances.map((finance) => (
                    <tr key={finance.id} className="border-b last:border-0 hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="font-medium">{finance.name}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            finance.type === "Subscription" ? "default" : "secondary"
                          }
                        >
                          {finance.type === "Subscription" ? "Abonnement" : "Ponctuel"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm">{finance.category}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium">
                          {formatCurrency(Number(finance.amount), finance.currency)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm">
                          {formatDate(finance.billing_date)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {finance.renewal_date ? (
                          <span className="text-sm">
                            {formatDate(finance.renewal_date)}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={finance.is_paid ? "success" : "warning"}>
                          {finance.is_paid ? "Payé" : "En attente"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {!finance.invoice_path && (
                            <Button variant="ghost" size="icon">
                              <Upload className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteMutation.mutate(finance.id)}
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
            {filteredFinances?.length || 0} dépense(s) affichée(s)
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
