import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Building2, Search } from "lucide-react";
import { toast } from "sonner";

export default function LeadAssignmentSection({ users }) {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    base44.entities.Company.list("-created_date", 500)
      .then(setCompanies)
      .finally(() => setLoading(false));
  }, []);

  const handleAssign = async (companyId, email) => {
    await base44.entities.Company.update(companyId, { assigned_to: email === "none" ? null : email });
    setCompanies(prev => prev.map(c => c.id === companyId ? { ...c, assigned_to: email === "none" ? null : email } : c));
    toast.success("Zuweisung gespeichert.");
  };

  const vertriebler = users.filter(u => u.role !== "admin");
  const allAssignable = [...users]; // admins + vertriebler

  const filtered = companies.filter(c =>
    !search || c.name?.toLowerCase().includes(search.toLowerCase()) || c.ort?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="px-5 py-6 text-sm text-muted-foreground">Lädt Leads...</div>;

  return (
    <div className="bg-card border border-border rounded-xl">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">Lead-Zuweisung ({companies.length} Leads)</h3>
        </div>
        <div className="relative w-56">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Firma oder Ort..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
      </div>
      <div className="divide-y divide-border max-h-96 overflow-y-auto">
        {filtered.map(company => (
          <div key={company.id} className="px-5 py-3 flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{company.name}</p>
              <p className="text-xs text-muted-foreground">{company.ort || "—"} · {company.status}</p>
            </div>
            <Select
              value={company.assigned_to || "none"}
              onValueChange={val => handleAssign(company.id, val)}
            >
              <SelectTrigger className="w-44 h-7 text-xs">
                <SelectValue placeholder="Nicht zugewiesen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nicht zugewiesen</SelectItem>
                {allAssignable.map(u => (
                  <SelectItem key={u.id} value={u.email}>
                    {u.full_name || u.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="px-5 py-8 text-center text-sm text-muted-foreground">Keine Leads gefunden.</div>
        )}
      </div>
    </div>
  );
}