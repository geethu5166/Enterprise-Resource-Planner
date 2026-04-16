import { useState } from "react";
import { useListTenders, useCreateTender, useGetTenderStats } from "@workspace/api-client-react";
import { formatINR, getStatusColor, formatDate } from "@/lib/utils/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PlusCircle, FileText, Trophy, TrendingUp } from "lucide-react";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { getListTendersQueryKey, getGetTenderStatsQueryKey } from "@workspace/api-client-react";

const STAGES = ["open", "submitted", "under_evaluation", "awarded", "lost", "cancelled"];

export default function Tenders() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: tenders = [], isLoading } = useListTenders(statusFilter && statusFilter !== "all" ? { status: statusFilter as "open" } : undefined);
  const { data: stats } = useGetTenderStats();
  const createTender = useCreateTender();
  const { register, handleSubmit, reset } = useForm<{
    title: string; client: string; location: string; estimatedValue: number;
    bidAmount: number; submissionDate: string; openingDate: string; type: string; description: string;
  }>();

  const onSubmit = async (data: Parameters<typeof createTender.mutateAsync>[0]) => {
    await createTender.mutateAsync({
      ...data,
      estimatedValue: Number(data.estimatedValue),
      bidAmount: data.bidAmount ? Number(data.bidAmount) : undefined,
    });
    queryClient.invalidateQueries({ queryKey: getListTendersQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetTenderStatsQueryKey() });
    reset();
    setOpen(false);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tender Management</h1>
          <p className="text-muted-foreground text-sm mt-1">Track bids, tenders, and contract awards</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><PlusCircle className="h-4 w-4" />New Tender</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Add Tender</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit(onSubmit as never)} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5 col-span-2"><Label>Tender Title</Label><Input {...register("title", { required: true })} /></div>
                <div className="space-y-1.5"><Label>Client / Authority</Label><Input {...register("client", { required: true })} /></div>
                <div className="space-y-1.5"><Label>Location</Label><Input {...register("location", { required: true })} /></div>
                <div className="space-y-1.5"><Label>Estimated Value (INR)</Label><Input type="number" {...register("estimatedValue", { required: true })} /></div>
                <div className="space-y-1.5"><Label>Bid Amount (INR)</Label><Input type="number" {...register("bidAmount")} /></div>
                <div className="space-y-1.5"><Label>Submission Date</Label><Input type="date" {...register("submissionDate", { required: true })} /></div>
                <div className="space-y-1.5"><Label>Opening Date</Label><Input type="date" {...register("openingDate", { required: true })} /></div>
                <div className="space-y-1.5"><Label>Type</Label><Input {...register("type")} placeholder="Road / Bridge / Building" /></div>
                <div className="space-y-1.5 col-span-2"><Label>Description</Label><Input {...register("description")} /></div>
              </div>
              <Button type="submit" className="w-full" disabled={createTender.isPending}>
                {createTender.isPending ? "Saving..." : "Save Tender"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-4"><div className="flex items-center gap-3"><FileText className="h-8 w-8 text-primary" /><div><div className="text-2xl font-bold">{stats.total}</div><div className="text-xs text-muted-foreground">Total Tenders</div></div></div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="flex items-center gap-3"><Trophy className="h-8 w-8 text-amber-500" /><div><div className="text-2xl font-bold">{stats.awarded}</div><div className="text-xs text-muted-foreground">Awarded</div></div></div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="flex items-center gap-3"><TrendingUp className="h-8 w-8 text-green-500" /><div><div className="text-2xl font-bold">{stats.successRate}%</div><div className="text-xs text-muted-foreground">Win Rate</div></div></div></CardContent></Card>
          <Card><CardContent className="pt-4"><div><div className="text-xs text-muted-foreground mb-1">Total Bid Value</div><div className="text-xl font-bold">{formatINR(stats.totalBidValue)}</div></div></CardContent></Card>
        </div>
      )}

      <div className="flex justify-end">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="All Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {STAGES.map(s => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />)}</div>
      ) : (
        <div className="space-y-3">
          {tenders.map(tender => (
            <Card key={tender.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-4 pb-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-semibold">{tender.title}</span>
                      <Badge className={`text-xs ${getStatusColor(tender.status)}`}>{tender.status.replace("_", " ")}</Badge>
                      {tender.type && <Badge variant="outline" className="text-xs">{tender.type}</Badge>}
                    </div>
                    <div className="text-sm text-muted-foreground">{tender.client} · {tender.location}</div>
                    <div className="text-xs text-muted-foreground font-mono mt-0.5">{tender.tenderNumber}</div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 md:min-w-[350px]">
                    <div>
                      <div className="text-xs text-muted-foreground">Estimated Value</div>
                      <div className="font-semibold text-sm">{formatINR(tender.estimatedValue)}</div>
                    </div>
                    {tender.bidAmount && (
                      <div>
                        <div className="text-xs text-muted-foreground">Bid Amount</div>
                        <div className="font-semibold text-sm">{formatINR(tender.bidAmount)}</div>
                      </div>
                    )}
                    <div>
                      <div className="text-xs text-muted-foreground">Submission</div>
                      <div className="font-semibold text-sm">{formatDate(tender.submissionDate)}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {tenders.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <div>No tenders found</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
