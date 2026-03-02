"use client"

import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { financesApi, type Finance } from "@/lib/api"
import { calculateFinanceTotals } from "@/lib/finance-service"
import { formatCurrency, formatDate } from "@/lib/utils"
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
import { DollarSign, Plus, Search, Trash2, Upload } from "lucide-react"

type FinanceFormData = {
  name: string
  type: Finance["type"]
  category: Finance["category"]
  amount: string
  currency: string
  billing_date: string
  renewal_date: string
  is_paid: boolean
  notes: string
}

const defaultFormData: FinanceFormData = {
  name: "",
  type: "Subscription",
  category: "Software",
  amount: "",
  currency: "EUR",
  billing_date: new Date().toISOString().split("T")[0],
  renewal_date: "",
  is_paid: true,
  notes: "",
}

export default function FinancesPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [filterType, setFilterType] = useState<"all" | "Subscription" | "One-off">("all")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [formData, setFormData] = useState<FinanceFormData>(defaultFormData)

  const queryClient = useQueryClient()

  const { data: finances, isLoading } = useQuery({
    queryKey: ["finances"],
    queryFn: () => financesApi.getAll(),
  })

  const createMutation = useMutation({
    mutationFn: (data: Partial<Finance>) => financesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finances"] })
      setIsDialogOpen(false)
      setFormData(defaultFormData)
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
      amount: Number.parseFloat(formData.amount),
      renewal_date: formData.renewal_date || undefined,
    })
  }

  const filteredFinances = finances?.filter((finance) => {
    const query = searchQuery.toLowerCase()
    const matchesSearch = finance.name.toLowerCase().includes(query)
    const matchesType = filterType === "all" || finance.type === filterType
    return matchesSearch && matchesType
  })

  const totals = calculateFinanceTotals(finances)

  if (isLoading) {
    return <div className="py-12 text-center">Chargement...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Finances</h1>
          <p className="text-muted-foreground">
            Suivi des depenses. Les abonnements sont comptes chaque mois comme depense recurrente.
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nouvelle depense
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Nouvelle depense</DialogTitle>
              <DialogDescription>Ajoutez un abonnement ou une depense ponctuelle.</DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nom *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, type: value as Finance["type"] }))
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
                  <Label htmlFor="category">Categorie</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, category: value as Finance["category"] }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Software">Software</SelectItem>
                      <SelectItem value="Hardware">Hardware</SelectItem>
                      <SelectItem value="Service">Service</SelectItem>
                      <SelectItem value="Office">Office</SelectItem>
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
                    min="0"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData((prev) => ({ ...prev, amount: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Devise</Label>
                  <Select
                    value={formData.currency}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, currency: value }))}
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
                  <Label htmlFor="billing_date">Date de facturation</Label>
                  <Input
                    id="billing_date"
                    type="date"
                    value={formData.billing_date}
                    onChange={(e) => setFormData((prev) => ({ ...prev, billing_date: e.target.value }))}
                  />
                </div>
                {formData.type === "Subscription" ? (
                  <div className="space-y-2">
                    <Label htmlFor="renewal_date">Date de renouvellement</Label>
                    <Input
                      id="renewal_date"
                      type="date"
                      value={formData.renewal_date}
                      onChange={(e) => setFormData((prev) => ({ ...prev, renewal_date: e.target.value }))}
                    />
                  </div>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                  rows={2}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Creation..." : "Creer"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Depenses recurrentes / mois</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totals.recurringMonthly)}</div>
            <p className="text-xs text-muted-foreground">Somme des abonnements actifs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ponctuel ce mois</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totals.oneOffThisMonth)}</div>
            <p className="text-xs text-muted-foreground">Depenses one-off du mois courant</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total depenses du mois</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totals.totalMonthlyExpenses)}</div>
            <p className="text-xs text-muted-foreground">Recurrent + ponctuel du mois</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ponctuel cumule</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totals.oneOffAllTime)}</div>
            <p className="text-xs text-muted-foreground">Historique one-off</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher une depense..."
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
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full min-w-[920px]">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="h-12 px-4 text-left text-sm font-medium">Nom</th>
                  <th className="h-12 px-4 text-left text-sm font-medium">Type</th>
                  <th className="h-12 px-4 text-left text-sm font-medium">Categorie</th>
                  <th className="h-12 px-4 text-left text-sm font-medium">Montant</th>
                  <th className="h-12 px-4 text-left text-sm font-medium">Facturation</th>
                  <th className="h-12 px-4 text-left text-sm font-medium">Renouvellement</th>
                  <th className="h-12 px-4 text-left text-sm font-medium">Statut</th>
                  <th className="h-12 px-4 text-left text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {!filteredFinances?.length ? (
                  <tr>
                    <td colSpan={8} className="h-24 text-center text-muted-foreground">
                      Aucune depense trouvee
                    </td>
                  </tr>
                ) : (
                  filteredFinances.map((finance) => (
                    <tr key={finance.id} className="border-b last:border-0 hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium">{finance.name}</td>
                      <td className="px-4 py-3">
                        <Badge variant={finance.type === "Subscription" ? "default" : "secondary"}>
                          {finance.type === "Subscription" ? "Abonnement" : "Ponctuel"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm">{finance.category}</td>
                      <td className="px-4 py-3 font-medium">
                        {formatCurrency(Number(finance.amount), finance.currency)}
                      </td>
                      <td className="px-4 py-3 text-sm">{formatDate(finance.billing_date)}</td>
                      <td className="px-4 py-3 text-sm">
                        {finance.renewal_date ? (
                          formatDate(finance.renewal_date)
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={finance.is_paid ? "success" : "warning"}>
                          {finance.is_paid ? "Paye" : "En attente"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {!finance.invoice_path ? (
                            <Button variant="ghost" size="icon">
                              <Upload className="h-4 w-4" />
                            </Button>
                          ) : null}
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

          <p className="mt-4 text-sm text-muted-foreground">
            {filteredFinances?.length || 0} depense(s) affichee(s)
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
