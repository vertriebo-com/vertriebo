import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

import UserManagement from "@/components/settings/UserManagement";
import CompanySettings from "@/components/settings/CompanySettings";
import EmailSettings from "@/components/settings/EmailSettings";
import EmailTemplateSettings from "@/components/settings/EmailTemplateSettings";
import LeadGenSettings from "@/components/settings/LeadGenSettings";
import TeamGoals from "@/components/settings/TeamGoals";
import PipelineSettings from "@/components/settings/PipelineSettings";
import NotificationSettings from "@/components/settings/NotificationSettings";
import SystemInfo from "@/components/settings/SystemInfo";
import BillingSettings from "@/components/settings/BillingSettings";

// Tabs per role: organization_admin sees all, sales_rep sees limited
const ADMIN_TABS = [
  { key: "company",       label: "🏢 Unternehmensprofil" },
  { key: "email",         label: "✉️ E-Mail & Absender" },
  { key: "templates",     label: "📝 E-Mail-Vorlagen" },
  { key: "users",         label: "👥 Team & Benutzer" },
  { key: "billing",       label: "💳 Abonnement" },
  { key: "leads",         label: "🔍 Lead-Generierung" },
  { key: "pipeline",      label: "Pipeline" },
  { key: "goals",         label: "Ziele" },
  { key: "notifications", label: "Benachrichtigungen" },
  { key: "system",        label: "System" },
];

const SALES_TABS = [
  { key: "notifications", label: "Benachrichtigungen" },
];

export default function SettingsPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentOrg, setCurrentOrg] = useState(null);
  const [memberRole, setMemberRole] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("company");
  const [selfDeleteOpen, setSelfDeleteOpen] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [me, allUsers] = await Promise.all([
      base44.auth.me(),
      base44.entities.User.list("-created_date", 100),
    ]);
    setCurrentUser(me);
    setUsers(allUsers);

    if (me) {
      // Find org by owner or membership
      const orgs = await base44.entities.Organization.filter({ owner_email: me.email });
      let org = orgs?.[0] || null;
      let role = null;

      if (!org) {
        const memberships = await base44.entities.OrganizationMember.filter({ user_email: me.email, status: "active" });
        if (memberships?.[0]?.organization_id) {
          const memberOrgs = await base44.entities.Organization.filter({ id: memberships[0].organization_id });
          org = memberOrgs?.[0] || null;
          role = memberships[0].role;
        }
      } else {
        // Owner is always org admin
        role = "organization_admin";
      }

      setCurrentOrg(org);
      setMemberRole(role || "sales_rep");

      // Default tab: billing for admin, notifications for sales_rep
      if (role === "organization_admin" || !role) {
        setActiveTab("company");
      } else {
        setActiveTab("notifications");
      }
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
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isAdmin = memberRole === "organization_admin";
  const tabs = isAdmin ? ADMIN_TABS : SALES_TABS;

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold">Einstellungen</h1>
        <p className="text-sm text-muted-foreground">
          {isAdmin ? "Administrations-Bereich – alle Systemeinstellungen" : "Ihre persönlichen Einstellungen"}
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-1.5">
        {tabs.map(tab => (
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

      {/* Tab Content */}
      {activeTab === "company"       && <CompanySettings org={currentOrg} />}
      {activeTab === "email"         && <EmailSettings org={currentOrg} />}
      {activeTab === "templates"     && <EmailTemplateSettings />}
      {activeTab === "users"         && <UserManagement users={users} currentUser={currentUser} onRefresh={loadData} />}
      {activeTab === "billing"       && <BillingSettings org={currentOrg} user={currentUser} />}
      {activeTab === "leads"         && <LeadGenSettings users={users} />}
      {activeTab === "pipeline"      && <PipelineSettings />}
      {activeTab === "goals"         && <TeamGoals users={users} />}
      {activeTab === "notifications" && <NotificationSettings users={users} />}
      {activeTab === "system"        && <SystemInfo />}

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