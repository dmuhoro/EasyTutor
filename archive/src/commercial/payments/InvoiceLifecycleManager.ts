/**
 * INVOICE LIFECYCLE MANAGER
 *
 * Manages complete invoice lifecycle:
 * - Creation and issuance
 * - Payment tracking
 * - Overdue management
 * - Reminders and escalation
 */

import { Invoice, InvoiceItem } from './paymentContracts';

export interface InvoiceReminder {
  reminder_id: string;
  invoice_id: string;
  reminder_type: 'payment_due' | 'overdue_1' | 'overdue_7' | 'overdue_30';
  sent_at: string;
  channel: 'email' | 'sms' | 'in_app';
}

export class InvoiceLifecycleManager {
  private invoices: Map<string, Invoice> = new Map();
  private reminders: Map<string, InvoiceReminder[]> = new Map();
  private paymentHistory: Map<string, Array<{ date: string; amount: number }>> = new Map();

  async createInvoice(
    tenant_id: string,
    items: InvoiceItem[],
    currency: string,
    dueDate: string,
    paymentTerms: string
  ): Promise<Invoice> {
    const total = items.reduce((sum, item) => sum + item.line_total, 0);

    const invoice: Invoice = {
      invoice_id: `INV-${Date.now()}`,
      tenant_id,
      amount: total,
      currency: currency as any,
      issued_date: new Date().toISOString(),
      due_date: dueDate,
      items,
      status: 'draft',
      payment_terms: paymentTerms as any,
    };

    this.invoices.set(invoice.invoice_id, invoice);
    this.paymentHistory.set(invoice.invoice_id, []);
    this.reminders.set(invoice.invoice_id, []);

    return invoice;
  }

  async sendInvoice(invoice_id: string): Promise<Invoice> {
    const invoice = this.invoices.get(invoice_id);
    if (!invoice) throw new Error(`Invoice ${invoice_id} not found`);

    invoice.status = 'sent';

    // Schedule payment reminder
    this.scheduleReminder(invoice_id, 'payment_due', invoice.due_date);

    return invoice;
  }

  async recordPayment(invoice_id: string, amount: number): Promise<Invoice> {
    const invoice = this.invoices.get(invoice_id);
    if (!invoice) throw new Error(`Invoice ${invoice_id} not found`);

    const history = this.paymentHistory.get(invoice_id) || [];
    history.push({ date: new Date().toISOString(), amount });
    this.paymentHistory.set(invoice_id, history);

    const totalPaid = history.reduce((sum, p) => sum + p.amount, 0);

    if (totalPaid >= invoice.amount) {
      invoice.status = 'paid';
    } else if (new Date(invoice.due_date) < new Date()) {
      invoice.status = 'overdue';
    }

    return invoice;
  }

  async markOverdue(invoice_id: string): Promise<Invoice> {
    const invoice = this.invoices.get(invoice_id);
    if (!invoice) throw new Error(`Invoice ${invoice_id} not found`);

    const history = this.paymentHistory.get(invoice_id) || [];
    const totalPaid = history.reduce((sum, p) => sum + p.amount, 0);

    if (totalPaid < invoice.amount) {
      invoice.status = 'overdue';

      // Schedule escalation reminders
      this.scheduleReminder(invoice_id, 'overdue_1', new Date().toISOString());
      this.scheduleReminder(invoice_id, 'overdue_7', new Date(Date.now() + 7 * 24 * 3600000).toISOString());
      this.scheduleReminder(invoice_id, 'overdue_30', new Date(Date.now() + 30 * 24 * 3600000).toISOString());
    }

    return invoice;
  }

  async cancelInvoice(invoice_id: string, reason?: string): Promise<Invoice> {
    const invoice = this.invoices.get(invoice_id);
    if (!invoice) throw new Error(`Invoice ${invoice_id} not found`);

    invoice.status = 'cancelled';
    return invoice;
  }

  private scheduleReminder(invoice_id: string, type: string, date: string): void {
    const reminder: InvoiceReminder = {
      reminder_id: `REM-${Date.now()}`,
      invoice_id,
      reminder_type: type as any,
      sent_at: date,
      channel: 'email',
    };

    const reminders = this.reminders.get(invoice_id) || [];
    reminders.push(reminder);
    this.reminders.set(invoice_id, reminders);
  }

  getInvoice(invoice_id: string): Invoice | undefined {
    return this.invoices.get(invoice_id);
  }

  getPaymentHistory(invoice_id: string): Array<{ date: string; amount: number }> {
    return this.paymentHistory.get(invoice_id) || [];
  }

  getTenantInvoices(tenant_id: string): Invoice[] {
    return Array.from(this.invoices.values()).filter(inv => inv.tenant_id === tenant_id);
  }

  getReminders(invoice_id: string): InvoiceReminder[] {
    return this.reminders.get(invoice_id) || [];
  }
}
