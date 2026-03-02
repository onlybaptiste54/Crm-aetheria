import type { Finance } from "@/lib/api"

export interface FinanceTotals {
  recurringMonthly: number
  oneOffThisMonth: number
  totalMonthlyExpenses: number
  oneOffAllTime: number
}

export function calculateFinanceTotals(
  finances: Finance[] | undefined,
  referenceDate = new Date()
): FinanceTotals {
  if (!finances?.length) {
    return {
      recurringMonthly: 0,
      oneOffThisMonth: 0,
      totalMonthlyExpenses: 0,
      oneOffAllTime: 0,
    }
  }

  const recurringMonthly = finances
    .filter((item) => item.type === "Subscription")
    .reduce((sum, item) => sum + Number(item.amount), 0)

  const oneOffThisMonth = finances
    .filter((item) => {
      if (item.type !== "One-off") return false
      const date = new Date(item.billing_date)
      return (
        date.getMonth() === referenceDate.getMonth() &&
        date.getFullYear() === referenceDate.getFullYear()
      )
    })
    .reduce((sum, item) => sum + Number(item.amount), 0)

  const oneOffAllTime = finances
    .filter((item) => item.type === "One-off")
    .reduce((sum, item) => sum + Number(item.amount), 0)

  return {
    recurringMonthly,
    oneOffThisMonth,
    totalMonthlyExpenses: recurringMonthly + oneOffThisMonth,
    oneOffAllTime,
  }
}
