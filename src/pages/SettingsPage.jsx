import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Settings, Users, Shield, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function SettingsPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.User.list("-created_date", 50).then(data => {
      setUsers(data);
      setLoading(false);
    });
  }, []);

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
        <p className="text-sm text-muted-foreground">Admin-Bereich</p>
      </div>

      {/* Benutzer */}
      <div className="bg-card border border-border rounded-xl">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">Benutzer</h3>
        </div>
        <div className="divide-y divide-border">
          {users.map(u => (
            <div key={u.id} className="px-5 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{u.full_name || u.email}</p>
                <p className="text-xs text-muted-foreground">{u.email}</p>
              </div>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                u.role === "admin"
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground"
              }`}>
                {u.role === "admin" ? "Admin" : "Vertriebler"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* System Info */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">System</h3>
        </div>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>• Lead Agent: Generiert montags 25 neue Firmen im Umkreis Neuwied (via Backend-Funktion)</p>
          <p>• Dublettencheck bei jedem Import und manueller Erstellung</p>
          <p>• Blacklist-Prüfung bei allen Eingängen</p>
          <p>• Vorbereitet für Google Maps API & externe Firmenquellen</p>
        </div>
      </div>
    </div>
  );
}