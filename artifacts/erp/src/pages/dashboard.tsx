import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatINR } from "@/lib/utils/format";

export default function Dashboard() {
  const { data: summary } = useQuery({
    queryKey: ["dashboard", "summary"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/summary");
      return res.json();
    },
  });

  const { data: activities } = useQuery({
    queryKey: ["dashboard", "activity"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/recent-activity");
      return res.json();
    },
  });

  if (!summary) return <div className="text-center py-8">Loading...</div>;

  const kpis = [
    { label: "Total Projects", value: summary.totalProjects, color: "bg-blue-100" },
    { label: "Active Projects", value: summary.activeProjects, color: "bg-green-100" },
    { label: "Total Revenue", value: formatINR(summary.totalRevenue), color: "bg-purple-100" },
    { label: "Pending Invoices", value: formatINR(summary.pendingInvoices), color: "bg-orange-100" },
    { label: "Open Tenders", value: summary.openTenders, color: "bg-pink-100" },
    { label: "Vehicles in Maintenance", value: summary.vehiclesInMaintenance, color: "bg-red-100" },
    { label: "Low Stock Items", value: summary.lowStockItems, color: "bg-yellow-100" },
    { label: "Pending POs", value: summary.pendingPurchaseOrders, color: "bg-indigo-100" },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
      
      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className={kpi.color}>
            <CardContent className="pt-6">
              <p className="text-sm text-gray-600">{kpi.label}</p>
              <p className="text-2xl font-bold mt-2">{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Monthly Income</p>
                <p className="text-2xl font-bold text-green-600">{formatINR(summary.monthlyIncome)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Monthly Expenses</p>
                <p className="text-2xl font-bold text-red-600">{formatINR(summary.monthlyExpenses)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Employee Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">{summary.totalEmployees}</p>
            <p className="text-sm text-gray-600 mt-2">Active Employees</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {activities?.slice(0, 5).map((activity: any) => (
              <div key={activity.id} className="flex items-start space-x-4 pb-3 border-b last:border-0">
                <div className="bg-blue-100 rounded-full p-2">
                  <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                </div>
                <div className="flex-1">
                  <p className="font-medium">{activity.description}</p>
                  <p className="text-xs text-gray-500">{activity.module} • {new Date(activity.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
