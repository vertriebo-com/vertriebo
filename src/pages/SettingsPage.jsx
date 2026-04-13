import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Users, Zap, UserPlus, RefreshCw, Crown, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

export default function SettingsPage() {
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("user");
  const [inviting, setInviting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteUserId, setDeleteUserId] = useState(null);
  const [deleteUserName, setDeleteUserName] = useState("");

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
    setLoading(false);
  };

  const handleInvite = async () => {
    if (!inviteEmail || !inviteEmail.includes("@")) {
      toast.error("Bitte eine gültige E-Mail-Adresse eingeben.");
      return;
    }
    setInviting(true);
    try {
      await base44.users.inviteUser(inviteEmail.trim().toLowerCase(), inviteRole);
      toast.success(`Einladung an ${inviteEmail} gesendet! Der Vertriebler bekommt eine E-Mail mit Login-Link.`);
      setInviteEmail("");
      setTimeout(loadData, 1500);
    } catch (e) {
      toast.error("Fehler beim Einladen: " + e.message);
    }
    setInviting(false);
  };

  const handleRoleChange = async (userId, newRole) => {
    await base44.entities.User.update(userId, { role: newRole });
    toast.success("Rolle aktualisiert.");
    loadData();
  };

  const openDeleteDialog = (userId, userName) => {
    setDeleteUserId(userId);
    setDeleteUserName(userName);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteUser = async () => {
    await base44.entities.User.delete(deleteUserId);
    toast.success(`Benutzer "${deleteUserName}" wurde gelöscht.`);
    setDeleteConfirmOpen(false);
    setDeleteUserId(null);
    setDeleteUserName("");
    loadData();
  };



  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold">Einstellungen</h1>
        <p className="text-sm text-muted-foreground">Admin-Bereich · Benutzerverwaltung</p>
      </div>



      {/* Benutzer einladen + verwalten */}
      <div className="bg-card border border-border rounded-xl">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">Vertriebler einladen</h3>
        </div>
        <div className="px-5 py-4">
          <p className="text-sm text-muted-foreground mb-4">
            Der Vertriebler erhält eine E-Mail mit einem Login-Link.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              placeholder="E-Mail-Adresse des Vertrieblers"
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
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">Alle Benutzer ({users.length})</h3>
          </div>
          <button onClick={loadData} className="text-muted-foreground hover:text-foreground">
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
                    <Select
                      value={u.role || "user"}
                      onValueChange={val => handleRoleChange(u.id, val)}
                    >
                      <SelectTrigger className="w-36 h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">Vertriebler</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    <button
                      onClick={() => openDeleteDialog(u.id, u.full_name || u.email)}
                      className="text-destructive/50 hover:text-destructive transition-colors p-1"
                      title="Benutzer löschen"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
          {users.length === 0 && (
            <div className="px-5 py-8 text-center text-sm text-muted-foreground">
              Noch keine Benutzer gefunden.
            </div>
          )}
        </div>
      </div>

      {/* Konto löschen Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-4 h-4" /> Benutzer löschen
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Soll <span className="font-semibold text-foreground">„{deleteUserName}"</span> wirklich gelöscht werden? Diese Aktion kann nicht rückgängig gemacht werden.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>Abbrechen</Button>
            <Button variant="destructive" onClick={handleDeleteUser}>Ja, löschen</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* System Info */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">System</h3>
        </div>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>• Lead-Generierung: Google Places API (25km Umkreis Neuwied)</p>
          <p>• Tages-Report: täglich 7:30 Uhr per E-Mail</p>
          <p>• Follow-Up Agent, Priority Agent & Cleanup Agent: täglich/wöchentlich</p>
          <p>• Dublettencheck bei jedem Import und manueller Erstellung</p>
          <p>• Blacklist-Prüfung bei allen Eingängen</p>
        </div>
      </div>
    </div>
  );
}