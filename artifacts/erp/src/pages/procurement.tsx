import { useState } from "react";
import { useListPurchaseOrders, useCreatePurchaseOrder, useGetProcurementStats, useListVendors } from "@workspace/api-client-react";
import { formatINR, getStatusColor, formatDate } from "@/lib/utils/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PlusCircle, ShoppingCart, Clock, IndianRupee } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { getListPurchaseOrdersQueryKey, getGetProcurementStatsQueryKey } from "@workspace/api-client-react";

export default function Procurement() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: orders = [], isLoading } = useListPurchaseOrders(statusFilter && statusFilter !== "all" ? { status: statusFilter as "draft" } : undefined);
  const { data: stats } = useGetProcurementStats();
  const { data: vendors = [] } = useListVendors();
  const createPO = useCreatePurchaseOrder();
  const { register, handleSubmit, control, reset } = useForm<{
    vendorId: number; requiredDate: string; description: string;
  }>();

  const onSubmit = async (data: Parameters<typeof createPO.mutateAsync>[0]) => {
    await createPO.mutateAsync({
      ...data,
      vendorId: Number(data.vendorId),
      items: [{ materialName: "Cement OPC 53", quantity: 100, unit: "bags", unitPrice: 380 }],
    });
    queryClient.invalidateQueries({ queryKey: getListPurchaseOrdersQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetProcurementStatsQueryKey() });
    reset();
    setOpen(false);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Procurement</h1>
          <p className="text-muted-foreground text-sm mt-1">Purchase orders and vendor contracts</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><PlusCircle className="h-4 w-4" />New PO</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Purchase Order</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit(onSubmit as never)} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Vendor</Label>
                <Controller name="vendorId" control={control} rules={{ required: true }} render={({ field }) => (
                  <Select onValueChange={v => field.onChange(Number(v))} value={field.value?.toString()}>
                    <SelectTrigger><SelectValue placeholder="Select vendor" /></SelectTrigger>
                    <SelectContent>
                      {vendors.map(v => <SelectItem key={v.id} value={v.id.toString()}>{v.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )} />
              </div>
              <div className="space-y-1.5"><Label>Required Date</Label><Input type="date" {...register("requiredDate", { required: true })} /></div>
              <div className="space-y-1.5"><Label>Description</Label><Input {...register("description")} /></div>
              <Button type="submit" className="w-full" disabled={createPO.isPending}>
                {createPO.isPending ? "Creating..." : "Create PO"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-4"><div className="flex items-center gap-3"><ShoppingCart className="h-8 w-8 text-primary" /><div><div className="text-2xl font-bold">{stats.totalOrders}</div><div className="text-xs text-muted-foreground">Total Orders</div></div></div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="flex items-center gap-3"><Clock className="h-8 w-8 text-yellow-500" /><div><div className="text-2xl font-bold">{stats.pendingApproval}</div><div className="text-xs text-muted-foreground">Pending Approval</div></div></div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">Total PO Value</div><div className="text-xl font-bold">{formatINR(stats.totalValue)}</div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">This Month</div><div className="text-xl font-bold">{formatINR(stats.thisMonthValue)}</div></CardContent></Card>
        </div>
      )}

      <div className="flex justify-end">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="All Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="pending_approval">Pending Approval</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="ordered">Ordered</SelectItem>
            <SelectItem value="received">Received</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50"><tr>
            <th className="text-left px-4 py-2.5 font-medium">PO Number</th>
            <th className="text-left px-4 py-2.5 font-medium">Vendor</th>
            <th className="text-left px-4 py-2.5 font-medium">Project</th>
            <th className="text-left px-4 py-2.5 font-medium">Required Date</th>
            <th className="text-left px-4 py-2.5 font-medium">Status</th>
            <th className="text-right px-4 py-2.5 font-medium">Amount</th>
          </tr></thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Loading...</td></tr>
            ) : orders.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No purchase orders found</td></tr>
            ) : orders.map(order => (
              <tr key={order.id} className="hover:bg-muted/30">
                <td className="px-4 py-2.5 font-mono text-sm">{order.poNumber}</td>
                <td className="px-4 py-2.5">{order.vendorName}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{order.projectName ?? "-"}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{formatDate(order.requiredDate)}</td>
                <td className="px-4 py-2.5"><Badge className={`text-xs ${getStatusColor(order.status)}`}>{order.status.replace("_", " ")}</Badge></td>
                <td className="px-4 py-2.5 text-right font-medium">{formatINR(order.totalAmount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
