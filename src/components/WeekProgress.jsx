import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Flame, ChevronRight, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function WeekProgress({ user }) {
  const [batch, setBatch] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId] = useState(null);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    // Org-ID ermitteln
    let currentOrgId = orgId;
    if (!currentOrgId) {
      const orgs = await base44.entities.Organization.filter({ owner_email: user.email });
      let org = orgs?.[0] || null;
      if (!org) {
        const memberships = await base44.entities.OrganizationMember.filter({ user_email: user.email, status: "active" });
        if (memberships?.[0]?.organization_id) {
          const memberOrgs = await base44.entities.Organization.filter({ id: memberships[0].organization_id });
          org = memberOrgs?.[0] || null;
        }
      }
      if (!org) { setLoading(false); return; }
      currentOrgId = org.id;
      setOrgId(currentOrgId);
    }

    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const days = Math.floor((now - startOfYear) / (24 * 60 * 60 * 1000));
    const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);

    const [batches, comps] = await Promise.all([
      base44.entities.WeeklyBatch.filter({ organization_id: currentOrgId, kalenderwoche: weekNumber, jahr: now.getFullYear() }),
      base44.entities.Company.filter({ organization_id: currentOrgId }, "-created_date", 500),
    ]);

    const currentBatch = batches[0] || null;
    setBatch(currentBatch);

    if (currentBatch) {
      const batchComps = comps.filter(c => c.weekly_batch_id === currentBatch.id);
      setCompanies(batchComps);
    } else {
      setCompanies([]);
    }
    setLoading(false);
  };

  const handleGenerate = async () => {
    if (!canGenerate) {
      toast.error("Bearbeite zuerst die offenen Leads der aktuellen Woche!");
      return;
    }
    setGenerating(true);
    const res = await base44.functions.invoke("generateLeads", { count: 25, assign_to: user?.email });
    if (res.data?.success) {
      toast.success(`${res.data.created} neue Leads aus Google Places generiert!`);
      loadData();
    } else {
      toast.error(res.data?.error || "Fehler beim Generieren");
    }
    setGenerating(false);
  };

  if (loading) return null;

  const total = companies.length;
  const processed = companies.filter(c => !["Neu"].includes(c.status)).length;
  const won = companies.filter(c => c.status === "Gewonnen").length;
  const progress = total > 0 ? Math.round((processed / total) * 100) : 0;

  const isAdmin = user?.role === "admin";
  // Admins jederzeit, Vertriebler ab 80% Bearbeitung
  const allDone = total > 0 && processed / total >= 0.8;
  const canGenerate = isAdmin || !batch || allDone;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-orange-500" />
          <h2 className="text-sm font-semibold">Wochenfortschritt</h2>
        </div>
        {(isAdmin || canGenerate) && (
          <Button
            size="sm"
            onClick={handleGenerate}
            disabled={generating}
            className="text-xs gap-1"
          >
            {generating ? "Generiert..." : "25 neue Leads"}
          </Button>
        )}
      </div>

      <div className="px-5 py-4">
        {!batch ? (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-3">Noch keine Leads diese Woche</p>
            {isAdmin && (
              <Button size="sm" onClick={handleGenerate} disabled={generating}>
                {generating ? "Generiert..." : "Jetzt 25 Leads laden"}
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">KW {batch.kalenderwoche}</span>
              <span className="font-semibold">{processed}/{total} bearbeitet</span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-muted rounded-full h-2.5">
              <div
                className={`h-2.5 rounded-full transition-all ${
                  progress >= 80 ? "bg-emerald-500" : progress >= 50 ? "bg-amber-500" : "bg-primary"
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{progress}% bearbeitet</span>
              <span className="text-emerald-600 font-medium">{won} gewonnen</span>
            </div>

            {!canGenerate && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800">
                🔒 Neue Leads werden freigeschaltet sobald 80% der aktuellen Leads bearbeitet sind.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}