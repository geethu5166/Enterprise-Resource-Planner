import { useState } from "react";
import { useListVehicles, useCreateVehicle, useGetVehicleStats, useListMaintenanceRecords, useListFuelLogs } from "@workspace/api-client-react";
import { formatINR, getStatusColor, formatDate } from "@/lib/utils/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PlusCircle, Truck, Wrench, Fuel } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { getListVehiclesQueryKey, getGetVehicleStatsQueryKey } from "@workspace/api-client-react";

const VEHICLE_TYPES = ["truck", "excavator", "crane", "mixer", "tipper", "JCB", "other"];

export default function Vehicles() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: vehicles = [], isLoading } = useListVehicles(statusFilter && statusFilter !== "all" ? { status: statusFilter as "available" } : undefined);
  const { data: stats } = useGetVehicleStats();
  const { data: maintenance = [] } = useListMaintenanceRecords();
  const { data: fuelLogs = [] } = useListFuelLogs();
  const createVehicle = useCreateVehicle();
  const { register, handleSubmit, control, reset } = useForm<{
    registrationNumber: string; make: string; model: string;
    type: string; year: number; fuelType: string; driver: string; insuranceExpiry: string;
  }>();

  const onSubmit = async (data: Parameters<typeof createVehicle.mutateAsync>[0]) => {
    await createVehicle.mutateAsync({ ...data, year: Number(data.year) });
    queryClient.invalidateQueries({ queryKey: getListVehiclesQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetVehicleStatsQueryKey() });
    reset();
    setOpen(false);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Vehicle & Equipment</h1>
          <p className="text-muted-foreground text-sm mt-1">Fleet management, maintenance, and fuel tracking</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><PlusCircle className="h-4 w-4" />Add Vehicle</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Register Vehicle</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit(onSubmit as never)} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5 col-span-2"><Label>Registration Number</Label><Input {...register("registrationNumber", { required: true })} placeholder="MH12-AB-1234" /></div>
                <div className="space-y-1.5"><Label>Make</Label><Input {...register("make", { required: true })} placeholder="Tata / JCB / XCMG" /></div>
                <div className="space-y-1.5"><Label>Model</Label><Input {...register("model", { required: true })} /></div>
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <Controller name="type" control={control} rules={{ required: true }} render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{VEHICLE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  )} />
                </div>
                <div className="space-y-1.5"><Label>Year</Label><Input type="number" {...register("year", { required: true })} /></div>
                <div className="space-y-1.5"><Label>Fuel Type</Label><Input {...register("fuelType", { required: true })} placeholder="Diesel / Petrol / CNG" /></div>
                <div className="space-y-1.5"><Label>Driver</Label><Input {...register("driver")} /></div>
                <div className="space-y-1.5 col-span-2"><Label>Insurance Expiry</Label><Input type="date" {...register("insuranceExpiry")} /></div>
              </div>
              <Button type="submit" className="w-full" disabled={createVehicle.isPending}>
                {createVehicle.isPending ? "Registering..." : "Register Vehicle"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-4"><div className="flex items-center gap-3"><Truck className="h-8 w-8 text-primary" /><div><div className="text-2xl font-bold">{stats.total}</div><div className="text-xs text-muted-foreground">Total Fleet</div></div></div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="space-y-1"><div className="flex justify-between text-sm"><span className="text-muted-foreground">Available</span><span className="font-medium text-green-600">{stats.available}</span></div><div className="flex justify-between text-sm"><span className="text-muted-foreground">In Use</span><span className="font-medium text-blue-600">{stats.inUse}</span></div><div className="flex justify-between text-sm"><span className="text-muted-foreground">Maintenance</span><span className="font-medium text-yellow-600">{stats.inMaintenance}</span></div></div></CardContent></Card>
          <Card><CardContent className="pt-4"><div><div className="text-xs text-muted-foreground mb-1">Fuel Cost (Total)</div><div className="text-xl font-bold">{formatINR(stats.totalFuelCost)}</div></div></CardContent></Card>
          <Card><CardContent className="pt-4"><div><div className="text-xs text-muted-foreground mb-1">Maintenance Cost (Total)</div><div className="text-xl font-bold">{formatINR(stats.totalMaintenanceCost)}</div></div></CardContent></Card>
        </div>
      )}

      <div className="flex justify-end">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="All Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="available">Available</SelectItem>
            <SelectItem value="in_use">In Use</SelectItem>
            <SelectItem value="maintenance">Maintenance</SelectItem>
            <SelectItem value="out_of_service">Out of Service</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="fleet">
        <TabsList>
          <TabsTrigger value="fleet">Fleet</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          <TabsTrigger value="fuel">Fuel Logs</TabsTrigger>
        </TabsList>
        <TabsContent value="fleet">
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50"><tr>
                <th className="text-left px-4 py-2.5 font-medium">Registration</th>
                <th className="text-left px-4 py-2.5 font-medium">Vehicle</th>
                <th className="text-left px-4 py-2.5 font-medium">Type</th>
                <th className="text-left px-4 py-2.5 font-medium">Status</th>
                <th className="text-left px-4 py-2.5 font-medium">Driver</th>
                <th className="text-left px-4 py-2.5 font-medium">Project</th>
                <th className="text-right px-4 py-2.5 font-medium">Odometer (km)</th>
              </tr></thead>
              <tbody className="divide-y">
                {isLoading ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Loading...</td></tr>
                ) : vehicles.map(v => (
                  <tr key={v.id} className="hover:bg-muted/30">
                    <td className="px-4 py-2.5 font-mono font-medium">{v.registrationNumber}</td>
                    <td className="px-4 py-2.5">{v.make} {v.model} ({v.year})</td>
                    <td className="px-4 py-2.5"><Badge variant="outline" className="text-xs capitalize">{v.type}</Badge></td>
                    <td className="px-4 py-2.5"><Badge className={`text-xs ${getStatusColor(v.status)}`}>{v.status.replace("_", " ")}</Badge></td>
                    <td className="px-4 py-2.5 text-muted-foreground">{v.driver ?? "-"}</td>
                    <td className="px-4 py-2.5 text-muted-foreground text-xs">{v.assignedProject ?? "-"}</td>
                    <td className="px-4 py-2.5 text-right">{v.odometer.toLocaleString("en-IN")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
        <TabsContent value="maintenance">
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50"><tr>
                <th className="text-left px-4 py-2.5 font-medium">Vehicle</th>
                <th className="text-left px-4 py-2.5 font-medium">Type</th>
                <th className="text-left px-4 py-2.5 font-medium">Description</th>
                <th className="text-left px-4 py-2.5 font-medium">Date</th>
                <th className="text-left px-4 py-2.5 font-medium">Status</th>
                <th className="text-right px-4 py-2.5 font-medium">Cost</th>
              </tr></thead>
              <tbody className="divide-y">
                {maintenance.map(m => (
                  <tr key={m.id} className="hover:bg-muted/30">
                    <td className="px-4 py-2.5 font-mono text-sm">{m.vehicleRegistration}</td>
                    <td className="px-4 py-2.5"><Badge className={`text-xs ${getStatusColor(m.type)}`}>{m.type}</Badge></td>
                    <td className="px-4 py-2.5">{m.description}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{formatDate(m.date)}</td>
                    <td className="px-4 py-2.5"><Badge className={`text-xs ${getStatusColor(m.status)}`}>{m.status.replace("_", " ")}</Badge></td>
                    <td className="px-4 py-2.5 text-right font-medium">{formatINR(m.cost)}</td>
                  </tr>
                ))}
                {maintenance.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No maintenance records</td></tr>}
              </tbody>
            </table>
          </div>
        </TabsContent>
        <TabsContent value="fuel">
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50"><tr>
                <th className="text-left px-4 py-2.5 font-medium">Vehicle</th>
                <th className="text-left px-4 py-2.5 font-medium">Date</th>
                <th className="text-right px-4 py-2.5 font-medium">Liters</th>
                <th className="text-right px-4 py-2.5 font-medium">Rate/L</th>
                <th className="text-right px-4 py-2.5 font-medium">Total</th>
                <th className="text-right px-4 py-2.5 font-medium">Odometer</th>
              </tr></thead>
              <tbody className="divide-y">
                {fuelLogs.map(f => (
                  <tr key={f.id} className="hover:bg-muted/30">
                    <td className="px-4 py-2.5 font-mono text-sm">{f.vehicleRegistration}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{formatDate(f.date)}</td>
                    <td className="px-4 py-2.5 text-right">{f.liters} L</td>
                    <td className="px-4 py-2.5 text-right">₹{f.costPerLiter}</td>
                    <td className="px-4 py-2.5 text-right font-medium">{formatINR(f.totalCost)}</td>
                    <td className="px-4 py-2.5 text-right">{f.odometer.toLocaleString("en-IN")}</td>
                  </tr>
                ))}
                {fuelLogs.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No fuel logs</td></tr>}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
