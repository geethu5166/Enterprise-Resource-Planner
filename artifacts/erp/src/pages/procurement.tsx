import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Plus } from "lucide-react";
import { formatINR } from "@/lib/utils/format";

export default function Procurement() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    poNumber: "",
    vendorId: "",
    amount: "",
    description: "",
    orderDate: new Date().toISOString().split("T")[0],
  });

  const { data: pos = [] } = useQuery({
    queryKey: ["procurement", "pos"],
    queryFn: async () => {
      const res = await fetch("/api/procurement/purchase-orders");
      return res.json();
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["procurement", "stats"],
    queryFn: async () => {
      const res = await fetch("/api/procurement/stats");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const res = await fetch("/api/procurement/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["procurement"] });
      setShowForm(false);
      setFormData({
        poNumber: "",
        vendorId: "",
        amount: "",
        description: "",
        orderDate: new Date().toISOString().split("T")[0],
      });
    },
  });

  const handleSubmit = (e: any) => {
    e.preventDefault();
    createMutation.mutate({
      ...formData,
      vendorId: parseInt(formData.vendorId),
      amount: parseFloat(formData.amount),
    });
  };

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }) => {
      const res = await fetch(`/api/procurement/purchase-orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["procurement"] });
    },
  });

  if (!stats) return <div>Loading...</div>;

  const statusColors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-800",
    pending_approval: "bg-yellow-100 text-yellow-800",
    approved: "bg-blue-100 text-blue-800",
    ordered: "bg-purple-100 text-purple-800",
    received: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Procurement</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-2" size={20} />
          New PO
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600">Total POs</p>
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-gray-500 mt-1">Value: {formatINR(stats.totalValue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600">Pending Approval</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600">Received</p>
            <p className="text-2xl font-bold text-green-600">{stats.received}</p>
          </CardContent>
        </Card>
      </div>

      {/* Form */}
      {showForm && (
        <Card className="mb-8">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="PO Number"
                  value={formData.poNumber}
                  onChange={(e) => setFormData({ ...formData, poNumber: e.target.value })}
                  className="border rounded px-3 py-2"
                  required
                />
                <input
                  type="number"
                  placeholder="Vendor ID"
                  value={formData.vendorId}
                  onChange={(e) => setFormData({ ...formData, vendorId: e.target.value })}
                  className="border rounded px-3 py-2"
                  required
                />
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
                  value={formData.orderDate}
                  onChange={(e) => setFormData({ ...formData, orderDate: e.target.value })}
                  className="border rounded px-3 py-2"
                  required
                />
              </div>
              <textarea
                placeholder="Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="border rounded px-3 py-2 w-full"
                rows={3}
              />
              <Button type="submit" className="w-full">
                Create PO
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* POs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Purchase Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr>
                  <th className="text-left py-2 px-4">PO #</th>
                  <th className="text-left py-2 px-4">Vendor ID</th>
                  <th className="text-left py-2 px-4">Amount</th>
                  <th className="text-left py-2 px-4">Status</th>
                  <th className="text-left py-2 px-4">Order Date</th>
                  <th className="text-left py-2 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pos.map((po: any) => (
                  <tr key={po.id} className="border-b hover:bg-gray-50">
                    <td className="py-2 px-4 font-medium">{po.poNumber}</td>
                    <td className="py-2 px-4">{po.vendorId}</td>
                    <td className="py-2 px-4">{formatINR(po.amount)}</td>
                    <td className="py-2 px-4">
                      <select
                        value={po.status}
                        onChange={(e) => updateStatusMutation.mutate({ id: po.id, status: e.target.value })}
                        className={`px-2 py-1 rounded text-xs font-medium border-0 ${statusColors[po.status]}`}
                      >
                        <option value="draft">Draft</option>
                        <option value="pending_approval">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="ordered">Ordered</option>
                        <option value="received">Received</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </td>
                    <td className="py-2 px-4">{new Date(po.orderDate).toLocaleDateString()}</td>
                    <td className="py-2 px-4">
                      <button className="text-blue-600 hover:underline text-xs">View</button>
                    </td>
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
