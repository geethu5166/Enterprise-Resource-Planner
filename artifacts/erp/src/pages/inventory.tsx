import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Plus, AlertCircle } from "lucide-react";
import { formatINR } from "@/lib/utils/format";

export default function Inventory() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    category: "cement",
    unit: "kg",
    quantity: "",
    minimumStock: "",
    unitPrice: "",
  });

  const { data: materials = [] } = useQuery({
    queryKey: ["inventory", "materials"],
    queryFn: async () => {
      const res = await fetch("/api/inventory/materials");
      return res.json();
    },
  });

  const { data: summary } = useQuery({
    queryKey: ["inventory", "summary"],
    queryFn: async () => {
      const res = await fetch("/api/inventory/summary");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const res = await fetch("/api/inventory/materials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      setShowForm(false);
      setFormData({
        name: "",
        category: "cement",
        unit: "kg",
        quantity: "",
        minimumStock: "",
        unitPrice: "",
      });
    },
  });

  const handleSubmit = (e: any) => {
    e.preventDefault();
    createMutation.mutate({
      ...formData,
      quantity: parseFloat(formData.quantity),
      minimumStock: parseFloat(formData.minimumStock),
      unitPrice: parseFloat(formData.unitPrice),
    });
  };

  const lowStockItems = materials.filter((m: any) => m.quantity <= m.minimumStock);

  if (!summary) return <div>Loading...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Inventory</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-2" size={20} />
          Add Material
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600">Total Items</p>
            <p className="text-2xl font-bold">{summary.totalItems}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Low Stock Items</p>
              <p className="text-2xl font-bold text-red-600">{summary.lowStockItems}</p>
            </div>
            <AlertCircle className="text-red-600" size={32} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600">Total Inventory Value</p>
            <p className="text-2xl font-bold">{formatINR(summary.totalInventoryValue)}</p>
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
                  placeholder="Material Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="border rounded px-3 py-2"
                  required
                />
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="border rounded px-3 py-2"
                >
                  <option value="cement">Cement</option>
                  <option value="steel">Steel</option>
                  <option value="sand">Sand</option>
                  <option value="aggregate">Aggregate</option>
                  <option value="metal">Metal</option>
                  <option value="wood">Wood</option>
                  <option value="electrical">Electrical</option>
                  <option value="plumbing">Plumbing</option>
                  <option value="other">Other</option>
                </select>
                <input
                  type="text"
                  placeholder="Unit (kg, m3, etc)"
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  className="border rounded px-3 py-2"
                  required
                />
                <input
                  type="number"
                  placeholder="Quantity"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  className="border rounded px-3 py-2"
                  step="0.01"
                  required
                />
                <input
                  type="number"
                  placeholder="Minimum Stock"
                  value={formData.minimumStock}
                  onChange={(e) => setFormData({ ...formData, minimumStock: e.target.value })}
                  className="border rounded px-3 py-2"
                  step="0.01"
                  required
                />
                <input
                  type="number"
                  placeholder="Unit Price"
                  value={formData.unitPrice}
                  onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                  className="border rounded px-3 py-2"
                  step="0.01"
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                Add Material
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Materials Table */}
      <Card>
        <CardHeader>
          <CardTitle>Materials</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr>
                  <th className="text-left py-2 px-4">Name</th>
                  <th className="text-left py-2 px-4">Category</th>
                  <th className="text-left py-2 px-4">Quantity</th>
                  <th className="text-left py-2 px-4">Min Stock</th>
                  <th className="text-left py-2 px-4">Unit Price</th>
                  <th className="text-left py-2 px-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {materials.map((m: any) => (
                  <tr key={m.id} className={`border-b hover:bg-gray-50 ${m.quantity <= m.minimumStock ? "bg-red-50" : ""}`}>
                    <td className="py-2 px-4 font-medium">{m.name}</td>
                    <td className="py-2 px-4 text-xs">{m.category}</td>
                    <td className="py-2 px-4">{m.quantity} {m.unit}</td>
                    <td className="py-2 px-4">{m.minimumStock} {m.unit}</td>
                    <td className="py-2 px-4">{formatINR(m.unitPrice)}</td>
                    <td className="py-2 px-4">
                      {m.quantity <= m.minimumStock ? (
                        <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">Low Stock</span>
                      ) : (
                        <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">OK</span>
                      )}
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
