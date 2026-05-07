import { useState } from "react";
import { base44 } from "@/api/base44Client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const TYPES = ["Rückruf", "Termin", "Angebot erstellen", "Nachfassen", "Sonstiges"];
const PRIORITIES = ["Hoch", "Mittel", "Niedrig"];

export default function AddTaskDialog({ open, onClose, companyId, companyName, onCreated }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    titel: "",
    beschreibung: "",
    typ: "Rückruf",
    prioritaet: "Mittel",
    faellig_am: "",
  });

  const handleSubmit = async () => {
    if (!form.titel.trim()) { toast.error("Bitte Titel eingeben"); return; }
    setLoading(true);
    const me = await base44.auth.me();

    // Org-ID ermitteln
    let orgId = null;
    const orgs = await base44.entities.Organization.filter({ owner_email: me.email });
    let org = orgs?.[0] || null;
    if (!org) {
      const memberships = await base44.entities.OrganizationMember.filter({ user_email: me.email, status: "active" });
      if (memberships?.[0]?.organization_id) {
        const memberOrgs = await base44.entities.Organization.filter({ id: memberships[0].organization_id });
        org = memberOrgs?.[0] || null;
      }
    }
    orgId = org?.id || null;

    await base44.entities.Task.create({
      ...form,
      organization_id: orgId,
      company_id: companyId,
      company_name: companyName,
      assigned_to: me.email,
      faellig_am: form.faellig_am ? new Date(form.faellig_am).toISOString() : null,
    });
    toast.success("Aufgabe erstellt");
    setForm({ titel: "", beschreibung: "", typ: "Rückruf", prioritaet: "Mittel", faellig_am: "" });
    setLoading(false);
    onClose();
    onCreated?.();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Neue Aufgabe</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{companyName}</p>
        <div className="space-y-4 mt-2">
          <div>
            <Label>Titel *</Label>
            <Input value={form.titel} onChange={e => setForm(p => ({ ...p, titel: e.target.value }))} placeholder="z.B. Rückruf nächste Woche" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Typ</Label>
              <Select value={form.typ} onValueChange={v => setForm(p => ({ ...p, typ: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Priorität</Label>
              <Select value={form.prioritaet} onValueChange={v => setForm(p => ({ ...p, prioritaet: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Fällig am</Label>
            <Input type="datetime-local" value={form.faellig_am} onChange={e => setForm(p => ({ ...p, faellig_am: e.target.value }))} />
          </div>
          <div>
            <Label>Beschreibung</Label>
            <Textarea value={form.beschreibung} onChange={e => setForm(p => ({ ...p, beschreibung: e.target.value }))} rows={2} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Abbrechen</Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? "Speichern..." : "Erstellen"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}