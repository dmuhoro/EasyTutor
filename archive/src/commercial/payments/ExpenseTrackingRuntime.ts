/**
 * EXPENSE TRACKING RUNTIME
 *
 * Tracks and categorizes business expenses:
 * - Expense submission and approval
 * - Receipt management
 * - Category classification
 * - Budget tracking
 */

import { Expense } from './paymentContracts';

export interface ExpenseCategory {
  category_id: string;
  name: string;
  monthly_budget: number;
  requires_receipt: boolean;
}

export interface ExpenseReport {
  report_id: string;
  tenant_id: string;
  period_month: string;
  total_expenses: number;
  by_category: Record<string, number>;
  approval_status: 'draft' | 'submitted' | 'approved' | 'rejected';
}

export class ExpenseTrackingRuntime {
  private expenses: Map<string, Expense> = new Map();
  private categories: Map<string, ExpenseCategory> = new Map();
  private budgetAllocation: Map<string, Record<string, number>> = new Map(); // tenant -> category -> amount
  private reports: Map<string, ExpenseReport> = new Map();

  registerCategory(category: ExpenseCategory): void {
    this.categories.set(category.category_id, category);
  }

  async submitExpense(
    tenant_id: string,
    category: string,
    amount: number,
    currency: string,
    description: string,
    receiptUrl?: string
  ): Promise<Expense> {
    const expense: Expense = {
      expense_id: `EXP-${Date.now()}`,
      tenant_id,
      category,
      amount,
      currency: currency as any,
      date: new Date().toISOString(),
      description,
      receipt_url: receiptUrl,
      status: 'submitted',
    };

    this.expenses.set(expense.expense_id, expense);
    return expense;
  }

  async approveExpense(expense_id: string): Promise<Expense> {
    const expense = this.expenses.get(expense_id);
    if (!expense) throw new Error(`Expense ${expense_id} not found`);

    // Check budget
    const categoryConfig = this.categories.get(expense.category);
    if (categoryConfig?.requires_receipt && !expense.receipt_url) {
      throw new Error('Receipt required for this expense category');
    }

    expense.status = 'approved';
    return expense;
  }

  async rejectExpense(expense_id: string): Promise<Expense> {
    const expense = this.expenses.get(expense_id);
    if (!expense) throw new Error(`Expense ${expense_id} not found`);

    expense.status = 'rejected';
    return expense;
  }

  async generateReport(tenant_id: string, month: string): Promise<ExpenseReport> {
    const report: ExpenseReport = {
      report_id: `REPORT-${Date.now()}`,
      tenant_id,
      period_month: month,
      total_expenses: 0,
      by_category: {},
      approval_status: 'draft',
    };

    // Aggregate expenses for the month
    const monthExpenses = Array.from(this.expenses.values()).filter(
      e =>
        e.tenant_id === tenant_id &&
        e.status === 'approved' &&
        e.date.startsWith(month)
    );

    report.total_expenses = monthExpenses.reduce((sum, e) => sum + e.amount, 0);

    for (const expense of monthExpenses) {
      if (!report.by_category[expense.category]) {
        report.by_category[expense.category] = 0;
      }
      report.by_category[expense.category] += expense.amount;
    }

    this.reports.set(report.report_id, report);
    return report;
  }

  setBudget(tenant_id: string, category_id: string, amount: number): void {
    if (!this.budgetAllocation.has(tenant_id)) {
      this.budgetAllocation.set(tenant_id, {});
    }

    this.budgetAllocation.get(tenant_id)![category_id] = amount;
  }

  getBudgetStatus(tenant_id: string, category_id: string): { allocated: number; spent: number; remaining: number } {
    const allocated = this.budgetAllocation.get(tenant_id)?.[category_id] ?? 0;

    const spent = Array.from(this.expenses.values())
      .filter(
        e =>
          e.tenant_id === tenant_id &&
          e.category === category_id &&
          e.status === 'approved'
      )
      .reduce((sum, e) => sum + e.amount, 0);

    return {
      allocated,
      spent,
      remaining: allocated - spent,
    };
  }

  getExpense(expense_id: string): Expense | undefined {
    return this.expenses.get(expense_id);
  }

  getTenantExpenses(tenant_id: string): Expense[] {
    return Array.from(this.expenses.values()).filter(e => e.tenant_id === tenant_id);
  }
}
