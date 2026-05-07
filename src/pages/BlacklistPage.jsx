import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Ban, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function BlacklistPage() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [orgId, setOrgId] = useState(null);
  const [form, setForm] = useState({ firmenname: "", grund: "", telefon: "", email: "" });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const user = await base44.auth.me();
    let org = null;
    const orgs = await base44.entities.Organization.filter({ owner_email: user.email });
    org = orgs?.[0] || null;
    if (!org) {
      const memberships = await base44.entities.OrganizationMember.filter({ user_email: user.email, status: "active" });
      if (memberships?.[0]?.organization_id) {
        const memberOrgs = await base44.entities.Organization.filter({ id: memberships[0].organization_id });
        org = memberOrgs?.[0] || null;
      }
    }
    if (!org) { setLoading(false); return; }
    // Store orgId for handleAdd
    setOrgId(org.id);
    const data = await base44.entities.Blacklist.filter({ organization_id: org.id }, "-created_date", 200);
    setEntries(data);
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!form.firmenname.trim()) { toast.error("Firmenname fehlt"); return; }
    // Nur Admins dürfen Blacklist-Einträge erstellen
    const me = await base44.auth.me();
    if (me.role !== "admin" && me.role !== "organization_admin") {
      toast.error("Nur Admins dürfen Einträge zur Blacklist hinzufügen.");
      return;
    }
    await base44.entities.Blacklist.create({ ...form, organization_id: orgId });
    toast.success("Zur Blacklist hinzugefügt");
    setForm({ firmenname: "", grund: "", telefon: "", email: "" });
    setShowAdd(false);
    loadData();
  };

  const handleRemove = async (id) => {
    // Nur Admins dürfen Blacklist-Einträge löschen
    const me = await base44.auth.me();
    if (me.role !== "admin" && me.role !== "organization_admin") {
      toast.error("Nur Admins dürfen Einträge von der Blacklist entfernen.");
      return;
    }
    await base44.entities.Blacklist.delete(id);
    toast.success("Von Blacklist entfernt");
    loadData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Blacklist</h1>
          <p className="text-sm text-muted-foreground">{entries.length} Einträge</p>
        </div>
        <Button onClick={() => setShowAdd(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Hinzufügen
        </Button>
      </div>

      <div className="space-y-2">
        {entries.map(entry => (
          <div key={entry.id} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{entry.firmenname}</p>
              {entry.grund && <p className="text-xs text-muted-foreground">Grund: {entry.grund}</p>}
              <div className="flex gap-4 mt-1">
                {entry.telefon && <span className="text-xs text-muted-foreground">{entry.telefon}</span>}
                {entry.email && <span className="text-xs text-muted-foreground">{entry.email}</span>}
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => handleRemove(entry.id)} className="text-destructive hover:text-destructive">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
        {entries.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Ban className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Keine Einträge auf der Blacklist</p>
          </div>
        )}
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Zur Blacklist hinzufügen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Firmenname *</Label>
              <Input value={form.firmenname} onChange={e => setForm(p => ({ ...p, firmenname: e.target.value }))} />
            </div>
            <div>
              <Label>Grund</Label>
              <Input value={form.grund} onChange={e => setForm(p => ({ ...p, grund: e.target.value }))} placeholder="z.B. Kein Interesse" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Telefon</Label>
                <Input value={form.telefon} onChange={e => setForm(p => ({ ...p, telefon: e.target.value }))} />
              </div>
              <div>
                <Label>E-Mail</Label>
                <Input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAdd(false)}>Abbrechen</Button>
              <Button onClick={handleAdd}>Hinzufügen</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}