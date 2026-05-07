import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Upload, FileText, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function Import() {
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const isAdmin = user?.role === "admin" || user?.role === "organization_admin";

  const handleFileUpload = async (e) => {
    if (!isAdmin) { toast.error("Nur Admins dürfen Importe ausführen."); return; }
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setResults(null);

    const { file_url } = await base44.integrations.Core.UploadFile({ file });

    const extracted = await base44.integrations.Core.ExtractDataFromUploadedFile({
      file_url,
      json_schema: {
        type: "object",
        properties: {
          companies: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                branche: { type: "string" },
                adresse: { type: "string" },
                plz: { type: "string" },
                ort: { type: "string" },
                telefon: { type: "string" },
                email: { type: "string" },
                website: { type: "string" },
                ansprechpartner: { type: "string" },
              },
            },
          },
        },
      },
    });

    if (extracted.status === "error") {
      toast.error("Fehler beim Verarbeiten: " + extracted.details);
      setImporting(false);
      return;
    }

    const companies = extracted.output?.companies || [];
    let imported = 0;
    let duplicates = 0;
    let blacklisted = 0;

    const me = await base44.auth.me();
    let org = null;
    const orgs = await base44.entities.Organization.filter({ owner_email: me.email });
    org = orgs?.[0] || null;
    if (!org) {
      const memberships = await base44.entities.OrganizationMember.filter({ user_email: me.email, status: "active" });
      if (memberships?.[0]?.organization_id) {
        const memberOrgs = await base44.entities.Organization.filter({ id: memberships[0].organization_id });
        org = memberOrgs?.[0] || null;
      }
    }
    if (!org) { toast.error("Keine Organisation gefunden."); setImporting(false); return; }

    const [existingCompanies, blacklistEntries] = await Promise.all([
      base44.entities.Company.filter({ organization_id: org.id }, "-created_date", 1000),
      base44.entities.Blacklist.filter({ organization_id: org.id }, "-created_date", 500),
    ]);

    const existingNames = new Set(existingCompanies.map(c => c.name?.toLowerCase()));
    const blacklistNames = new Set(blacklistEntries.map(b => b.firmenname?.toLowerCase()));

    for (const company of companies) {
      if (!company.name) continue;
      const nameL = company.name.toLowerCase();

      if (existingNames.has(nameL)) {
        duplicates++;
        continue;
      }
      if (blacklistNames.has(nameL)) {
        blacklisted++;
        continue;
      }

      await base44.entities.Company.create({
        ...company,
        organization_id: org.id,
        status: "Neu",
        quelle: "CSV Import",
        assigned_to: me.email,
      });
      existingNames.add(nameL);
      imported++;
    }

    setResults({ total: companies.length, imported, duplicates, blacklisted });
    toast.success(`${imported} Firmen importiert`);
    setImporting(false);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="mb-2">
        <h1 className="text-3xl font-bold text-foreground">CSV Import</h1>
        <p className="text-sm text-slate-600 font-medium mt-2">Kontakte aus CSV oder Excel importieren</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Upload className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">Datei hochladen</h3>
          <p className="text-sm text-slate-600 mb-6 font-medium">
            CSV oder Excel mit Spalten: Name, Branche, Adresse, PLZ, Ort, Telefon, E-Mail, Website, Ansprechpartner
          </p>
          <label className="inline-block">
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileUpload}
              className="hidden"
              disabled={importing}
            />
            <Button asChild disabled={importing}>
              <span className="cursor-pointer gap-2">
                <FileText className="w-4 h-4" />
                {importing ? "Wird importiert..." : "Datei auswählen"}
              </span>
            </Button>
          </label>
        </div>
      </div>

      {results && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Import-Ergebnis</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-medium text-foreground">Gesamt: {results.total}</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span className="text-sm font-medium text-foreground">Importiert: {results.imported}</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-medium text-foreground">Dubletten: {results.duplicates}</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <span className="text-sm font-medium text-foreground">Blacklisted: {results.blacklisted}</span>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-foreground mb-2">Hinweise</h3>
        <ul className="text-xs text-slate-600 space-y-1 list-disc list-inside font-medium">
          <li>Dubletten werden automatisch erkannt und übersprungen</li>
          <li>Firmen auf der Blacklist werden nicht importiert</li>
          <li>Die erste Zeile wird als Kopfzeile interpretiert</li>
          <li>Mindestens der Firmenname muss vorhanden sein</li>
        </ul>
      </div>
    </div>
  );
}