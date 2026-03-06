import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Search, Users, FileText, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface UserRow {
  id: string;
  full_name: string;
  email: string;
  created_at: string;
  report_count: number;
}

interface ReportRow {
  id: string;
  user_email: string;
  student_name: string;
  alignment_percentage: number;
  previous_curriculum: string;
  target_curriculum: string;
  created_at: string;
  title: string;
}

const AdminPage = () => {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("users");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke("admin-data");
      if (!error && data) {
        setUsers(data.users ?? []);
        setReports(data.reports ?? []);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const q = search.toLowerCase();

  const filteredUsers = users.filter(
    (u) => u.email.toLowerCase().includes(q) || u.full_name.toLowerCase().includes(q)
  );

  const filteredReports = reports.filter(
    (r) =>
      r.user_email.toLowerCase().includes(q) ||
      r.student_name.toLowerCase().includes(q) ||
      r.previous_curriculum.toLowerCase().includes(q) ||
      r.target_curriculum.toLowerCase().includes(q)
  );

  const exportCSV = (rows: Record<string, any>[], filename: string) => {
    if (!rows.length) return;
    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(","),
      ...rows.map((r) =>
        headers.map((h) => `"${String(r[h] ?? "").replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">Manage users and view all reports</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={activeTab === "users" ? "Search by email or name..." : "Search by email, student, or curriculum..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            variant="outline"
            onClick={() =>
              activeTab === "users"
                ? exportCSV(filteredUsers, "globiculum-users")
                : exportCSV(filteredReports, "globiculum-reports")
            }
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="users" className="gap-2">
                <Users className="h-4 w-4" /> Users ({filteredUsers.length})
              </TabsTrigger>
              <TabsTrigger value="reports" className="gap-2">
                <FileText className="h-4 w-4" /> Reports ({filteredReports.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="users">
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead className="text-right">Reports</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                            No users found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredUsers.map((u) => (
                          <TableRow key={u.id}>
                            <TableCell className="font-medium">{u.full_name}</TableCell>
                            <TableCell>{u.email}</TableCell>
                            <TableCell>{format(new Date(u.created_at), "MMM d, yyyy")}</TableCell>
                            <TableCell className="text-right">{u.report_count}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="reports">
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Alignment %</TableHead>
                        <TableHead>Transition</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredReports.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                            No reports found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredReports.map((r) => (
                          <TableRow key={r.id}>
                            <TableCell className="font-medium">{r.student_name}</TableCell>
                            <TableCell>
                              <span className={`font-semibold ${r.alignment_percentage >= 70 ? "text-emerald-600 dark:text-emerald-400" : r.alignment_percentage >= 40 ? "text-amber-600 dark:text-amber-400" : "text-rose-600 dark:text-rose-400"}`}>
                                {r.alignment_percentage}%
                              </span>
                            </TableCell>
                            <TableCell>{r.previous_curriculum} → {r.target_curriculum}</TableCell>
                            <TableCell>{format(new Date(r.created_at), "MMM d, yyyy")}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default AdminPage;
