import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { BarChart3, TrendingUp } from "lucide-react";
import StatCard from "../components/StatCard";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const STATUS_COLORS = {
  "Neu": "#3b82f6",
  "Kontakt": "#06b6d4",
  "Rückruf": "#f59e0b",
  "Termin": "#8b5cf6",
  "Angebot": "#f97316",
  "Gewonnen": "#10b981",
  "Verloren": "#ef4444",
};

export default function Statistics() {
  const [companies, setCompanies] = useState([]);
  const [contactLogs, setContactLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
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
      const [comps, logs] = await Promise.all([
        base44.entities.Company.filter({ organization_id: org.id }, "-created_date", 500),
        base44.entities.ContactLog.filter({ organization_id: org.id }, "-created_date", 500),
      ]);
      setCompanies(comps);
      setContactLogs(logs);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // Status Distribution
  const statusData = Object.entries(
    companies.reduce((acc, c) => {
      acc[c.status] = (acc[c.status] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value, fill: STATUS_COLORS[name] || "#94a3b8" }));

  // Contact Type Distribution
  const contactTypeData = Object.entries(
    contactLogs.reduce((acc, l) => {
      acc[l.typ] = (acc[l.typ] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  // Conversion
  const total = companies.length;
  const gewonnen = companies.filter(c => c.status === "Gewonnen").length;
  const conversionRate = total > 0 ? ((gewonnen / total) * 100).toFixed(1) : 0;

  // Conversion per Branche
  const brancheMap = {};
  for (const c of companies) {
    const b = c.branche || "Unbekannt";
    if (!brancheMap[b]) brancheMap[b] = { total: 0, gewonnen: 0 };
    brancheMap[b].total++;
    if (c.status === "Gewonnen") brancheMap[b].gewonnen++;
  }
  const brancheData = Object.entries(brancheMap)
    .filter(([, v]) => v.total >= 2)
    .map(([name, v]) => ({ name, rate: Math.round((v.gewonnen / v.total) * 100), total: v.total, gewonnen: v.gewonnen }))
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 10);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Statistiken</h1>
        <p className="text-sm text-muted-foreground">Übersicht über alle Vertriebsaktivitäten</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Leads gesamt" value={total} icon={BarChart3} />
        <StatCard title="Kontakte" value={contactLogs.length} icon={TrendingUp} />
        <StatCard title="Gewonnen" value={gewonnen} />
        <StatCard title="Conversion" value={`${conversionRate}%`} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Status Pie */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-4">Lead-Status Verteilung</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name} (${value})`}>
                  {statusData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Contact Bar */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-4">Kontaktarten</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={contactTypeData}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(217, 91%, 50%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Conversion per Branche */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold mb-1">Conversion-Rate nach Branche</h3>
        <p className="text-xs text-muted-foreground mb-4">Nur Branchen mit mind. 2 Leads</p>
        {brancheData.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Noch nicht genug Daten</p>
        ) : (
          <div className="space-y-2">
            {brancheData.map(b => (
              <div key={b.name} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-44 truncate shrink-0">{b.name}</span>
                <div className="flex-1 bg-muted rounded-full h-2">
                  <div className="h-2 rounded-full bg-emerald-500 transition-all" style={{ width: `${b.rate}%` }} />
                </div>
                <span className="text-xs font-semibold w-12 text-right">{b.rate}%</span>
                <span className="text-xs text-muted-foreground w-16 text-right">{b.gewonnen}/{b.total}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}