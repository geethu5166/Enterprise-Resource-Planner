import { useState } from "react";
import { useGetFinanceSummary, useGetMonthlyCashflow, useListTransactions, useListInvoices, useCreateTransaction } from "@workspace/api-client-react";
import { formatINR, getStatusColor, formatDate } from "@/lib/utils/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp, TrendingDown, IndianRupee, Receipt, PlusCircle } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { getListTransactionsQueryKey, getGetFinanceSummaryQueryKey } from "@workspace/api-client-react";

export default function Finance() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: summary } = useGetFinanceSummary();
  const { data: cashflow = [] } = useGetMonthlyCashflow();
  const { data: transactions = [] } = useListTransactions();
  const { data: invoices = [] } = useListInvoices();
  const createTransaction = useCreateTransaction();
  const { register, handleSubmit, control, reset } = useForm<{
    type: "income" | "expense"; category: string; amount: number;
    gstAmount: number; description: string; date: string; paymentMode: string;
  }>();

  const onSubmit = async (data: Parameters<typeof createTransaction.mutateAsync>[0]) => {
    await createTransaction.mutateAsync({ ...data, amount: Number(data.amount), gstAmount: Number(data.gstAmount ?? 0) });
    queryClient.invalidateQueries({ queryKey: getListTransactionsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetFinanceSummaryQueryKey() });
    reset();
    setOpen(false);
  };

  const chartData = cashflow.map(c => ({
    month: c.month.slice(5),
    Income: c.income,
    Expense: c.expense,
  }));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Finance & Accounts</h1>
          <p className="text-muted-foreground text-sm mt-1">GST-compliant financial management</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><PlusCircle className="h-4 w-4" />Add Transaction</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Transaction</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit(onSubmit as never)} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <Controller name="type" control={control} rules={{ required: true }} render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="income">Income</SelectItem>
                        <SelectItem value="expense">Expense</SelectItem>
                      </SelectContent>
                    </Select>
                  )} />
                </div>
                <div className="space-y-1.5"><Label>Category</Label><Input {...register("category", { required: true })} placeholder="e.g. Project Revenue" /></div>
                <div className="space-y-1.5"><Label>Amount (INR)</Label><Input type="number" {...register("amount", { required: true })} /></div>
                <div className="space-y-1.5"><Label>GST Amount</Label><Input type="number" {...register("gstAmount")} placeholder="0" /></div>
                <div className="space-y-1.5"><Label>Date</Label><Input type="date" {...register("date", { required: true })} /></div>
                <div className="space-y-1.5"><Label>Payment Mode</Label><Input {...register("paymentMode")} placeholder="RTGS / NEFT / Cash" /></div>
              </div>
              <div className="space-y-1.5"><Label>Description</Label><Input {...register("description", { required: true })} /></div>
              <Button type="submit" className="w-full" disabled={createTransaction.isPending}>
                {createTransaction.isPending ? "Saving..." : "Save Transaction"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-4"><div className="flex items-center gap-3"><TrendingUp className="h-8 w-8 text-green-500" /><div><div className="text-xl font-bold text-green-600">{formatINR(summary.totalIncome)}</div><div className="text-xs text-muted-foreground">Total Income</div></div></div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="flex items-center gap-3"><TrendingDown className="h-8 w-8 text-red-500" /><div><div className="text-xl font-bold text-red-600">{formatINR(summary.totalExpense)}</div><div className="text-xs text-muted-foreground">Total Expense</div></div></div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="flex items-center gap-3"><IndianRupee className="h-8 w-8 text-primary" /><div><div className="text-xl font-bold">{formatINR(summary.netProfit)}</div><div className="text-xs text-muted-foreground">Net Profit</div></div></div></CardContent></Card>
          <Card><CardContent className="pt-4"><div><div className="text-xs text-muted-foreground mb-1">GST Balance</div><div className="text-xl font-bold">{formatINR(summary.gstCollected - summary.gstPaid)}</div><div className="text-xs text-muted-foreground">Collected: {formatINR(summary.gstCollected)} | Paid: {formatINR(summary.gstPaid)}</div></div></CardContent></Card>
        </div>
      )}

      {chartData.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Monthly Cashflow</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData}>
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `₹${(v / 100000).toFixed(0)}L`} />
                <Tooltip formatter={(v: number) => formatINR(v)} />
                <Legend />
                <Bar dataKey="Income" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Expense" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="transactions">
        <TabsList>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
        </TabsList>
        <TabsContent value="transactions">
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50"><tr>
                <th className="text-left px-4 py-2.5 font-medium">Date</th>
                <th className="text-left px-4 py-2.5 font-medium">Description</th>
                <th className="text-left px-4 py-2.5 font-medium">Category</th>
                <th className="text-left px-4 py-2.5 font-medium">Type</th>
                <th className="text-right px-4 py-2.5 font-medium">Amount</th>
                <th className="text-right px-4 py-2.5 font-medium">GST</th>
              </tr></thead>
              <tbody className="divide-y">
                {transactions.map(t => (
                  <tr key={t.id} className="hover:bg-muted/30">
                    <td className="px-4 py-2.5 text-muted-foreground">{formatDate(t.date)}</td>
                    <td className="px-4 py-2.5">{t.description}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{t.category}</td>
                    <td className="px-4 py-2.5"><Badge className={`text-xs ${getStatusColor(t.type)}`}>{t.type}</Badge></td>
                    <td className="px-4 py-2.5 text-right font-medium">{formatINR(t.amount)}</td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground">{formatINR(t.gstAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
        <TabsContent value="invoices">
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50"><tr>
                <th className="text-left px-4 py-2.5 font-medium">Invoice No.</th>
                <th className="text-left px-4 py-2.5 font-medium">Client</th>
                <th className="text-left px-4 py-2.5 font-medium">Issue Date</th>
                <th className="text-left px-4 py-2.5 font-medium">Due Date</th>
                <th className="text-left px-4 py-2.5 font-medium">Status</th>
                <th className="text-right px-4 py-2.5 font-medium">Amount</th>
              </tr></thead>
              <tbody className="divide-y">
                {invoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-muted/30">
                    <td className="px-4 py-2.5 font-mono text-sm">{inv.invoiceNumber}</td>
                    <td className="px-4 py-2.5">{inv.client}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{formatDate(inv.issueDate)}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{formatDate(inv.dueDate)}</td>
                    <td className="px-4 py-2.5"><Badge className={`text-xs ${getStatusColor(inv.status)}`}>{inv.status}</Badge></td>
                    <td className="px-4 py-2.5 text-right font-medium">{formatINR(inv.totalAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
