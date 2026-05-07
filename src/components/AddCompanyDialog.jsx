import { useState } from "react";
import { base44 } from "@/api/base44Client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const EMPTY_FORM = {
  name: "", branche: "", adresse: "", plz: "", ort: "",
  telefon: "", email: "", website: "", ansprechpartner: "",
  notizen: "", status: "Neu", quelle: "Manuell",
};

export default function AddCompanyDialog({ open, onClose, onCreated }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [duplicateWarning, setDuplicateWarning] = useState("");

  const handleChange = async (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (field === "name" && value.trim().length >= 3) {
      const existing = await base44.entities.Company.filter({ name: value.trim() });
      setDuplicateWarning(existing.length > 0 ? `⚠️ "${value.trim()}" existiert bereits!` : "");
    } else if (field === "name") {
      setDuplicateWarning("");
    }
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.error("Bitte Firmennamen eingeben");
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
    if (!orgId) { toast.error("Keine Organisation gefunden."); setLoading(false); return; }

    // Dublettencheck (nur innerhalb der Org)
    const existing = await base44.entities.Company.filter({ organization_id: orgId, name: form.name.trim() });
    if (existing.length > 0) {
      toast.error("Diese Firma existiert bereits!");
      setLoading(false);
      return;
    }

    // Blacklist check (nur innerhalb der Org)
    const blacklisted = await base44.entities.Blacklist.filter({ organization_id: orgId, firmenname: form.name.trim() });
    if (blacklisted.length > 0) {
      toast.error("Diese Firma ist auf der Blacklist!");
      setLoading(false);
      return;
    }

    await base44.entities.Company.create({ ...form, organization_id: orgId, assigned_to: me.email });

    toast.success("Firma erstellt");
    setForm(EMPTY_FORM);
    setDuplicateWarning("");
    setLoading(false);
    onClose();
    onCreated?.();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Neue Firma anlegen</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <Label>Firmenname *</Label>
            <Input
              value={form.name}
              onChange={e => handleChange("name", e.target.value)}
              placeholder="Firma GmbH"
              className={duplicateWarning ? "border-red-400" : ""}
            />
            {duplicateWarning && <p className="text-xs text-red-600 mt-1">{duplicateWarning}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Branche</Label>
              <Input value={form.branche} onChange={e => handleChange("branche", e.target.value)} placeholder="z.B. Einzelhandel" />
            </div>
            <div>
              <Label>Ansprechpartner</Label>
              <Input value={form.ansprechpartner} onChange={e => handleChange("ansprechpartner", e.target.value)} placeholder="Max Mustermann" />
            </div>
          </div>
          <div>
            <Label>Adresse</Label>
            <Input value={form.adresse} onChange={e => handleChange("adresse", e.target.value)} placeholder="Musterstr. 1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>PLZ</Label>
              <Input value={form.plz} onChange={e => handleChange("plz", e.target.value)} placeholder="56564" />
            </div>
            <div>
              <Label>Ort</Label>
              <Input value={form.ort} onChange={e => handleChange("ort", e.target.value)} placeholder="Neuwied" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Telefon</Label>
              <Input value={form.telefon} onChange={e => handleChange("telefon", e.target.value)} placeholder="+49 2631 ..." />
            </div>
            <div>
              <Label>E-Mail</Label>
              <Input value={form.email} onChange={e => handleChange("email", e.target.value)} placeholder="info@firma.de" />
            </div>
          </div>
          <div>
            <Label>Website</Label>
            <Input value={form.website} onChange={e => handleChange("website", e.target.value)} placeholder="www.firma.de" />
          </div>
          <div>
            <Label>Notizen</Label>
            <Textarea value={form.notizen} onChange={e => handleChange("notizen", e.target.value)} placeholder="Anmerkungen..." rows={3} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Abbrechen</Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? "Wird erstellt..." : "Erstellen"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}