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
    Promise.all([
      base44.entities.Company.list("-created_date", 500),
      base44.entities.ContactLog.list("-created_date", 500),
    ]).then(([comps, logs]) => {
      setCompanies(comps);
      setContactLogs(logs);
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
        <div className="bg-card border border-border rounded-xl p-5">
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
        <div className="bg-card border border-border rounded-xl p-5">
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
    </div>
  );
}