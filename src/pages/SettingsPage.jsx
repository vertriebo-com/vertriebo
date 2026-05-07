import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Building2, Mail, FileText, Users, CreditCard, Info, User } from "lucide-react";
import CompanySettings from "@/components/settings/CompanySettings";
import EmailSettings from "@/components/settings/EmailSettings";
import EmailTemplateSettings from "@/components/settings/EmailTemplateSettings";
import UserManagement from "@/components/settings/UserManagement";
import BillingSettings from "@/components/settings/BillingSettings";

// ─── Tab-Struktur ─────────────────────────────────────────────────────────────
// adminOnly: true → nur organization_admin sieht den Tab
const TAB_GROUPS = [
  {
    label: "Firma",
    tabs: [
      { id: "company",   label: "Unternehmensprofil", icon: Building2, adminOnly: true },
    ],
  },
  {
    label: "Kommunikation",
    tabs: [
      { id: "email",     label: "Absender & Signatur",  icon: Mail,     adminOnly: true },
      { id: "templates", label: "E-Mail-Vorlagen",       icon: FileText, adminOnly: true },
    ],
  },
  {
    label: "Team",
    tabs: [
      { id: "team",      label: "Benutzer & Rollen",    icon: Users,    adminOnly: true },
    ],
  },
  {
    label: "Abonnement",
    tabs: [
      { id: "billing",   label: "Plan & Verbrauch",     icon: CreditCard, adminOnly: true },
    ],
  },
];

// sales_rep only tab
const SALES_REP_TABS = [
  { id: "profile", label: "Mein Profil", icon: User, adminOnly: false },
];

// Spinner helper
const Spinner = () => (
  <div className="flex items-center justify-center h-64">
    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
  </div>
);

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState(null);
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

    let foundOrg = null;
    let foundRole = null;

    if (user.role === "admin") foundRole = "organization_admin";

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

    try {
      const allUsers = await base44.entities.User.list();
      setUsers(allUsers);
    } catch (_) {}

    // Set default tab based on role
    const adminDefault = "company";
    const salesRepDefault = "profile";
    const resolvedRole = foundRole || "sales_rep";
    setActiveTab(resolvedRole === "organization_admin" || user.role === "admin" ? adminDefault : salesRepDefault);

    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  if (loading) return <Spinner />;

  // Build visible tabs
  const allAdminTabs = TAB_GROUPS.flatMap(g => g.tabs);
  const visibleTabs = isAdmin ? allAdminTabs : SALES_REP_TABS;
  const visibleGroups = isAdmin
    ? TAB_GROUPS
    : [{ label: "Profil", tabs: SALES_REP_TABS }];

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Einstellungen</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {isAdmin
            ? "Verwalten Sie Ihr Unternehmensprofil, E-Mail-Einstellungen und Ihr Team."
            : "Verwalten Sie Ihr persönliches Profil."}
        </p>
      </div>

      {/* Tab Bar mit Gruppen-Labels */}
      <div className="border-b border-border">
        {isAdmin ? (
          <div className="flex gap-0 overflow-x-auto">
            {visibleGroups.map((group, gi) => (
              <div key={gi} className="flex items-end">
                {gi > 0 && <div className="w-px h-6 bg-border self-end mb-0.5 mx-1" />}
                <div className="flex flex-col">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide px-1 mb-1">{group.label}</span>
                  <div className="flex">
                    {group.tabs.map(tab => {
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
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex gap-1">
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
        )}
      </div>

      {/* Tab Content */}
      <div className="pt-1">
        {/* Admin Tabs */}
        {activeTab === "company"   && isAdmin && <CompanySettings org={org} />}
        {activeTab === "email"     && isAdmin && <EmailSettings org={org} />}
        {activeTab === "templates" && isAdmin && <EmailTemplateSettings />}
        {activeTab === "team"      && isAdmin && (
          <UserManagement users={users} currentUser={currentUser} onRefresh={loadData} />
        )}
        {activeTab === "billing"   && isAdmin && <BillingSettings org={org} user={currentUser} />}

        {/* Sales Rep: Mein Profil */}
        {activeTab === "profile" && (
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-sm font-semibold mb-1">Mein Konto</h3>
              <p className="text-sm text-muted-foreground mb-3">Ihre persönlichen Kontodaten.</p>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground w-24 shrink-0">Name:</span>
                  <span className="font-medium">{currentUser?.full_name || "—"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground w-24 shrink-0">E-Mail:</span>
                  <span className="font-medium">{currentUser?.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground w-24 shrink-0">Rolle:</span>
                  <span className="font-medium">{role === "organization_admin" ? "Admin" : "Vertriebler"}</span>
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3 bg-muted/50 border border-border rounded-xl px-4 py-3">
              <Info className="w-4 h-4 shrink-0 mt-0.5 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Unternehmensprofil, E-Mail-Vorlagen, Team-Verwaltung und Abonnement sind nur für Admins zugänglich.
                Bitte wenden Sie sich an Ihren Administrator für Änderungen.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}