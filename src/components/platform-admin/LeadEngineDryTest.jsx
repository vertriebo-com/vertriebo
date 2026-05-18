/**
 * LeadEngineDryTest
 * =================
 * Phase 3 des Admin-/Owner-Diagnosecenters.
 *
 * Ermöglicht Platform-Admins, die Lead-Engine trocken zu testen.
 * - Kein Speichern von Companies
 * - Kein Usage/Billing-Logging
 * - Echte Google Places API + echte DB-Taxonomie (via testLeadSearchEngine)
 *
 * Zugriff: Nur Platform-Admins (admin / platform_owner / platform_admin)
 */

import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import {
  FlaskConical, Play, AlertCircle, CheckCircle2, XCircle,
  ChevronDown, ChevronRight, Loader2, Info, Target, Zap, TrendingUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import IndustryAutocompleteInput from '@/components/IndustryAutocompleteInput';
import LocationAutocomplete from '@/components/LocationAutocomplete';

// ── Helpers ──────────────────────────────────────────────────────────────────

function VerdictBadge({ verdict }) {
  const cfg = {
    GOOD:         { label: 'GOOD',         color: 'bg-emerald-50 text-emerald-800 border-emerald-300' },
    ACCEPTABLE:   { label: 'ACCEPTABLE',   color: 'bg-amber-50 text-amber-800 border-amber-300' },
    NEEDS_TUNING: { label: 'NEEDS_TUNING', color: 'bg-red-50 text-red-800 border-red-300' },
  }[verdict] || { label: verdict || '—', color: 'bg-slate-100 text-slate-700 border-slate-300' };
  return (
    <span className={`inline-flex items-center text-xs font-bold px-3 py-1 rounded-full border ${cfg.color}`}>
      {verdict === 'GOOD' && <CheckCircle2 className="w-3.5 h-3.5 mr-1" />}
      {verdict === 'NEEDS_TUNING' && <XCircle className="w-3.5 h-3.5 mr-1" />}
      {cfg.label}
    </span>
  );
}

function FpRiskBadge({ risk }) {
  const colors = { low: 'bg-emerald-50 text-emerald-700', medium: 'bg-amber-50 text-amber-700', high: 'bg-red-50 text-red-700' };
  return <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${colors[risk] || 'bg-slate-100 text-slate-600'}`}>{risk || '—'}</span>;
}

function StatCard({ label, value, sub, color = 'slate' }) {
  const colorMap = {
    slate:   'bg-slate-50 border-slate-200 text-slate-900',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    amber:   'bg-amber-50 border-amber-200 text-amber-800',
    red:     'bg-red-50 border-red-200 text-red-800',
    blue:    'bg-blue-50 border-blue-200 text-blue-800',
    purple:  'bg-purple-50 border-purple-200 text-purple-800',
  };
  return (
    <div className={`rounded-xl p-3 border ${colorMap[color]}`}>
      <p className="text-[10px] font-medium opacity-70 mb-1">{label}</p>
      <p className="text-xl font-bold">{value ?? '—'}</p>
      {sub && <p className="text-[10px] mt-0.5 opacity-60">{sub}</p>}
    </div>
  );
}

function LeadCard({ lead, expanded, onToggle }) {
  const fpColor = lead.false_positive_risk === 'low' ? 'text-emerald-600'
    : lead.false_positive_risk === 'high' ? 'text-red-600' : 'text-amber-600';
  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors"
      >
        {expanded ? <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900 truncate">{lead.name}</p>
          <p className="text-[10px] text-slate-500 truncate">{lead.formatted_address}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
            lead.score >= 70 ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : lead.score >= 55 ? 'bg-amber-50 text-amber-700 border-amber-200'
            : 'bg-red-50 text-red-700 border-red-200'
          }`}>{lead.score}</span>
          <FpRiskBadge risk={lead.false_positive_risk} />
        </div>
      </button>
      {expanded && (
        <div className="px-4 pb-4 pt-1 space-y-3 bg-slate-50 border-t border-slate-100 text-xs">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[10px] text-slate-500 font-medium">Telefon</p>
              <p className="font-semibold text-slate-800">{lead.phone || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-medium">Website</p>
              <p className="font-semibold text-slate-800 truncate">{lead.website || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-medium">Distanz</p>
              <p className="font-semibold text-slate-800">{lead.distance_km != null ? `${lead.distance_km} km` : '—'}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-medium">FP-Risiko</p>
              <FpRiskBadge risk={lead.false_positive_risk} />
            </div>
          </div>

          <div>
            <p className="text-[10px] text-slate-500 font-medium mb-1">Score-Begründung</p>
            <p className="text-slate-700 font-mono text-[10px] bg-white border border-slate-200 rounded p-2 break-all">{lead.relevance_reason || '—'}</p>
          </div>

          {lead.engine_analysis?.matched_weighted_signals?.length > 0 && (
            <div>
              <p className="text-[10px] text-emerald-700 font-bold mb-1">Matched Signals</p>
              <div className="flex flex-wrap gap-1">
                {lead.engine_analysis.matched_weighted_signals.map((s, i) => (
                  <span key={i} className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.5 rounded-full font-semibold">✓ {s}</span>
                ))}
              </div>
            </div>
          )}

          {lead.engine_analysis?.bad_fit_signals_matched?.length > 0 && (
            <div>
              <p className="text-[10px] text-red-700 font-bold mb-1">Bad-Fit Signals</p>
              <div className="flex flex-wrap gap-1">
                {lead.engine_analysis.bad_fit_signals_matched.map((s, i) => (
                  <span key={i} className="text-[10px] bg-red-50 text-red-800 border border-red-200 px-1.5 py-0.5 rounded-full font-semibold">✗ {s}</span>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {lead.matched_target_customer && (
              <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-semibold">
                🎯 {lead.matched_target_customer}
              </span>
            )}
            {lead.query_used && (
              <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">Query: {lead.query_used}</span>
            )}
            {lead.matched_search_category && (
              <span className="text-[10px] bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full">Kat: {lead.matched_search_category}</span>
            )}
          </div>

          {lead.types?.length > 0 && (
            <div>
              <p className="text-[10px] text-slate-400 font-medium">Google Place Types</p>
              <p className="text-[10px] text-slate-600 font-mono">{lead.types.join(', ')}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function LeadEngineDryTest({ userRole }) {
  const isPlatformAdmin = ['admin', 'platform_owner', 'platform_admin'].includes(userRole);

  const [industry, setIndustry] = useState(null);         // { id, label }
  const [location, setLocation] = useState(null);         // { city, lat, lng }
  const [radiusKm, setRadiusKm] = useState(25);
  const [maxQueries, setMaxQueries] = useState(6);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [expandedLeadId, setExpandedLeadId] = useState(null);
  const [showRejected, setShowRejected] = useState(false);
  const [showQueries, setShowQueries] = useState(false);

  const canRun = !!industry?.id && !!location?.city && !running;

  const handleRun = async () => {
    setRunning(true);
    setResult(null);
    setError(null);
    setExpandedLeadId(null);
    try {
      const res = await base44.functions.invoke('testLeadSearchEngine', {
        profile_id: industry.id,
        city: location.city,
        radius_km: Number(radiusKm) || 25,
        max_queries: Number(maxQueries) || 6,
        dry_run: true,
      });
      if (res.data?.success) {
        setResult(res.data);
      } else {
        setError(res.data?.error || 'Unbekannter Fehler');
      }
    } catch (e) {
      setError(e.message || 'Anfrage fehlgeschlagen');
    } finally {
      setRunning(false);
    }
  };

  if (!isPlatformAdmin) {
    return (
      <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-6">
        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
        <div>
          <p className="text-sm font-bold text-red-900">Kein Zugriff</p>
          <p className="text-xs text-red-700">Das Dry-Test-Center ist nur für Platform-Admins zugänglich.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center shrink-0">
          <FlaskConical className="w-5 h-5 text-purple-700" />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-900">Lead-Engine Dry-Test</h2>
          <p className="text-xs text-slate-500">Testläufe ohne Speicherung · Kein Usage-Logging · Kein Billing</p>
        </div>
      </div>

      {/* Dry-Run Hinweis */}
      <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl p-4">
        <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-900">
          <strong>Dry-Run-Modus:</strong> Dieser Test erstellt keine Leads, ändert kein Usage-Log und hat keinen Einfluss auf Billing oder Org-Daten.
          Es werden echte Google Places API-Calls und die echte DB-Taxonomie genutzt.
        </div>
      </div>

      {/* Konfiguration */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Test-Konfiguration</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Branche */}
          <div className="sm:col-span-2">
            <label className="text-xs font-bold text-slate-700 block mb-1.5">Branche / Profil</label>
            <IndustryAutocompleteInput
              value={industry}
              onChange={setIndustry}
              placeholder="Branche auswählen, z.B. Gebäudereinigung…"
              showStatus={true}
            />
          </div>

          {/* Stadt */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">Stadt / Ort</label>
            <LocationAutocomplete
              value={location}
              onChange={setLocation}
              placeholder="Stadt eingeben…"
              showCoordinates={true}
            />
          </div>

          {/* Radius */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">Suchradius (km)</label>
            <Input
              type="number"
              value={radiusKm}
              onChange={e => setRadiusKm(e.target.value)}
              min={5}
              max={100}
              className="bg-white"
            />
          </div>

          {/* Max Queries */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">
              Max. Google-Queries
              <span className="ml-1 text-slate-400 font-normal">(Kostensteuerung)</span>
            </label>
            <select
              value={maxQueries}
              onChange={e => setMaxQueries(Number(e.target.value))}
              className="w-full h-11 px-3 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={3}>3 Queries (schnell, günstig)</option>
              <option value={6}>6 Queries (Standard)</option>
              <option value={9}>9 Queries (umfangreich)</option>
              <option value={12}>12 Queries (maximal)</option>
            </select>
          </div>
        </div>

        {/* Profil-Info wenn ausgewählt */}
        {industry?.id && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg px-3 py-2 text-xs flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-purple-600 shrink-0" />
            <span className="text-purple-900">
              Profil: <strong>{industry.label}</strong> · ID: <code className="font-mono text-purple-700">{industry.id}</code>
            </span>
          </div>
        )}

        <Button
          onClick={handleRun}
          disabled={!canRun}
          className="w-full gap-2 bg-purple-700 hover:bg-purple-800 text-white h-11"
        >
          {running
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Test läuft…</>
            : <><Play className="w-4 h-4" /> Dry-Test starten</>}
        </Button>
      </div>

      {/* Fehler */}
      {error && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
          <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-red-900">Fehler</p>
            <p className="text-xs text-red-700 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Ergebnis */}
      {result && (
        <div className="space-y-4">
          {/* Verdict + Basis-Info */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-xs text-slate-500 font-medium mb-1">
                  {result.profile_label} · {result.city} · {result.radius_km} km
                </p>
                <div className="flex items-center gap-2">
                  <VerdictBadge verdict={result.quality_assessment?.quality_verdict} />
                  <span className="text-xs text-slate-500">
                    getestet: {new Date(result.tested_at).toLocaleTimeString('de-DE')}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {result.search_strategy_used && (
                  <span className="text-[11px] bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full font-semibold">
                    {result.search_strategy_used}
                  </span>
                )}
                {result.place_type_confidence && (
                  <span className="text-[11px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-semibold">
                    PlaceType: {result.place_type_confidence}
                  </span>
                )}
              </div>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              <StatCard label="Roh-Treffer" value={result.raw_hits} color="slate" />
              <StatCard label="Akzeptiert" value={result.saved_count} color="emerald"
                sub={`Score ≥ 55, kein BadFit`} />
              <StatCard label="Abgelehnt" value={result.no_match_count} color="red" />
              <StatCard label="Ø Score" value={result.quality_assessment?.avg_score}
                color={result.quality_assessment?.avg_score >= 70 ? 'emerald' : 'amber'} />
              <StatCard label="TC-Match-Rate"
                value={`${result.quality_assessment?.target_customer_match_rate ?? 0}%`}
                sub="Leads mit Zielkunden-Match"
                color={result.quality_assessment?.target_customer_match_rate >= 40 ? 'emerald' : 'amber'} />
              <StatCard label="FP-Schätzung"
                value={`${result.quality_assessment?.false_positive_estimate_percent ?? 0}%`}
                sub="Hohe FP-Risiko-Leads"
                color={result.quality_assessment?.false_positive_estimate_percent <= 20 ? 'emerald' : 'red'} />
              <StatCard label="Signal-Gewichte" value={result.scoring_signal_weights_count}
                sub={`${result.scoring_signal_count} Signale`}
                color={result.scoring_signal_weights_count > 0 ? 'emerald' : 'red'} />
              <StatCard label="Queries genutzt" value={result.queries_used?.length ?? 0} color="blue" />
            </div>

            {/* Fired Signals */}
            {result.quality_assessment?.signals_fired?.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">Gefeuerte Signale (Top-Leads)</p>
                <div className="flex flex-wrap gap-1.5">
                  {result.quality_assessment.signals_fired.map((s, i) => (
                    <span key={i} className="text-[11px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full font-semibold">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Strategy Effectiveness */}
            {result.quality_assessment?.search_strategy_effectiveness && (
              <div className="text-[11px] text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 flex items-center gap-2">
                <TrendingUp className="w-3.5 h-3.5 text-slate-400" />
                Strategie-Effektivität: <strong>{result.quality_assessment.search_strategy_effectiveness}</strong>
              </div>
            )}
          </div>

          {/* Queries */}
          {result.queries_used?.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setShowQueries(!showQueries)}
                className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors"
              >
                <p className="text-sm font-bold text-slate-900">Genutzte Suchanfragen ({result.queries_used.length})</p>
                {showQueries ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
              </button>
              {showQueries && (
                <div className="px-5 pb-4 space-y-1 border-t border-slate-100">
                  {result.queries_used.map((q, i) => (
                    <div key={i} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0 gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-slate-800">{q.query}</span>
                      <div className="flex items-center gap-1.5">
                        {q.category && <span className="text-[10px] bg-purple-50 text-purple-700 border border-purple-200 px-1.5 py-0.5 rounded">{q.category}</span>}
                        {q.search_strategy && <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">{q.search_strategy}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Top Leads */}
          {result.top_leads?.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
                <p className="text-sm font-bold text-slate-900">
                  Akzeptierte Leads ({result.top_leads.length})
                </p>
                <span className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">Score ≥ 55</span>
              </div>
              <div className="p-4 space-y-2">
                {result.top_leads.map((lead, i) => (
                  <LeadCard
                    key={i}
                    lead={lead}
                    expanded={expandedLeadId === `top-${i}`}
                    onToggle={() => setExpandedLeadId(expandedLeadId === `top-${i}` ? null : `top-${i}`)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Rejected Leads */}
          {result.rejected_leads?.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setShowRejected(!showRejected)}
                className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors"
              >
                <p className="text-sm font-bold text-slate-900">
                  Abgelehnte Leads ({result.rejected_leads.length})
                  <span className="ml-2 text-[11px] text-slate-400 font-normal">(Score &lt; 55 oder BadFit)</span>
                </p>
                {showRejected ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
              </button>
              {showRejected && (
                <div className="border-t border-slate-100">
                  {result.rejected_leads.map((lead, i) => (
                    <div key={i} className="flex items-center justify-between px-5 py-2.5 border-b border-slate-50 last:border-0 gap-3 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{lead.name}</p>
                        <p className="text-[10px] text-slate-500 font-mono truncate">{lead.reason}</p>
                      </div>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                        lead.score >= 45 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-red-50 text-red-700 border-red-200'
                      }`}>{lead.score}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* No results */}
          {result.saved_count === 0 && result.raw_hits === 0 && (
            <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl p-5">
              <Target className="w-5 h-5 text-slate-400 shrink-0" />
              <div>
                <p className="text-sm font-bold text-slate-700">Keine Treffer</p>
                <p className="text-xs text-slate-500 mt-0.5">Google Places hat für diese Stadt/Branche keine Ergebnisse geliefert. Andere Queries oder größerer Radius versuchen.</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}