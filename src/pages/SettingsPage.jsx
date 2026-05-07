import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

import UserManagement from "@/components/settings/UserManagement";
import CompanySettings from "@/components/settings/CompanySettings";
import LeadGenSettings from "@/components/settings/LeadGenSettings";
import TeamGoals from "@/components/settings/TeamGoals";
import PipelineSettings from "@/components/settings/PipelineSettings";
import NotificationSettings from "@/components/settings/NotificationSettings";
import EmailTemplateSettings from "@/components/settings/EmailTemplateSettings";
import SystemInfo from "@/components/settings/SystemInfo";
import BillingSettings from "@/components/settings/BillingSettings";

const TABS = [
  { key: "billing",       label: "💳 Abonnement" },
  { key: "users",         label: "Benutzer" },
  { key: "company",       label: "Firmendaten" },
  { key: "pipeline",      label: "Pipeline" },
  { key: "goals",         label: "Ziele" },
  { key: "leads",         label: "Lead-Generierung" },
  { key: "notifications", label: "Benachrichtigungen" },
  { key: "emails",        label: "E-Mail-Vorlagen" },
  { key: "system",        label: "System" },
];

export default function SettingsPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentOrg, setCurrentOrg] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("billing");
  const [selfDeleteOpen, setSelfDeleteOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [me, allUsers] = await Promise.all([
      base44.auth.me(),
      base44.entities.User.list("-created_date", 100),
    ]);
    setCurrentUser(me);
    setUsers(allUsers);
    // Org laden für Billing-Tab
    if (me) {
      const orgs = await base44.entities.Organization.filter({ owner_email: me.email });
      let org = orgs?.[0] || null;
      if (!org) {
        const memberships = await base44.entities.OrganizationMember.filter({ user_email: me.email, status: "active" });
        if (memberships?.[0]?.organization_id) {
          const memberOrgs = await base44.entities.Organization.filter({ id: memberships[0].organization_id });
          org = memberOrgs?.[0] || null;
        }
      }
      setCurrentOrg(org);
    }
    setLoading(false);
  };

  const handleSelfDelete = async () => {
    await base44.entities.User.delete(currentUser.id);
    toast.success("Konto wurde gelöscht.");
    base44.auth.logout();
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
      <div>
        <h1 className="text-xl font-bold">Einstellungen</h1>
        <p className="text-sm text-muted-foreground">Admin-Bereich – alle Systemeinstellungen</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-1.5">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "billing" && <BillingSettings org={currentOrg} user={currentUser} />}
      {activeTab === "users" && (
        <UserManagement users={users} currentUser={currentUser} onRefresh={loadData} />
      )}
      {activeTab === "company" && <CompanySettings />}
      {activeTab === "pipeline" && <PipelineSettings />}
      {activeTab === "goals" && <TeamGoals users={users} />}
      {activeTab === "leads" && <LeadGenSettings users={users} />}
      {activeTab === "notifications" && <NotificationSettings users={users} />}
      {activeTab === "emails" && <EmailTemplateSettings />}
      {activeTab === "system" && <SystemInfo />}

      {/* Gefahrenzone */}
      <div className="bg-card border border-destructive/30 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-destructive mb-1">Gefahrenzone</h3>
        <p className="text-sm text-muted-foreground mb-3">
          Dein eigenes Konto dauerhaft löschen. Diese Aktion kann nicht rückgängig gemacht werden.
        </p>
        <Button variant="destructive" size="sm" onClick={() => setSelfDeleteOpen(true)} className="gap-2">
          <Trash2 className="w-4 h-4" /> Mein Konto löschen
        </Button>
      </div>

      <Dialog open={selfDeleteOpen} onOpenChange={setSelfDeleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-4 h-4" /> Konto wirklich löschen?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Dein Konto <span className="font-semibold text-foreground">({currentUser?.email})</span> wird dauerhaft gelöscht.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setSelfDeleteOpen(false)}>Abbrechen</Button>
            <Button variant="destructive" onClick={handleSelfDelete}>Ja, Konto löschen</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}