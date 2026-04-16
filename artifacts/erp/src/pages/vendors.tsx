import { useState } from "react";
import { useListVendors, useCreateVendor } from "@workspace/api-client-react";
import { getStatusColor } from "@/lib/utils/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PlusCircle, Search, Star, Building2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { getListVendorsQueryKey } from "@workspace/api-client-react";

export default function Vendors() {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: vendors = [], isLoading } = useListVendors();
  const createVendor = useCreateVendor();
  const { register, handleSubmit, reset } = useForm<{
    name: string; contactPerson: string; email: string; phone: string;
    address: string; gstNumber: string; panNumber: string; category: string;
  }>();

  const filtered = vendors.filter(v =>
    v.name.toLowerCase().includes(search.toLowerCase()) ||
    (v.category ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const onSubmit = async (data: Parameters<typeof createVendor.mutateAsync>[0]) => {
    await createVendor.mutateAsync(data);
    queryClient.invalidateQueries({ queryKey: getListVendorsQueryKey() });
    reset();
    setOpen(false);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Vendors</h1>
          <p className="text-muted-foreground text-sm mt-1">Supplier and contractor registry</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><PlusCircle className="h-4 w-4" />Add Vendor</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add New Vendor</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit(onSubmit as never)} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5 col-span-2"><Label>Company Name</Label><Input {...register("name", { required: true })} /></div>
                <div className="space-y-1.5"><Label>Contact Person</Label><Input {...register("contactPerson")} /></div>
                <div className="space-y-1.5"><Label>Phone</Label><Input {...register("phone", { required: true })} /></div>
                <div className="space-y-1.5"><Label>Email</Label><Input {...register("email")} /></div>
                <div className="space-y-1.5"><Label>Category</Label><Input {...register("category", { required: true })} placeholder="cement / steel / etc." /></div>
                <div className="space-y-1.5"><Label>GST Number</Label><Input {...register("gstNumber")} /></div>
                <div className="space-y-1.5"><Label>PAN Number</Label><Input {...register("panNumber")} /></div>
                <div className="space-y-1.5 col-span-2"><Label>Address</Label><Input {...register("address")} /></div>
              </div>
              <Button type="submit" className="w-full" disabled={createVendor.isPending}>
                {createVendor.isPending ? "Adding..." : "Add Vendor"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search vendors..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-36 bg-muted rounded-lg animate-pulse" />)}</div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(vendor => (
            <Card key={vendor.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary shrink-0" />
                    <div className="font-semibold text-sm leading-snug">{vendor.name}</div>
                  </div>
                  <Badge className={`text-xs shrink-0 ${getStatusColor(vendor.status)}`}>{vendor.status}</Badge>
                </div>
                <div className="text-xs text-muted-foreground space-y-0.5">
                  {vendor.contactPerson && <div>Contact: {vendor.contactPerson}</div>}
                  <div>Phone: {vendor.phone}</div>
                  {vendor.email && <div>{vendor.email}</div>}
                  {vendor.gstNumber && <div className="font-mono">GST: {vendor.gstNumber}</div>}
                </div>
                <div className="flex items-center justify-between mt-3">
                  <Badge variant="outline" className="text-xs">{vendor.category}</Badge>
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                    <span className="text-xs font-medium">{Number(vendor.rating).toFixed(1)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-3 text-center py-12 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <div>No vendors found</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
