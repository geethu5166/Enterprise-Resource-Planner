export function formatINR(amount: number): string {
  if (amount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(2)} Cr`;
  } else if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(2)} L`;
  }
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    active: "bg-green-100 text-green-800",
    planning: "bg-blue-100 text-blue-800",
    on_hold: "bg-yellow-100 text-yellow-800",
    completed: "bg-gray-100 text-gray-800",
    cancelled: "bg-red-100 text-red-800",
    draft: "bg-gray-100 text-gray-800",
    sent: "bg-blue-100 text-blue-800",
    paid: "bg-green-100 text-green-800",
    overdue: "bg-red-100 text-red-800",
    pending_approval: "bg-yellow-100 text-yellow-800",
    approved: "bg-green-100 text-green-800",
    ordered: "bg-blue-100 text-blue-800",
    received: "bg-emerald-100 text-emerald-800",
    open: "bg-blue-100 text-blue-800",
    submitted: "bg-purple-100 text-purple-800",
    under_evaluation: "bg-yellow-100 text-yellow-800",
    awarded: "bg-green-100 text-green-800",
    lost: "bg-red-100 text-red-800",
    available: "bg-green-100 text-green-800",
    in_use: "bg-blue-100 text-blue-800",
    maintenance: "bg-yellow-100 text-yellow-800",
    out_of_service: "bg-red-100 text-red-800",
    income: "bg-green-100 text-green-800",
    expense: "bg-red-100 text-red-800",
    blacklisted: "bg-red-100 text-red-800",
    inactive: "bg-gray-100 text-gray-800",
    pending: "bg-yellow-100 text-yellow-800",
    in_progress: "bg-blue-100 text-blue-800",
    breakdown: "bg-red-100 text-red-800",
    scheduled: "bg-blue-100 text-blue-800",
    inspection: "bg-purple-100 text-purple-800",
  };
  return colors[status] ?? "bg-gray-100 text-gray-800";
}
