import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Plus, TrendingUp, TrendingDown } from "lucide-react";
import { formatINR } from "@/lib/utils/format";

export default function Finance() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    projectId: "",
    type: "expense",
    amount: "",
    description: "",
    date: new Date().toISOString().split("T")[0],
    gstRate: "18",
  });

  const { data: summary } = useQuery({
    queryKey: ["finance", "summary"],
    queryFn: async () => {
      const res = await fetch("/api/finance/summary");
      return res.json();
    },
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ["finance", "transactions"],
    queryFn: async () => {
      const res = await fetch("/api/finance/transactions");
      return res.json();
    },
  });

  const { data: cashflow = [] } = useQuery({
    queryKey: ["finance", "cashflow"],
    queryFn: async () => {
      const res = await fetch("/api/finance/monthly-cashflow");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const res = await fetch("/api/finance/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance"] });
      setShowForm(false);
      setFormData({
        projectId: "",
        type: "expense",
        amount: "",
        description: "",
        date: new Date().toISOString().split("T")[0],
        gstRate: "18",
      });
    },
  });

  const handleSubmit = (e: any) => {
    e.preventDefault();
    createMutation.mutate({
      ...formData,
      projectId: formData.projectId ? parseInt(formData.projectId) : null,
      amount: parseFloat(formData.amount),
      gstRate: parseInt(formData.gstRate),
    });
  };

  if (!summary) return <div>Loading...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Finance</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-2" size={20} />
          New Transaction
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Income</p>
              <p className="text-2xl font-bold text-green-600">{formatINR(summary.totalIncome)}</p>
            </div>
            <TrendingUp className="text-green-600" size={32} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Expenses</p>
              <p className="text-2xl font-bold text-red-600">{formatINR(summary.totalExpense)}</p>
            </div>
            <TrendingDown className="text-red-600" size={32} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600">Net Balance</p>
            <p className={`text-2xl font-bold ${summary.netBalance >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatINR(summary.netBalance)}
            </p>
            <p className="text-xs text-gray-500 mt-2">Total GST: {formatINR(summary.totalGST)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Form */}
      {showForm && (
        <Card className="mb-8">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="border rounded px-3 py-2"
                >
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                </select>
                <input
                  type="number"
                  placeholder="Amount"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="border rounded px-3 py-2"
                  step="0.01"
                  required
                />
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="border rounded px-3 py-2"
                  required
                />
                <select
                  value={formData.gstRate}
                  onChange={(e) => setFormData({ ...formData, gstRate: e.target.value })}
                  className="border rounded px-3 py-2"
                >
                  <option value="0">0% GST</option>
                  <option value="5">5% GST</option>
                  <option value="12">12% GST</option>
                  <option value="18">18% GST</option>
                  <option value="28">28% GST</option>
                </select>
              </div>
              <input
                type="text"
                placeholder="Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="border rounded px-3 py-2 w-full"
              />
              <Button type="submit" className="w-full">
                Add Transaction
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Cashflow Chart */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Monthly Cashflow</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {cashflow.map((month: any) => (
              <div key={month.month} className="flex items-center justify-between">
                <span className="text-sm font-medium">{month.month}</span>
                <div className="flex items-center space-x-4 flex-1 ml-4">
                  <div className="flex-1 flex items-center space-x-2">
                    <div className="bg-green-200 h-6" style={{ width: `${(month.income / 100000) * 100}px` }}></div>
                    <span className="text-xs">{formatINR(month.income)}</span>
                  </div>
                  <div className="flex-1 flex items-center space-x-2">
                    <div className="bg-red-200 h-6" style={{ width: `${(month.expense / 100000) * 100}px` }}></div>
                    <span className="text-xs">{formatINR(month.expense)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr>
                  <th className="text-left py-2 px-4">Date</th>
                  <th className="text-left py-2 px-4">Type</th>
                  <th className="text-left py-2 px-4">Description</th>
                  <th className="text-left py-2 px-4">Amount</th>
                  <th className="text-left py-2 px-4">GST</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((txn: any) => (
                  <tr key={txn.id} className="border-b hover:bg-gray-50">
                    <td className="py-2 px-4">{new Date(txn.date).toLocaleDateString()}</td>
                    <td className="py-2 px-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        txn.type === "income" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                      }`}>
                        {txn.type}
                      </span>
                    </td>
                    <td className="py-2 px-4">{txn.description}</td>
                    <td className="py-2 px-4 font-medium">{formatINR(txn.amount)}</td>
                    <td className="py-2 px-4">{formatINR(txn.gstAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
