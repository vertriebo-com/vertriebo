import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Building2, Mail, FileText, Users, CreditCard } from "lucide-react";
import CompanySettings from "@/components/settings/CompanySettings";
import EmailSettings from "@/components/settings/EmailSettings";
import EmailTemplateSettings from "@/components/settings/EmailTemplateSettings";
import UserManagement from "@/components/settings/UserManagement";
import BillingSettings from "@/components/settings/BillingSettings";

const TABS = [
  { id: "company",    label: "Unternehmensprofil", icon: Building2 },
  { id: "email",      label: "E-Mail & Absender",  icon: Mail },
  { id: "templates",  label: "E-Mail-Vorlagen",     icon: FileText },
  { id: "team",       label: "Team & Benutzer",     icon: Users },
  { id: "billing",    label: "Abonnement",          icon: CreditCard },
];

const ADMIN_ONLY_TABS = new Set(["billing"]);

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("company");
  const [org, setOrg] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  const isAdmin = role === "organization_admin" || currentUser?.role === "admin";

  const loadData = async () => {
    setLoading(true);
    const user = await base44.auth.me();
    setCurrentUser(user);

    // Resolve org
    let foundOrg = null;
    let foundRole = null;

    if (user.role === "admin") {
      foundRole = "organization_admin";
    }

    const orgs = await base44.entities.Organization.filter({ owner_email: user.email });
    if (orgs?.[0]) {
      foundOrg = orgs[0];
      foundRole = foundRole || "organization_admin";
    } else {
      const memberships = await base44.entities.OrganizationMember.filter({ user_email: user.email, status: "active" });
      if (memberships?.[0]?.organization_id) {
        const memberOrgs = await base44.entities.Organization.filter({ id: memberships[0].organization_id });
        foundOrg = memberOrgs?.[0] || null;
        foundRole = foundRole || memberships[0].role || "sales_rep";
      }
    }

    setOrg(foundOrg);
    setRole(foundRole);

    // Load users for team tab
    try {
      const allUsers = await base44.entities.User.list();
      setUsers(allUsers);
    } catch (_) {}

    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const visibleTabs = TABS.filter(tab => isAdmin || !ADMIN_ONLY_TABS.has(tab.id));

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Einstellungen</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Verwalten Sie Ihr Unternehmensprofil, E-Mail-Einstellungen und Ihr Team.</p>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 overflow-x-auto border-b border-border pb-0 -mb-px">
        {visibleTabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="pt-1">
        {activeTab === "company"   && <CompanySettings org={org} />}
        {activeTab === "email"     && <EmailSettings org={org} />}
        {activeTab === "templates" && <EmailTemplateSettings />}
        {activeTab === "team"      && (
          <UserManagement
            users={users}
            currentUser={currentUser}
            onRefresh={loadData}
          />
        )}
        {activeTab === "billing"   && isAdmin && <BillingSettings org={org} user={currentUser} />}
      </div>
    </div>
  );
}