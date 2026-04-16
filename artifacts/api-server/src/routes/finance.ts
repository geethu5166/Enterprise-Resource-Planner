import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, transactionsTable, invoicesTable, projectsTable } from "@workspace/db";
import {
  CreateTransactionBody,
  CreateInvoiceBody,
  ListTransactionsQueryParams,
  ListInvoicesQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/finance/transactions", async (req, res): Promise<void> => {
  const query = ListTransactionsQueryParams.safeParse(req.query);
  const txns = await db.select().from(transactionsTable).orderBy(transactionsTable.createdAt);
  let filtered = txns;
  if (query.success && query.data.type) {
    filtered = txns.filter(t => t.type === query.data.type);
  }
  const projects = await db.select().from(projectsTable);
  const mapped = filtered.map(t => {
    const proj = projects.find(p => p.id === t.projectId);
    return { ...t, amount: Number(t.amount), gstAmount: Number(t.gstAmount), projectName: proj?.name };
  });
  res.json(mapped);
});

router.post("/finance/transactions", async (req, res): Promise<void> => {
  const parsed = CreateTransactionBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [txn] = await db.insert(transactionsTable).values({
    ...parsed.data,
    amount: String(parsed.data.amount),
    gstAmount: String(parsed.data.gstAmount ?? 0),
  }).returning();
  res.status(201).json({ ...txn, amount: Number(txn.amount), gstAmount: Number(txn.gstAmount) });
});

router.get("/finance/summary", async (_req, res): Promise<void> => {
  const txns = await db.select().from(transactionsTable);
  const invoices = await db.select().from(invoicesTable);
  const totalIncome = txns.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const totalExpense = txns.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
  const gstCollected = txns.filter(t => t.type === "income").reduce((s, t) => s + Number(t.gstAmount), 0);
  const gstPaid = txns.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.gstAmount), 0);
  const pendingReceivables = invoices.filter(i => i.status === "sent" || i.status === "overdue").reduce((s, i) => s + Number(i.totalAmount), 0);
  const pendingPayables = invoices.filter(i => i.status === "draft").reduce((s, i) => s + Number(i.totalAmount), 0);
  res.json({
    totalIncome,
    totalExpense,
    netProfit: totalIncome - totalExpense,
    pendingReceivables,
    pendingPayables,
    gstCollected,
    gstPaid,
  });
});

router.get("/finance/monthly-cashflow", async (_req, res): Promise<void> => {
  const txns = await db.select().from(transactionsTable);
  const months: Record<string, { income: number; expense: number }> = {};
  for (const t of txns) {
    const month = t.date.slice(0, 7);
    if (!months[month]) months[month] = { income: 0, expense: 0 };
    if (t.type === "income") months[month].income += Number(t.amount);
    else months[month].expense += Number(t.amount);
  }
  const result = Object.entries(months)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([month, data]) => ({ month, ...data }));
  res.json(result);
});

router.get("/finance/invoices", async (req, res): Promise<void> => {
  const query = ListInvoicesQueryParams.safeParse(req.query);
  const invoices = await db.select().from(invoicesTable).orderBy(invoicesTable.createdAt);
  const projects = await db.select().from(projectsTable);
  let filtered = invoices;
  if (query.success && query.data.status) {
    filtered = invoices.filter(i => i.status === query.data.status);
  }
  const mapped = filtered.map(i => {
    const proj = projects.find(p => p.id === i.projectId);
    return { ...i, amount: Number(i.amount), gstAmount: Number(i.gstAmount), totalAmount: Number(i.totalAmount), projectName: proj?.name };
  });
  res.json(mapped);
});

router.post("/finance/invoices", async (req, res): Promise<void> => {
  const parsed = CreateInvoiceBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const count = await db.select().from(invoicesTable);
  const invoiceNumber = `INV-${new Date().getFullYear()}-${String(count.length + 1).padStart(4, "0")}`;
  const totalAmount = Number(parsed.data.amount) + Number(parsed.data.gstAmount);
  const [invoice] = await db.insert(invoicesTable).values({
    ...parsed.data,
    invoiceNumber,
    amount: String(parsed.data.amount),
    gstAmount: String(parsed.data.gstAmount),
    totalAmount: String(totalAmount),
  }).returning();
  res.status(201).json({ ...invoice, amount: Number(invoice.amount), gstAmount: Number(invoice.gstAmount), totalAmount: Number(invoice.totalAmount) });
});

export default router;
