import { useState } from "react";
import { useListMaterials, useCreateMaterial, useGetInventorySummary, useListStockMovements } from "@workspace/api-client-react";
import { formatINR, getStatusColor, formatDate } from "@/lib/utils/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PlusCircle, Package, AlertTriangle } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { getListMaterialsQueryKey, getGetInventorySummaryQueryKey } from "@workspace/api-client-react";

export default function Inventory() {
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: materials = [], isLoading } = useListMaterials(categoryFilter && categoryFilter !== "all" ? { category: categoryFilter as "cement" } : undefined);
  const { data: summary } = useGetInventorySummary();
  const { data: movements = [] } = useListStockMovements();
  const createMaterial = useCreateMaterial();
  const { register, handleSubmit, control, reset } = useForm<{
    name: string; category: string; unit: string; currentStock: number;
    minimumStock: number; unitCost: number; location: string;
  }>();

  const onSubmit = async (data: Parameters<typeof createMaterial.mutateAsync>[0]) => {
    await createMaterial.mutateAsync({
      ...data,
      currentStock: Number(data.currentStock),
      minimumStock: Number(data.minimumStock),
      unitCost: Number(data.unitCost),
    });
    queryClient.invalidateQueries({ queryKey: getListMaterialsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetInventorySummaryQueryKey() });
    reset();
    setOpen(false);
  };

  const categories = ["cement", "steel", "sand", "aggregate", "metal", "wood", "electrical", "plumbing", "other"];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Inventory & Stores</h1>
          <p className="text-muted-foreground text-sm mt-1">Material stock tracking and management</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><PlusCircle className="h-4 w-4" />Add Material</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add New Material</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit(onSubmit as never)} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5 col-span-2"><Label>Material Name</Label><Input {...register("name", { required: true })} /></div>
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <Controller name="category" control={control} rules={{ required: true }} render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  )} />
                </div>
                <div className="space-y-1.5"><Label>Unit</Label><Input {...register("unit", { required: true })} placeholder="bags / MT / CuM" /></div>
                <div className="space-y-1.5"><Label>Current Stock</Label><Input type="number" {...register("currentStock")} placeholder="0" /></div>
                <div className="space-y-1.5"><Label>Minimum Stock</Label><Input type="number" {...register("minimumStock", { required: true })} /></div>
                <div className="space-y-1.5"><Label>Unit Cost (INR)</Label><Input type="number" {...register("unitCost", { required: true })} /></div>
                <div className="space-y-1.5"><Label>Location</Label><Input {...register("location")} placeholder="Store A - Bay 1" /></div>
              </div>
              <Button type="submit" className="w-full" disabled={createMaterial.isPending}>
                {createMaterial.isPending ? "Adding..." : "Add Material"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card><CardContent className="pt-4"><div className="flex items-center gap-3"><Package className="h-8 w-8 text-primary" /><div><div className="text-2xl font-bold">{summary.totalItems}</div><div className="text-xs text-muted-foreground">Total Items</div></div></div></CardContent></Card>
          <Card><CardContent className="pt-4"><div><div className="text-xs text-muted-foreground mb-1">Total Inventory Value</div><div className="text-xl font-bold">{formatINR(summary.totalValue)}</div></div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="flex items-center gap-3"><AlertTriangle className={`h-8 w-8 ${summary.lowStockCount > 0 ? "text-red-500" : "text-muted-foreground"}`} /><div><div className="text-2xl font-bold">{summary.lowStockCount}</div><div className="text-xs text-muted-foreground">Low Stock Alerts</div></div></div></CardContent></Card>
        </div>
      )}

      <Tabs defaultValue="materials">
        <TabsList>
          <TabsTrigger value="materials">Materials</TabsTrigger>
          <TabsTrigger value="movements">Stock Movements</TabsTrigger>
        </TabsList>
        <TabsContent value="materials" className="space-y-4">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-48"><SelectValue placeholder="All Categories" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50"><tr>
                <th className="text-left px-4 py-2.5 font-medium">Material</th>
                <th className="text-left px-4 py-2.5 font-medium">Category</th>
                <th className="text-right px-4 py-2.5 font-medium">Stock</th>
                <th className="text-right px-4 py-2.5 font-medium">Min Stock</th>
                <th className="text-right px-4 py-2.5 font-medium">Unit Cost</th>
                <th className="text-right px-4 py-2.5 font-medium">Total Value</th>
                <th className="text-left px-4 py-2.5 font-medium">Location</th>
              </tr></thead>
              <tbody className="divide-y">
                {isLoading ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Loading...</td></tr>
                ) : materials.map(m => {
                  const isLow = m.currentStock <= m.minimumStock;
                  return (
                    <tr key={m.id} className={`hover:bg-muted/30 ${isLow ? "bg-red-50" : ""}`}>
                      <td className="px-4 py-2.5 font-medium">
                        <div className="flex items-center gap-2">
                          {isLow && <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />}
                          {m.name}
                        </div>
                      </td>
                      <td className="px-4 py-2.5"><Badge variant="outline" className="text-xs capitalize">{m.category}</Badge></td>
                      <td className={`px-4 py-2.5 text-right font-medium ${isLow ? "text-red-600" : ""}`}>{m.currentStock} {m.unit}</td>
                      <td className="px-4 py-2.5 text-right text-muted-foreground">{m.minimumStock} {m.unit}</td>
                      <td className="px-4 py-2.5 text-right">{formatINR(m.unitCost)}</td>
                      <td className="px-4 py-2.5 text-right font-medium">{formatINR(m.totalValue)}</td>
                      <td className="px-4 py-2.5 text-muted-foreground text-xs">{m.location ?? "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </TabsContent>
        <TabsContent value="movements">
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50"><tr>
                <th className="text-left px-4 py-2.5 font-medium">Date</th>
                <th className="text-left px-4 py-2.5 font-medium">Material</th>
                <th className="text-left px-4 py-2.5 font-medium">Type</th>
                <th className="text-right px-4 py-2.5 font-medium">Quantity</th>
                <th className="text-left px-4 py-2.5 font-medium">Project</th>
                <th className="text-left px-4 py-2.5 font-medium">Reason</th>
              </tr></thead>
              <tbody className="divide-y">
                {movements.map(m => (
                  <tr key={m.id} className="hover:bg-muted/30">
                    <td className="px-4 py-2.5 text-muted-foreground">{formatDate(m.date)}</td>
                    <td className="px-4 py-2.5">{m.materialName}</td>
                    <td className="px-4 py-2.5"><Badge className={`text-xs ${m.type === "in" ? "bg-green-100 text-green-800" : m.type === "out" ? "bg-red-100 text-red-800" : "bg-blue-100 text-blue-800"}`}>{m.type}</Badge></td>
                    <td className="px-4 py-2.5 text-right">{m.quantity} {m.unit}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{m.projectName ?? "-"}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{m.reason}</td>
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
