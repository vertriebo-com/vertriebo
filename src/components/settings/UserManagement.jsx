import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Users, UserPlus, RefreshCw, Crown, Trash2, LayoutDashboard, Clock, CheckCircle2, Mail, Copy, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import SettingsSection from "./SettingsSection";
import SalesDashboardModal from "@/components/SalesDashboardModal";

const ROLE_LABELS = {
  organization_admin: { label: "Admin", color: "bg-blue-100 text-blue-700" },
  sales_rep:          { label: "Vertriebler", color: "bg-green-100 text-green-700" },
  admin:              { label: "Plattform-Admin", color: "bg-purple-100 text-purple-700" },
  user:               { label: "Vertriebler", color: "bg-green-100 text-green-700" },
};

const STATUS_LABELS = {
  active:   { label: "Aktiv",       color: "bg-green-100 text-green-700",   icon: CheckCircle2 },
  invited:  { label: "Ausstehend",  color: "bg-amber-100 text-amber-700",   icon: Clock },
  inactive: { label: "Inaktiv",     color: "bg-gray-100 text-gray-600",     icon: AlertCircle },
};

function formatRelativeDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "Gerade eben";
  if (diff < 3600) return `vor ${Math.floor(diff / 60)} Min.`;
  if (diff < 86400) return `vor ${Math.floor(diff / 3600)} Std.`;
  if (diff < 604800) return `vor ${Math.floor(diff / 86400)} Tagen`;
  return d.toLocaleDateString("de-DE");
}

export default function UserManagement({ users, currentUser, onRefresh }) {
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("sales_rep");
  const [inviting, setInviting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteUserId, setDeleteUserId] = useState(null);
  const [deleteUserName, setDeleteUserName] = useState("");
  const [dashboardUser, setDashboardUser] = useState(null);
  const [orgMembers, setOrgMembers] = useState([]);
  const [pendingInvites, setPendingInvites] = useState([]);
  const [orgId, setOrgId] = useState(null);

  useEffect(() => {
    loadOrgData();
  }, [currentUser]);

  const loadOrgData = async () => {
    if (!currentUser) return;
    // Resolve org
    const orgs = await base44.entities.Organization.filter({ owner_email: currentUser.email });
    let foundOrg = orgs?.[0] || null;
    if (!foundOrg) {
      const memberships = await base44.entities.OrganizationMember.filter({ user_email: currentUser.email, status: "active" });
      if (memberships?.[0]?.organization_id) {
        const memberOrgs = await base44.entities.Organization.filter({ id: memberships[0].organization_id });
        foundOrg = memberOrgs?.[0] || null;
      }
    }
    if (!foundOrg) return;
    setOrgId(foundOrg.id);

    const [members, invites] = await Promise.all([
      base44.entities.OrganizationMember.filter({ organization_id: foundOrg.id }),
      base44.entities.Invite.filter({ organization_id: foundOrg.id, status: "pending" }),
    ]);
    setOrgMembers(members);
    setPendingInvites(invites);
  };

  const handleInvite = async () => {
    if (!inviteEmail || !inviteEmail.includes("@")) {
      toast.error("Bitte eine gültige E-Mail-Adresse eingeben.");
      return;
    }
    if (!orgId) { toast.error("Organisation nicht gefunden."); return; }
    setInviting(true);
    try {
      // Base44 Plattform-Einladung
      await base44.users.inviteUser(inviteEmail.trim().toLowerCase(), inviteRole === "organization_admin" ? "admin" : "user");

      // OrganizationMember-Eintrag erstellen (invited)
      await base44.entities.OrganizationMember.create({
        organization_id: orgId,
        user_email: inviteEmail.trim().toLowerCase(),
        role: inviteRole,
        status: "invited",
        invited_by: currentUser?.email,
      });

      toast.success(`Einladung an ${inviteEmail} gesendet!`);
      setInviteEmail("");
      loadOrgData();
      onRefresh();
    } catch (e) {
      toast.error("Fehler: " + e.message);
    }
    setInviting(false);
  };

  const handleRoleChange = async (memberId, newRole) => {
    await base44.entities.OrganizationMember.update(memberId, { role: newRole });
    toast.success("Rolle aktualisiert.");
    loadOrgData();
  };

  const handleDeleteMember = async () => {
    await base44.entities.OrganizationMember.update(deleteUserId, { status: "inactive" });
    toast.success(`"${deleteUserName}" deaktiviert.`);
    setDeleteConfirmOpen(false);
    loadOrgData();
  };

  const handleDeleteUser = async () => {
    await base44.entities.User.delete(deleteUserId);
    toast.success(`Benutzer "${deleteUserName}" gelöscht.`);
    setDeleteConfirmOpen(false);
    onRefresh();
  };

  // Merge: active members + platform users
  const memberMap = {};
  orgMembers.forEach(m => { memberMap[m.user_email] = m; });

  // Include current user in list (owner might not have a member record)
  const allEmails = new Set([
    ...(currentUser ? [currentUser.email] : []),
    ...orgMembers.map(m => m.user_email),
  ]);

  const displayMembers = [...allEmails].map(email => {
    const platformUser = users.find(u => u.email === email);
    const member = memberMap[email];
    return { email, platformUser, member };
  });

  return (
    <>
      {/* Einladen */}
      <SettingsSection icon={UserPlus} title="Vertriebler einladen" description="Der Benutzer erhält eine E-Mail mit Login-Link und wird Ihrer Organisation hinzugefügt.">
        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            placeholder="E-Mail-Adresse"
            value={inviteEmail}
            onChange={e => setInviteEmail(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleInvite()}
            className="flex-1"
          />
          <Select value={inviteRole} onValueChange={setInviteRole}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sales_rep">Vertriebler</SelectItem>
              <SelectItem value="organization_admin">Admin</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleInvite} disabled={inviting} className="gap-2 whitespace-nowrap">
            <UserPlus className="w-4 h-4" />
            {inviting ? "Einladung..." : "Einladen"}
          </Button>
        </div>
      </SettingsSection>

      {/* Aktive Mitglieder */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-slate-900">Team-Mitglieder ({displayMembers.length})</h3>
          </div>
          <button onClick={() => { loadOrgData(); onRefresh(); }} className="text-slate-400 hover:text-slate-700">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="divide-y divide-slate-100">
          {displayMembers.length === 0 && (
          <div className="px-5 py-6 text-center text-sm text-slate-500 font-medium">
            Noch keine Mitglieder gefunden.
          </div>
          )}
          {displayMembers.map(({ email, platformUser, member }) => {
            const isMe = email === currentUser?.email;
            const role = member?.role || (platformUser?.role === "admin" ? "organization_admin" : "sales_rep");
            const status = member?.status || "active";
            const roleCfg = ROLE_LABELS[role] || ROLE_LABELS.sales_rep;
            const statusCfg = STATUS_LABELS[status] || STATUS_LABELS.active;
            const StatusIcon = statusCfg.icon;
            const lastActive = member?.last_active_at || platformUser?.updated_date;

            return (
              <div key={email} className="px-5 py-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                    {platformUser?.full_name?.charAt(0)?.toUpperCase() || email.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-sm font-semibold text-slate-900 truncate">{platformUser?.full_name || "—"}</p>
                      {isMe && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary shrink-0">
                          <Crown className="w-2.5 h-2.5" /> Du
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 truncate">{email}</p>
                    {lastActive && (
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Zuletzt aktiv: {formatRelativeDate(lastActive)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${roleCfg.color}`}>
                    {roleCfg.label}
                  </span>
                  <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${statusCfg.color}`}>
                    <StatusIcon className="w-2.5 h-2.5" />
                    {statusCfg.label}
                  </span>
                  {!isMe && platformUser && (
                    <button
                      onClick={() => setDashboardUser(platformUser)}
                      className="p-1.5 rounded-md hover:bg-primary/10 text-slate-400 hover:text-primary transition-colors"
                      title="Dashboard anzeigen"
                    >
                      <LayoutDashboard className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {!isMe && member && (
                    <>
                      <Select value={role} onValueChange={val => handleRoleChange(member.id, val)}>
                        <SelectTrigger className="w-36 h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sales_rep">Vertriebler</SelectItem>
                          <SelectItem value="organization_admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      <button
                        onClick={() => {
                          setDeleteUserId(member.id);
                          setDeleteUserName(platformUser?.full_name || email);
                          setDeleteConfirmOpen(true);
                        }}
                        className="text-destructive/50 hover:text-destructive transition-colors p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Ausstehende Einladungen */}
      {pendingInvites.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-semibold text-slate-900">Ausstehende Einladungen ({pendingInvites.length})</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {pendingInvites.map(invite => (
              <div key={invite.id} className="px-5 py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                    <Mail className="w-3.5 h-3.5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{invite.email}</p>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Eingeladen als: {ROLE_LABELS[invite.role]?.label || invite.role}
                      {invite.expires_at && ` · Gültig bis ${new Date(invite.expires_at).toLocaleDateString("de-DE")}`}
                    </p>
                  </div>
                </div>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" /> Ausstehend
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <SalesDashboardModal
        user={dashboardUser}
        open={!!dashboardUser}
        onClose={() => setDashboardUser(null)}
      />

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-4 h-4" /> Mitglied deaktivieren
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600 font-medium">
            Soll <span className="font-semibold text-slate-900">„{deleteUserName}"</span> wirklich deaktiviert werden? Der Benutzer verliert den Zugang zur Organisation.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>Abbrechen</Button>
            <Button variant="destructive" onClick={handleDeleteMember}>Ja, deaktivieren</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}