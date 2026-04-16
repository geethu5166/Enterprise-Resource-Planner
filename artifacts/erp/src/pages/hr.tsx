import { useState } from "react";
import { useListEmployees, useCreateEmployee, useGetHRSummary } from "@workspace/api-client-react";
import { formatINR, getStatusColor } from "@/lib/utils/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PlusCircle, Search, Users, IndianRupee } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { getListEmployeesQueryKey, getGetHRSummaryQueryKey } from "@workspace/api-client-react";

const DEPARTMENTS = ["Projects", "Finance", "Procurement", "HR", "Engineering", "Operations", "Admin"];

export default function HR() {
  const [deptFilter, setDeptFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: employees = [], isLoading } = useListEmployees(deptFilter && deptFilter !== "all" ? { department: deptFilter } : undefined);
  const { data: summary } = useGetHRSummary();
  const createEmployee = useCreateEmployee();
  const { register, handleSubmit, control, reset } = useForm<{
    name: string; designation: string; department: string;
    phone: string; email: string; joinDate: string; salary: number;
  }>();

  const filtered = employees.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.designation.toLowerCase().includes(search.toLowerCase())
  );

  const onSubmit = async (data: Parameters<typeof createEmployee.mutateAsync>[0]) => {
    await createEmployee.mutateAsync({ ...data, salary: Number(data.salary), skills: [] });
    queryClient.invalidateQueries({ queryKey: getListEmployeesQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetHRSummaryQueryKey() });
    reset();
    setOpen(false);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Human Resources</h1>
          <p className="text-muted-foreground text-sm mt-1">Employee directory and workforce management</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><PlusCircle className="h-4 w-4" />Add Employee</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Employee</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit(onSubmit as never)} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5 col-span-2"><Label>Full Name</Label><Input {...register("name", { required: true })} /></div>
                <div className="space-y-1.5"><Label>Designation</Label><Input {...register("designation", { required: true })} /></div>
                <div className="space-y-1.5">
                  <Label>Department</Label>
                  <Controller name="department" control={control} rules={{ required: true }} render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                    </Select>
                  )} />
                </div>
                <div className="space-y-1.5"><Label>Phone</Label><Input {...register("phone", { required: true })} /></div>
                <div className="space-y-1.5"><Label>Email</Label><Input type="email" {...register("email")} /></div>
                <div className="space-y-1.5"><Label>Join Date</Label><Input type="date" {...register("joinDate", { required: true })} /></div>
                <div className="space-y-1.5"><Label>Monthly Salary (INR)</Label><Input type="number" {...register("salary", { required: true })} /></div>
              </div>
              <Button type="submit" className="w-full" disabled={createEmployee.isPending}>
                {createEmployee.isPending ? "Adding..." : "Add Employee"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-4"><div className="flex items-center gap-3"><Users className="h-8 w-8 text-primary" /><div><div className="text-2xl font-bold">{summary.totalEmployees}</div><div className="text-xs text-muted-foreground">Total Employees</div></div></div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="flex items-center gap-3"><div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center"><span className="text-green-600 font-bold text-sm">{summary.activeCount}</span></div><div><div className="text-2xl font-bold">{summary.activeCount}</div><div className="text-xs text-muted-foreground">Active</div></div></div></CardContent></Card>
          <Card><CardContent className="pt-4"><div><div className="text-xs text-muted-foreground mb-1">Monthly Payroll</div><div className="text-xl font-bold">{formatINR(summary.totalPayroll)}</div></div></CardContent></Card>
          <Card><CardContent className="pt-4"><div><div className="text-xs text-muted-foreground mb-1">Departments</div><div className="text-xl font-bold">{summary.byDepartment.length}</div></div></CardContent></Card>
        </div>
      )}

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search employees..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={deptFilter} onValueChange={setDeptFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All Departments" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50"><tr>
            <th className="text-left px-4 py-2.5 font-medium">Employee ID</th>
            <th className="text-left px-4 py-2.5 font-medium">Name</th>
            <th className="text-left px-4 py-2.5 font-medium">Designation</th>
            <th className="text-left px-4 py-2.5 font-medium">Department</th>
            <th className="text-left px-4 py-2.5 font-medium">Phone</th>
            <th className="text-left px-4 py-2.5 font-medium">Status</th>
            <th className="text-right px-4 py-2.5 font-medium">Salary</th>
          </tr></thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Loading...</td></tr>
            ) : filtered.map(emp => (
              <tr key={emp.id} className="hover:bg-muted/30">
                <td className="px-4 py-2.5 font-mono text-xs">{emp.employeeId}</td>
                <td className="px-4 py-2.5 font-medium">{emp.name}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{emp.designation}</td>
                <td className="px-4 py-2.5"><Badge variant="outline" className="text-xs">{emp.department}</Badge></td>
                <td className="px-4 py-2.5 text-muted-foreground">{emp.phone}</td>
                <td className="px-4 py-2.5"><Badge className={`text-xs ${getStatusColor(emp.status)}`}>{emp.status}</Badge></td>
                <td className="px-4 py-2.5 text-right font-medium">{formatINR(emp.salary)}</td>
              </tr>
            ))}
            {filtered.length === 0 && !isLoading && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No employees found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
