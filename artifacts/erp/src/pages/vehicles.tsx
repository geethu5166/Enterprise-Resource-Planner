import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Plus, Wrench } from "lucide-react";
import { formatINR } from "@/lib/utils/format";

export default function Vehicles() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    registrationNumber: "",
    model: "",
    purchaseDate: "",
    fuelCapacity: "",
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ["vehicles"],
    queryFn: async () => {
      const res = await fetch("/api/vehicles");
      return res.json();
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["vehicles", "stats"],
    queryFn: async () => {
      const res = await fetch("/api/vehicles/stats");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const res = await fetch("/api/vehicles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      setShowForm(false);
      setFormData({
        registrationNumber: "",
        model: "",
        purchaseDate: "",
        fuelCapacity: "",
      });
    },
  });

  const handleSubmit = (e: any) => {
    e.preventDefault();
    createMutation.mutate({
      ...formData,
      fuelCapacity: formData.fuelCapacity ? parseFloat(formData.fuelCapacity) : null,
    });
  };

  if (!stats) return <div>Loading...</div>;

  const statusColors: Record<string, string> = {
    available: "bg-green-100 text-green-800",
    in_use: "bg-blue-100 text-blue-800",
    maintenance: "bg-yellow-100 text-yellow-800",
    out_of_service: "bg-red-100 text-red-800",
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Vehicles</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-2" size={20} />
          Add Vehicle
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600">Total Vehicles</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600">Available</p>
            <p className="text-2xl font-bold text-green-600">{stats.available}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">In Maintenance</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.maintenance}</p>
            </div>
            <Wrench className="text-yellow-600" size={32} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600">In Use</p>
            <p className="text-2xl font-bold text-blue-600">{stats.inUse}</p>
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
                  placeholder="Registration Number"
                  value={formData.registrationNumber}
                  onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
                  className="border rounded px-3 py-2"
                  required
                />
                <input
                  type="text"
                  placeholder="Model"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  className="border rounded px-3 py-2"
                  required
                />
                <input
                  type="date"
                  value={formData.purchaseDate}
                  onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                  className="border rounded px-3 py-2"
                  required
                />
                <input
                  type="number"
                  placeholder="Fuel Capacity (liters)"
                  value={formData.fuelCapacity}
                  onChange={(e) => setFormData({ ...formData, fuelCapacity: e.target.value })}
                  className="border rounded px-3 py-2"
                  step="0.01"
                />
              </div>
              <Button type="submit" className="w-full">
                Add Vehicle
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Vehicles Table */}
      <Card>
        <CardHeader>
          <CardTitle>Fleet</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr>
                  <th className="text-left py-2 px-4">Registration</th>
                  <th className="text-left py-2 px-4">Model</th>
                  <th className="text-left py-2 px-4">Purchase Date</th>
                  <th className="text-left py-2 px-4">Status</th>
                  <th className="text-left py-2 px-4">Fuel Capacity</th>
                </tr>
              </thead>
              <tbody>
                {vehicles.map((vehicle: any) => (
                  <tr key={vehicle.id} className="border-b hover:bg-gray-50">
                    <td className="py-2 px-4 font-medium">{vehicle.registrationNumber}</td>
                    <td className="py-2 px-4">{vehicle.model}</td>
                    <td className="py-2 px-4">{new Date(vehicle.purchaseDate).toLocaleDateString()}</td>
                    <td className="py-2 px-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[vehicle.status]}`}>
                        {vehicle.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-2 px-4">{vehicle.fuelCapacity} L</td>
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
