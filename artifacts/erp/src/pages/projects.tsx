import { useState } from "react";
import { useListProjects, useCreateProject, useGetProjectStats } from "@workspace/api-client-react";
import { formatINR, getStatusColor } from "@/lib/utils/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { PlusCircle, Search, FolderKanban, TrendingUp, DollarSign } from "lucide-react";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { getListProjectsQueryKey, getGetProjectStatsQueryKey } from "@workspace/api-client-react";

export default function Projects() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: projects = [], isLoading } = useListProjects(statusFilter && statusFilter !== "all" ? { status: statusFilter as "active" } : undefined);
  const { data: stats } = useGetProjectStats();
  const createProject = useCreateProject();
  const { register, handleSubmit, reset } = useForm<{
    name: string; code: string; client: string; location: string;
    budget: number; startDate: string; endDate: string; projectManager: string; description: string;
  }>();

  const filtered = projects.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.client.toLowerCase().includes(search.toLowerCase())
  );

  const onSubmit = async (data: Parameters<typeof createProject.mutateAsync>[0]) => {
    await createProject.mutateAsync({ ...data, budget: Number(data.budget) });
    queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetProjectStatsQueryKey() });
    reset();
    setOpen(false);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage all construction projects</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><PlusCircle className="h-4 w-4" />New Project</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Create New Project</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit(onSubmit as never)} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Project Name</Label><Input {...register("name", { required: true })} placeholder="e.g. NH-48 Expansion" /></div>
                <div className="space-y-1.5"><Label>Project Code</Label><Input {...register("code", { required: true })} placeholder="PRJ-2024-001" /></div>
                <div className="space-y-1.5"><Label>Client</Label><Input {...register("client", { required: true })} /></div>
                <div className="space-y-1.5"><Label>Location</Label><Input {...register("location", { required: true })} /></div>
                <div className="space-y-1.5"><Label>Budget (INR)</Label><Input type="number" {...register("budget", { required: true })} /></div>
                <div className="space-y-1.5"><Label>Project Manager</Label><Input {...register("projectManager", { required: true })} /></div>
                <div className="space-y-1.5"><Label>Start Date</Label><Input type="date" {...register("startDate", { required: true })} /></div>
                <div className="space-y-1.5"><Label>End Date</Label><Input type="date" {...register("endDate", { required: true })} /></div>
              </div>
              <div className="space-y-1.5"><Label>Description</Label><Input {...register("description")} /></div>
              <Button type="submit" className="w-full" disabled={createProject.isPending}>
                {createProject.isPending ? "Creating..." : "Create Project"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-4"><div className="flex items-center gap-3"><FolderKanban className="h-8 w-8 text-primary" /><div><div className="text-2xl font-bold">{stats.byStatus.reduce((s, b) => s + b.count, 0)}</div><div className="text-xs text-muted-foreground">Total Projects</div></div></div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="flex items-center gap-3"><TrendingUp className="h-8 w-8 text-green-500" /><div><div className="text-2xl font-bold">{stats.byStatus.find(b => b.status === "active")?.count ?? 0}</div><div className="text-xs text-muted-foreground">Active</div></div></div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">Total Budget</div><div className="text-xl font-bold">{formatINR(stats.totalBudget)}</div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">Total Spent</div><div className="text-xl font-bold text-orange-600">{formatINR(stats.totalSpent)}</div></CardContent></Card>
        </div>
      )}

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search projects..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="planning">Planning</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="on_hold">On Hold</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid gap-4">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-32 bg-muted rounded-lg animate-pulse" />)}</div>
      ) : (
        <div className="space-y-3">
          {filtered.map(project => (
            <Card key={project.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-4 pb-4">
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-base">{project.name}</span>
                      <Badge className={`text-xs ${getStatusColor(project.status)}`}>{project.status.replace("_", " ")}</Badge>
                      <span className="text-xs text-muted-foreground font-mono">{project.code}</span>
                    </div>
                    <div className="text-sm text-muted-foreground mt-0.5">{project.client} · {project.location}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">PM: {project.projectManager}</div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:min-w-[400px]">
                    <div>
                      <div className="text-xs text-muted-foreground">Budget</div>
                      <div className="font-semibold text-sm">{formatINR(project.budget)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Spent</div>
                      <div className="font-semibold text-sm text-orange-600">{formatINR(project.spent)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Progress {project.progress}%</div>
                      <Progress value={project.progress} className="h-2" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <FolderKanban className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <div>No projects found</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
