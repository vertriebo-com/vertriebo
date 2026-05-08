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
      <DialogContent className="max-w-md bg-white border border-slate-200 shadow-xl rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-slate-900 text-base font-bold">Neue Aufgabe</DialogTitle>
        </DialogHeader>
        <p className="text-sm font-medium text-slate-600 -mt-1">{companyName}</p>
        <div className="space-y-4 mt-2">
          <div>
            <Label className="text-xs font-semibold text-slate-700 mb-1.5 block">Titel *</Label>
            <Input
              value={form.titel}
              onChange={e => setForm(p => ({ ...p, titel: e.target.value }))}
              placeholder="z.B. Rückruf nächste Woche"
              className="bg-white text-slate-900 border-slate-300 placeholder:text-slate-400 focus:border-blue-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold text-slate-700 mb-1.5 block">Typ</Label>
              <Select value={form.typ} onValueChange={v => setForm(p => ({ ...p, typ: v }))}>
                <SelectTrigger className="bg-white text-slate-900 border-slate-300"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-white">
                  {TYPES.map(t => <SelectItem key={t} value={t} className="text-slate-900">{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold text-slate-700 mb-1.5 block">Priorität</Label>
              <Select value={form.prioritaet} onValueChange={v => setForm(p => ({ ...p, prioritaet: v }))}>
                <SelectTrigger className="bg-white text-slate-900 border-slate-300"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-white">
                  {PRIORITIES.map(p => <SelectItem key={p} value={p} className="text-slate-900">{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs font-semibold text-slate-700 mb-1.5 block">Fällig am</Label>
            <Input
              type="datetime-local"
              value={form.faellig_am}
              onChange={e => setForm(p => ({ ...p, faellig_am: e.target.value }))}
              className="bg-white text-slate-900 border-slate-300"
            />
          </div>
          <div>
            <Label className="text-xs font-semibold text-slate-700 mb-1.5 block">Beschreibung</Label>
            <Textarea
              value={form.beschreibung}
              onChange={e => setForm(p => ({ ...p, beschreibung: e.target.value }))}
              rows={2}
              placeholder="Optional: Details zur Aufgabe..."
              className="bg-white text-slate-900 border-slate-300 placeholder:text-slate-400 resize-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={onClose} className="bg-white text-slate-700 border-slate-300 hover:bg-slate-50">Abbrechen</Button>
            <Button onClick={handleSubmit} disabled={loading} className="bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60">
              {loading ? "Speichern..." : "Erstellen"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}