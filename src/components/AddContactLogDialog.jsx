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

    await base44.entities.ContactLog.create({
      ...form,
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
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Kontakt dokumentieren</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground -mt-1">{companyName}</p>

        {/* Hard Sales Banner */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800 font-medium">
          ⚠️ Alle markierten Felder sind Pflicht – keine Ausnahmen!
        </div>

        <div className="space-y-4">
          <div>
            <Label>Kontaktart</Label>
            <MobileSelect
              value={form.typ}
              onValueChange={v => setForm(p => ({ ...p, typ: v }))}
              options={TYPES.map(t => ({ value: t, label: t }))}
              placeholder="Kontaktart"
            />
          </div>

          <div>
            <Label className="flex items-center gap-1">
              Ergebnis <span className="text-destructive">*</span>
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
            <Label className="flex items-center gap-1">
              Nächster Schritt <span className="text-destructive">*</span>
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
              <Label className="flex items-center gap-1">
                Rückruf am {needsCallback && <span className="text-destructive">*</span>}
                {!needsCallback && <span className="text-xs text-muted-foreground">(optional)</span>}
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
            <Label>Kontaktperson</Label>
            <Input value={form.kontakt_person} onChange={e => setForm(p => ({ ...p, kontakt_person: e.target.value }))} placeholder="Name" />
          </div>

          <div>
            <Label>Notiz / Details</Label>
            <Textarea value={form.notiz} onChange={e => setForm(p => ({ ...p, notiz: e.target.value }))} placeholder="Was wurde besprochen?" rows={3} />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={onClose}>Abbrechen</Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? "Speichern..." : "Dokumentieren"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}