import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Zap, TrendingUp, Ban, Brain } from "lucide-react";

export default function LearnedIntelligencePanel({ organizationId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!organizationId) {
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const results = await base44.entities.OrgLearnedSignals.filter({
          organization_id: organizationId,
        });

        if (results?.[0]) {
          const r = results[0];
          setData({
            priorityCategories: JSON.parse(r.priority_categories || '[]'),
            excludedCategories: JSON.parse(r.excluded_categories || '[]'),
            winningSignals: JSON.parse(r.winning_signals || '[]'),
            totalOutcomes: r.total_outcomes_analyzed || 0,
            lastComputed: r.last_computed_at || null,
          });
        }
      } catch (e) {
        console.warn('[LearnedIntelligencePanel] Error loading data:', e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [organizationId]);

  if (loading || !data || data.totalOutcomes < 2) return null;

  const topCategories = data.priorityCategories
    .filter(c => c.score > 60 && c.won > 0)
    .slice(0, 3);

  const badCategories = data.excludedCategories.slice(0, 3);
  const topSignals = data.winningSignals.slice(0, 3);

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 space-y-3">
      <div className="flex items-start gap-3">
        <Brain className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="font-semibold text-blue-900 text-sm">Das System lernt für Sie</p>
          <p className="text-blue-700 text-xs mt-0.5">
            Basierend auf {data.totalOutcomes} ausgewerteten Leads
            {data.lastComputed && ` · Zuletzt aktualisiert ${new Date(data.lastComputed).toLocaleDateString('de-DE')}`}
          </p>
        </div>
      </div>

      {topCategories.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingUp className="w-3.5 h-3.5 text-green-600" />
            <p className="text-xs font-semibold text-blue-800">Besonders erfolgreich</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {topCategories.map(c => (
              <span key={c.category} className="text-xs bg-green-100 text-green-800 px-2.5 py-1 rounded-full font-medium">
                {c.category}
                <span className="text-green-600 ml-1">({c.won}x)</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {badCategories.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Ban className="w-3.5 h-3.5 text-slate-400" />
            <p className="text-xs font-semibold text-blue-800">Automatisch deprioritisiert</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {badCategories.map(cat => (
              <span key={cat} className="text-xs bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full line-through">
                {cat}
              </span>
            ))}
          </div>
        </div>
      )}

      {topSignals.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Zap className="w-3.5 h-3.5 text-blue-600" />
            <p className="text-xs font-semibold text-blue-800">Erkannte Erfolgs-Signale</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {topSignals.map(s => (
              <span key={s.signal} className="text-xs bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-medium">
                {s.signal}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}