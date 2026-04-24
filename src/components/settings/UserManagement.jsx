import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Users, UserPlus, RefreshCw, Crown, Trash2, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import SettingsSection from "./SettingsSection";
import ActivityOverview from "./ActivityOverview";
import SalesDashboardModal from "@/components/SalesDashboardModal";

export default function UserManagement({ users, currentUser, onRefresh }) {
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("user");
  const [inviting, setInviting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteUserId, setDeleteUserId] = useState(null);
  const [deleteUserName, setDeleteUserName] = useState("");
  const [dashboardUser, setDashboardUser] = useState(null);

  const handleInvite = async () => {
    if (!inviteEmail || !inviteEmail.includes("@")) {
      toast.error("Bitte eine gültige E-Mail-Adresse eingeben.");
      return;
    }
    setInviting(true);
    try {
      await base44.users.inviteUser(inviteEmail.trim().toLowerCase(), inviteRole);
      toast.success(`Einladung an ${inviteEmail} gesendet!`);
      setInviteEmail("");
      onRefresh();
    } catch (e) {
      toast.error("Fehler: " + e.message);
    }
    setInviting(false);
  };

  const handleRoleChange = async (userId, newRole) => {
    await base44.entities.User.update(userId, { role: newRole });
    toast.success("Rolle aktualisiert.");
    onRefresh();
  };

  const handleDeleteUser = async () => {
    await base44.entities.User.delete(deleteUserId);
    toast.success(`Benutzer "${deleteUserName}" gelöscht.`);
    setDeleteConfirmOpen(false);
    onRefresh();
  };

  return (
    <>
      <SettingsSection icon={UserPlus} title="Vertriebler einladen" description="Der Benutzer erhält eine E-Mail mit Login-Link.">
        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            placeholder="E-Mail-Adresse"
            value={inviteEmail}
            onChange={e => setInviteEmail(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleInvite()}
            className="flex-1"
          />
          <Select value={inviteRole} onValueChange={setInviteRole}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="user">Vertriebler</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleInvite} disabled={inviting} className="gap-2 whitespace-nowrap">
            <UserPlus className="w-4 h-4" />
            {inviting ? "Sende..." : "Einladen"}
          </Button>
        </div>
      </SettingsSection>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">Alle Benutzer ({users.length})</h3>
          </div>
          <button onClick={onRefresh} className="text-muted-foreground hover:text-foreground">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="divide-y divide-border">
          {users.map(u => (
            <div key={u.id} className="px-5 py-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                  {u.full_name?.charAt(0) || u.email?.charAt(0)?.toUpperCase() || "?"}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{u.full_name || "—"}</p>
                  <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                </div>
              </div>
              <div className="shrink-0 flex items-center gap-2">
                {u.id === currentUser?.id ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                    <Crown className="w-3 h-3" /> Du (Admin)
                  </span>
                ) : (
                  <>
                    <button
                      onClick={() => setDashboardUser(u)}
                      className="p-1.5 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                      title="Dashboard anzeigen"
                    >
                      <LayoutDashboard className="w-3.5 h-3.5" />
                    </button>
                    <Select value={u.role || "user"} onValueChange={val => handleRoleChange(u.id, val)}>
                      <SelectTrigger className="w-36 h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">Vertriebler</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    <button
                      onClick={() => { setDeleteUserId(u.id); setDeleteUserName(u.full_name || u.email); setDeleteConfirmOpen(true); }}
                      className="text-destructive/50 hover:text-destructive transition-colors p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <ActivityOverview users={users} />

      <SalesDashboardModal
        user={dashboardUser}
        open={!!dashboardUser}
        onClose={() => setDashboardUser(null)}
      />

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-4 h-4" /> Benutzer löschen
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Soll <span className="font-semibold text-foreground">„{deleteUserName}"</span> wirklich gelöscht werden?
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>Abbrechen</Button>
            <Button variant="destructive" onClick={handleDeleteUser}>Ja, löschen</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}