import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Plus } from "lucide-react";
import { formatINR } from "@/lib/utils/format";

export default function Tenders() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    client: "",
    estimatedValue: "",
    deadlineDate: "",
    bidAmount: "",
  });

  const { data: tenders = [] } = useQuery({
    queryKey: ["tenders"],
    queryFn: async () => {
      const res = await fetch("/api/tenders");
      return res.json();
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["tenders", "stats"],
    queryFn: async () => {
      const res = await fetch("/api/tenders/stats");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const res = await fetch("/api/tenders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenders"] });
      setShowForm(false);
      setFormData({
        title: "",
        description: "",
        client: "",
        estimatedValue: "",
        deadlineDate: "",
        bidAmount: "",
      });
    },
  });

  const handleSubmit = (e: any) => {
    e.preventDefault();
    createMutation.mutate({
      ...formData,
      estimatedValue: parseFloat(formData.estimatedValue),
      bidAmount: formData.bidAmount ? parseFloat(formData.bidAmount) : null,
    });
  };

  if (!stats) return <div>Loading...</div>;

  const statusColors: Record<string, string> = {
    open: "bg-blue-100 text-blue-800",
    submitted: "bg-purple-100 text-purple-800",
    under_evaluation: "bg-yellow-100 text-yellow-800",
    awarded: "bg-green-100 text-green-800",
    lost: "bg-red-100 text-red-800",
    cancelled: "bg-gray-100 text-gray-800",
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Tenders</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-2" size={20} />
          New Tender
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600">Total Tenders</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600">Win Rate</p>
            <p className="text-2xl font-bold text-green-600">{stats.winRate}%</p>
            <p className="text-xs text-gray-500 mt-1">{stats.awarded} awarded</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600">Open Tenders</p>
            <p className="text-2xl font-bold text-blue-600">{stats.open}</p>
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
                  placeholder="Tender Title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="border rounded px-3 py-2"
                  required
                />
                <input
                  type="text"
                  placeholder="Client"
                  value={formData.client}
                  onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                  className="border rounded px-3 py-2"
                  required
                />
                <input
                  type="number"
                  placeholder="Estimated Value"
                  value={formData.estimatedValue}
                  onChange={(e) => setFormData({ ...formData, estimatedValue: e.target.value })}
                  className="border rounded px-3 py-2"
                  step="0.01"
                  required
                />
                <input
                  type="date"
                  value={formData.deadlineDate}
                  onChange={(e) => setFormData({ ...formData, deadlineDate: e.target.value })}
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
                Create Tender
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Tenders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Tenders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr>
                  <th className="text-left py-2 px-4">Title</th>
                  <th className="text-left py-2 px-4">Client</th>
                  <th className="text-left py-2 px-4">Est. Value</th>
                  <th className="text-left py-2 px-4">Status</th>
                  <th className="text-left py-2 px-4">Deadline</th>
                </tr>
              </thead>
              <tbody>
                {tenders.map((tender: any) => (
                  <tr key={tender.id} className="border-b hover:bg-gray-50">
                    <td className="py-2 px-4 font-medium">{tender.title}</td>
                    <td className="py-2 px-4">{tender.client}</td>
                    <td className="py-2 px-4">{formatINR(tender.estimatedValue)}</td>
                    <td className="py-2 px-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[tender.status]}`}>
                        {tender.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-2 px-4">{new Date(tender.deadlineDate).toLocaleDateString()}</td>
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
