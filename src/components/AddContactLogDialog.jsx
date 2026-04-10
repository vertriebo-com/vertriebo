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
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const TYPES = ["Anruf", "E-Mail", "Besuch", "Termin", "Angebot", "Sonstiges"];
const RESULTS = ["Erreicht", "Nicht erreicht", "Rückruf vereinbart", "Termin vereinbart", "Angebot gesendet", "Abgeschlossen", "Kein Interesse"];

export default function AddContactLogDialog({ open, onClose, companyId, companyName, onCreated }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ typ: "Anruf", ergebnis: "", notiz: "", kontakt_person: "" });

  const handleSubmit = async () => {
    if (!form.typ) { toast.error("Bitte Kontaktart wählen"); return; }
    setLoading(true);
    const me = await base44.auth.me();
    await base44.entities.ContactLog.create({
      ...form,
      company_id: companyId,
      user_email: me.email,
    });
    toast.success("Kontakt dokumentiert");
    setForm({ typ: "Anruf", ergebnis: "", notiz: "", kontakt_person: "" });
    setLoading(false);
    onClose();
    onCreated?.();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Kontakt dokumentieren</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{companyName}</p>
        <div className="space-y-4 mt-2">
          <div>
            <Label>Kontaktart *</Label>
            <Select value={form.typ} onValueChange={v => setForm(p => ({ ...p, typ: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Ergebnis</Label>
            <Select value={form.ergebnis} onValueChange={v => setForm(p => ({ ...p, ergebnis: v }))}>
              <SelectTrigger><SelectValue placeholder="Ergebnis wählen" /></SelectTrigger>
              <SelectContent>
                {RESULTS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Kontaktperson</Label>
            <Input value={form.kontakt_person} onChange={e => setForm(p => ({ ...p, kontakt_person: e.target.value }))} placeholder="Name" />
          </div>
          <div>
            <Label>Notiz</Label>
            <Textarea value={form.notiz} onChange={e => setForm(p => ({ ...p, notiz: e.target.value }))} placeholder="Details zum Kontakt..." rows={3} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Abbrechen</Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? "Speichern..." : "Speichern"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}