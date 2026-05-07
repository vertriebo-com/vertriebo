import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Activity, RefreshCw } from "lucide-react";
import moment from "moment";
import "moment/locale/de";
moment.locale("de");

export default function ActivityOverview({ users }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setLoading(true);
    const user = await base44.auth.me();
    let org = null;
    const orgs = await base44.entities.Organization.filter({ owner_email: user.email });
    org = orgs?.[0] || null;
    if (!org) {
      const memberships = await base44.entities.OrganizationMember.filter({ user_email: user.email, status: "active" });
      if (memberships?.[0]?.organization_id) {
        const memberOrgs = await base44.entities.Organization.filter({ id: memberships[0].organization_id });
        org = memberOrgs?.[0] || null;
      }
    }
    if (!org) { setLoading(false); return; }
    const data = await base44.entities.ActivityLog.filter({ organization_id: org.id }, "-created_date", 200);
    setLogs(data);
    setLoading(false);
  };

  // Group by user: last login + total logins last 30 days
  const userMap = {};
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  logs.forEach(log => {
    if (log.event !== "login") return;
    if (!userMap[log.user_email]) {
      userMap[log.user_email] = { name: log.user_name, email: log.user_email, lastLogin: null, count30d: 0 };
    }
    const ts = new Date(log.created_date);
    if (!userMap[log.user_email].lastLogin || ts > new Date(userMap[log.user_email].lastLogin)) {
      userMap[log.user_email].lastLogin = log.created_date;
    }
    if (ts >= thirtyDaysAgo) {
      userMap[log.user_email].count30d++;
    }
  });

  // Merge with users list so inactive users also show
  const rows = users.map(u => {
    const activity = userMap[u.email] || { lastLogin: null, count30d: 0 };
    return {
      id: u.id,
      name: u.full_name || u.email,
      email: u.email,
      role: u.role,
      lastLogin: activity.lastLogin,
      count30d: activity.count30d,
    };
  }).sort((a, b) => {
    if (!a.lastLogin && !b.lastLogin) return 0;
    if (!a.lastLogin) return 1;
    if (!b.lastLogin) return -1;
    return new Date(b.lastLogin) - new Date(a.lastLogin);
  });

  const getActivityColor = (lastLogin) => {
    if (!lastLogin) return "text-muted-foreground";
    const hours = (Date.now() - new Date(lastLogin)) / (1000 * 60 * 60);
    if (hours < 24) return "text-green-600";
    if (hours < 72) return "text-yellow-600";
    if (hours < 168) return "text-orange-500";
    return "text-red-500";
  };

  const getDotColor = (lastLogin) => {
    if (!lastLogin) return "bg-muted-foreground/40";
    const hours = (Date.now() - new Date(lastLogin)) / (1000 * 60 * 60);
    if (hours < 24) return "bg-green-500";
    if (hours < 72) return "bg-yellow-500";
    if (hours < 168) return "bg-orange-500";
    return "bg-red-500";
  };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">Aktivitätsübersicht</h3>
        </div>
        <button onClick={loadLogs} className="text-muted-foreground hover:text-foreground">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="divide-y divide-border">
        {rows.map(u => (
          <div key={u.id} className="px-5 py-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative shrink-0">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                  {u.name?.charAt(0)?.toUpperCase() || "?"}
                </div>
                <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-card ${getDotColor(u.lastLogin)}`} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{u.name}</p>
                <p className="text-xs text-muted-foreground truncate">{u.email}</p>
              </div>
            </div>
            <div className="shrink-0 text-right">
              {u.lastLogin ? (
                <>
                  <p className={`text-xs font-medium ${getActivityColor(u.lastLogin)}`}>
                    {moment(u.lastLogin).fromNow()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {u.count30d}× in 30 Tagen
                  </p>
                </>
              ) : (
                <p className="text-xs text-muted-foreground italic">Noch nie eingeloggt</p>
              )}
            </div>
          </div>
        ))}
        {rows.length === 0 && (
          <div className="px-5 py-6 text-center text-sm text-muted-foreground">Keine Daten vorhanden</div>
        )}
      </div>

      <div className="px-5 py-3 border-t border-border bg-muted/30 flex gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Heute</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500 inline-block" /> &lt; 3 Tage</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500 inline-block" /> &lt; 7 Tage</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> &gt; 7 Tage</span>
      </div>
    </div>
  );
}