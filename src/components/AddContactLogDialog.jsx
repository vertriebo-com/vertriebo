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
import MobileSelect from "@/components/MobileSelect";
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";

const TYPES = ["Anruf", "E-Mail", "Besuch", "Termin", "Angebot", "Sonstiges"];
const RESULTS = ["Erreicht", "Nicht erreicht", "Rückruf vereinbart", "Termin vereinbart", "Angebot gesendet", "Abgeschlossen", "Kein Interesse"];

// After these outcomes, a callback date is required
const REQUIRES_CALLBACK = ["Erreicht", "Nicht erreicht", "Rückruf vereinbart"];
// These mark the lead as "done" - no callback needed
const CLOSED_OUTCOMES = ["Abgeschlossen", "Kein Interesse"];

export default function AddContactLogDialog({ open, onClose, companyId, companyName, onCreated }) {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({
    typ: "Anruf",
    ergebnis: "",
    naechster_schritt: "",
    rueckruf_datum: "",
    notiz: "",
    kontakt_person: "",
  });

  const needsCallback = REQUIRES_CALLBACK.includes(form.ergebnis) && !CLOSED_OUTCOMES.includes(form.ergebnis);
  const isClosed = CLOSED_OUTCOMES.includes(form.ergebnis);

  const validate = () => {
    const e = {};
    if (!form.ergebnis) e.ergebnis = "Pflichtfeld: Ergebnis muss gewählt werden";
    if (!form.naechster_schritt.trim()) e.naechster_schritt = "Pflichtfeld: Nächster Schritt muss angegeben werden";
    if (needsCallback && !form.rueckruf_datum) e.rueckruf_datum = "Pflichtfeld: Rückrufdatum muss gesetzt werden";
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) {
      toast.error("Bitte alle Pflichtfelder ausfüllen");
      return;
    }

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

    await base44.entities.ContactLog.create({
      ...form,
      organization_id: orgId,
      company_id: companyId,
      user_email: me.email,
      rueckruf_datum: form.rueckruf_datum ? new Date(form.rueckruf_datum).toISOString() : null,
    });

    // Auto-update company status based on outcome
    const statusMap = {
      "Rückruf vereinbart": "Rückruf",
      "Termin vereinbart": "Termin",
      "Angebot gesendet": "Angebot",
      "Abgeschlossen": "Gewonnen",
      "Kein Interesse": "Verloren",
      "Erreicht": "Kontakt",
      "Nicht erreicht": "Rückruf",
    };
    const newStatus = statusMap[form.ergebnis];
    if (newStatus) {
      await base44.entities.Company.update(companyId, {
        status: newStatus,
        last_contact_date: new Date().toISOString(),
      });
    }

    // Auto-create callback task if needed
    if (needsCallback && form.rueckruf_datum) {
      await base44.entities.Task.create({
        organization_id: orgId,
        company_id: companyId,
        company_name: companyName,
        titel: form.ergebnis === "Rückruf vereinbart"
          ? `Rückruf: ${companyName}`
          : `Nachfassen: ${companyName}`,
        typ: "Rückruf",
        prioritaet: "Hoch",
        faellig_am: new Date(form.rueckruf_datum).toISOString(),
        erledigt: false,
        assigned_to: me.email,
      });
    }

    toast.success("Kontakt dokumentiert");
    setForm({ typ: "Anruf", ergebnis: "", naechster_schritt: "", rueckruf_datum: "", notiz: "", kontakt_person: "" });
    setErrors({});
    setLoading(false);
    onClose();
    onCreated?.();
  };

  const fieldError = (field) => errors[field] ? (
    <p className="text-xs text-destructive flex items-center gap-1 mt-1">
      <AlertCircle className="w-3 h-3" /> {errors[field]}
    </p>
  ) : null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto bg-white border border-slate-200 shadow-xl rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-slate-900 text-base font-bold">Kontakt dokumentieren</DialogTitle>
        </DialogHeader>
        <p className="text-sm font-medium text-slate-600 -mt-1">{companyName}</p>

        {/* Hard Sales Banner */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800 font-medium">
          ⚠️ Alle markierten Felder sind Pflicht – keine Ausnahmen!
        </div>

        <div className="space-y-4">
          <div>
            <Label className="text-xs font-semibold text-slate-700 mb-1.5 block">Kontaktart</Label>
            <MobileSelect
              value={form.typ}
              onValueChange={v => setForm(p => ({ ...p, typ: v }))}
              options={TYPES.map(t => ({ value: t, label: t }))}
              placeholder="Kontaktart"
            />
          </div>

          <div>
            <Label className="text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1 block">
              Ergebnis <span className="text-red-500">*</span>
            </Label>
            <MobileSelect
              value={form.ergebnis}
              onValueChange={v => { setForm(p => ({ ...p, ergebnis: v })); setErrors(p => ({...p, ergebnis: null})); }}
              options={RESULTS.map(r => ({ value: r, label: r }))}
              placeholder="Ergebnis wählen..."
              triggerClassName={errors.ergebnis ? "border-destructive" : ""}
            />
            {fieldError("ergebnis")}
          </div>

          <div>
            <Label className="text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1 block">
              Nächster Schritt <span className="text-red-500">*</span>
            </Label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {["Erneut anrufen", "Angebot senden", "Termin bestätigen", "Kein Interesse – kein Nachfassen", "In 3 Monaten nochmal"].map(v => (
                <button
                  key={v}
                  type="button"
                  onClick={() => { setForm(p => ({ ...p, naechster_schritt: v })); setErrors(p => ({...p, naechster_schritt: null})); }}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    form.naechster_schritt === v
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted text-muted-foreground border-border hover:border-primary/50"
                  }`}
                >{v}</button>
              ))}
            </div>
            <Input
              value={form.naechster_schritt}
              onChange={e => { setForm(p => ({ ...p, naechster_schritt: e.target.value })); setErrors(p => ({...p, naechster_schritt: null})); }}
              placeholder="Oder eigenen Text eingeben..."
              className={errors.naechster_schritt ? "border-destructive" : ""}
            />
            {fieldError("naechster_schritt")}
          </div>

          {!isClosed && (
            <div>
              <Label className="text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1 block">
                Rückruf am {needsCallback && <span className="text-red-500">*</span>}
                {!needsCallback && <span className="text-xs text-slate-400 font-normal">(optional)</span>}
              </Label>
              <Input
                type="datetime-local"
                value={form.rueckruf_datum}
                onChange={e => { setForm(p => ({ ...p, rueckruf_datum: e.target.value })); setErrors(p => ({...p, rueckruf_datum: null})); }}
                className={errors.rueckruf_datum ? "border-destructive" : ""}
              />
              {fieldError("rueckruf_datum")}
            </div>
          )}

          <div>
            <Label className="text-xs font-semibold text-slate-700 mb-1.5 block">Kontaktperson</Label>
            <Input
              value={form.kontakt_person}
              onChange={e => setForm(p => ({ ...p, kontakt_person: e.target.value }))}
              placeholder="Name"
              className="bg-white text-slate-900 border-slate-300 placeholder:text-slate-400"
            />
          </div>

          <div>
            <Label className="text-xs font-semibold text-slate-700 mb-1.5 block">Notiz / Details</Label>
            <Textarea
              value={form.notiz}
              onChange={e => setForm(p => ({ ...p, notiz: e.target.value }))}
              placeholder="Was wurde besprochen?"
              rows={3}
              className="bg-white text-slate-900 border-slate-300 placeholder:text-slate-400 resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={onClose} className="bg-white text-slate-700 border-slate-300 hover:bg-slate-50">Abbrechen</Button>
            <Button onClick={handleSubmit} disabled={loading} className="bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60">
              {loading ? "Speichern..." : "Dokumentieren"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}