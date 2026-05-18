/**
 * LeadScoringDiagnostics
 * ======================
 * Phase 2 des Admin-/Owner-Diagnosecenters.
 *
 * Zeigt pro Lead (Company Entity) warum dieser erstellt und wie er bewertet wurde.
 * Datenquelle: direkte Entity-Abfrage Company + Organization
 * Keine Dummy-Werte. Kein Speichern / keine Usage-Änderungen.
 *
 * Zugriff:
 * - Platform Admin: alle Companies aller Orgs
 * - Org Admin: nur eigene Org
 * - Normaler User: kein Zugriff
 */

import { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import {
  ChevronDown, ChevronRight, RefreshCw, AlertCircle, Search,
  Loader2, Thermometer, Target, Zap, Code
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import moment from 'moment';

// ── Helpers ──────────────────────────────────────────────────────────────────

function safeParseJSON(val, fallback = null) {
  if (!val) return fallback;
  if (typeof val === 'object') return val;
  try { return JSON.parse(val); } catch { return fallback; }
}

// ── Temperature Config ────────────────────────────────────────────────────────

const TEMP_CONFIG = {
  hot:     { label: 'Hot',     color: 'bg-red-50 text-red-700 border-red-300' },
  warm:    { label: 'Warm',    color: 'bg-amber-50 text-amber-700 border-amber-300' },
  cold:    { label: 'Cold',    color: 'bg-slate-100 text-slate-600 border-slate-300' },
  unknown: { label: 'Offen',   color: 'bg-slate-50 text-slate-500 border-slate-200' },
};

function TempBadge({ temp }) {
  const cfg = TEMP_CONFIG[temp] || TEMP_CONFIG.unknown;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${cfg.color}`}>
      <Thermometer className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

function ScoreBadge({ score }) {
  const color = score >= 70 ? 'text-emerald-700 bg-emerald-50 border-emerald-300'
    : score >= 45 ? 'text-amber-700 bg-amber-50 border-amber-300'
    : 'text-red-700 bg-red-50 border-red-300';
  return (
    <span className={`inline-flex items-center text-[11px] font-bold px-2 py-0.5 rounded-full border ${color}`}>
      {score ?? '—'}
    </span>
  );
}

// ── Row Helper ────────────────────────────────────────────────────────────────

function Row({ label, value, mono, warning }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="text-[10px] text-slate-500 font-medium flex-shrink-0 min-w-[140px]">{label}</span>
      <span className={`text-right break-all ${mono ? 'font-mono text-[10px]' : 'text-xs font-semibold'} ${warning ? 'text-amber-700' : 'text-slate-800'}`}>
        {value ?? '—'}
      </span>
    </div>
  );
}

// ── Lead Detail Panel ─────────────────────────────────────────────────────────

function LeadDetailPanel({ company, orgName }) {
  const [showRaw, setShowRaw] = useState(false);
  const engine = safeParseJSON(company.engine_analysis_json);

  const weightedSignals = engine?.matched_weighted_signals || [];
  const badFitSignals = engine?.bad_fit_signals_matched || [];

  return (
    <div className="space-y-4 text-xs">

      {/* Scoring-Grunddaten */}
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">Scoring</p>
        <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 space-y-1.5">
          <Row label="Relevanz-Score (Engine)" value={company.relevance_score ?? '—'} />
          <Row label="Lead-Score (Temperatur)" value={company.lead_temperature_score ?? '—'} />
          <Row label="Relevanz-Begründung" value={company.relevance_reason || '—'} />
          <Row label="Temperatur-Begründung" value={company.lead_temperature_reason || '—'} />
        </div>
      </div>

      {/* Zielkunden & Service-Kontext */}
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">Zielkunden & Kontext</p>
        <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 space-y-1.5">
          <Row label="Zielkunden-Match" value={company.matched_target_customer_type || '—'} />
          <Row label="Service-Kontext" value={company.matched_service_context || '—'} />
          <Row label="Branchen-Kategorie" value={company.branche || '—'} />
        </div>
      </div>

      {/* Engine Scoring Breakdown */}
      {engine && (
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">Engine Score Breakdown</p>
          <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 space-y-1.5">
            <Row label="Engine Version" value={engine.engine_version || company.engine_version || '—'} mono />
            <Row label="Score (roh)" value={engine.score_raw ?? '—'} />
            <Row label="Score Breakdown" value={engine.score_breakdown || '—'} />
            <Row label="Place-Type Match" value={engine.place_type_match_strength || '—'} />
            <Row label="Place-Type Confidence" value={engine.place_type_confidence || '—'} />
            <Row label="Search Strategy" value={engine.search_strategy || '—'} />
            <Row label="TC-Bonus" value={engine.tc_bonus_applied !== undefined ? `+${engine.tc_bonus_applied}` : '—'} />
          </div>
        </div>
      )}

      {/* Weighted Signals */}
      {weightedSignals.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-emerald-700 mb-2">Matched Signals ({weightedSignals.length})</p>
          <div className="flex flex-wrap gap-1.5">
            {weightedSignals.map((s, i) => (
              <span key={i} className="text-[11px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full font-semibold">
                ✓ {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Bad Fit Signals */}
      {badFitSignals.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-red-700 mb-2">Bad-Fit Signals ({badFitSignals.length})</p>
          <div className="flex flex-wrap gap-1.5">
            {badFitSignals.map((s, i) => (
              <span key={i} className="text-[11px] bg-red-50 text-red-800 border border-red-200 px-2 py-0.5 rounded-full font-semibold">
                ✗ {s}
              </span>
            ))}
          </div>
          {engine?.bad_fit_penalty !== undefined && (
            <p className="text-[10px] text-red-600 mt-1 font-semibold">Penalty gesamt: {engine.bad_fit_penalty}</p>
          )}
        </div>
      )}

      {/* Query / Suche */}
      {engine && (engine.query_used || engine.query_family || engine.query_category) && (
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">Suchanfrage</p>
          <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 space-y-1.5">
            <Row label="Query" value={engine.query_used || '—'} />
            <Row label="Query Familie" value={engine.query_family || '—'} />
            <Row label="Kategorie" value={engine.query_category || '—'} />
            <Row label="Zielkunden-Match" value={engine.matched_target_customer || '—'} />
          </div>
        </div>
      )}

      {/* KI-Empfehlung (outreach/opening/questions) */}
      {engine && (engine.outreach_angle || engine.suggested_opening) && (
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-blue-700 mb-2">KI-Empfehlung</p>
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-200 space-y-2">
            {engine.outreach_angle && (
              <div>
                <p className="text-[10px] font-bold text-blue-600 uppercase mb-1">Gesprächsansatz</p>
                <p className="text-xs text-blue-900">{engine.outreach_angle}</p>
              </div>
            )}
            {engine.suggested_opening && (
              <div>
                <p className="text-[10px] font-bold text-blue-600 uppercase mb-1">Eröffnungssatz</p>
                <p className="text-xs text-blue-900 italic">"{engine.suggested_opening}"</p>
              </div>
            )}
            {engine.qualification_questions?.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-blue-600 uppercase mb-1">Qualifizierungsfragen</p>
                <ul className="space-y-0.5">
                  {engine.qualification_questions.map((q, i) => (
                    <li key={i} className="text-xs text-blue-900">• {q}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quelle & Herkunft */}
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">Quelle</p>
        <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 space-y-1.5">
          <Row label="Quelle" value={company.quelle || company.source_provider || '—'} />
          <Row label="Google Place ID" value={company.google_place_id || '—'} mono />
          <Row label="Source Query" value={company.source_query || '—'} />
          <Row label="Erstellt" value={moment(company.created_date).format('DD.MM.YYYY HH:mm')} />
          <Row label="Engine analysiert" value={company.engine_last_analyzed_at ? moment(company.engine_last_analyzed_at).format('DD.MM.YYYY HH:mm') : '—'} />
        </div>
      </div>

      {/* Raw engine_analysis_json */}
      {engine && (
        <div>
          <button
            onClick={() => setShowRaw(!showRaw)}
            className="flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-slate-700 font-semibold"
          >
            <Code className="w-3 h-3" />
            {showRaw ? 'JSON ausblenden' : 'Rohes engine_analysis_json anzeigen'}
          </button>
          {showRaw && (
            <pre className="mt-2 bg-slate-900 text-slate-100 rounded-lg p-3 text-[10px] overflow-x-auto max-h-64 overflow-y-auto">
              {JSON.stringify(engine, null, 2)}
            </pre>
          )}
        </div>
      )}

      {/* Lead-ID */}
      <div className="text-[10px] text-slate-400 border-t border-slate-100 pt-2">
        Lead-ID: <code className="font-mono">{company.id}</code> · Org: <code className="font-mono">{company.organization_id}</code>
      </div>
    </div>
  );
}

// ── Lead Row ──────────────────────────────────────────────────────────────────

function LeadRow({ company, orgName, isExpanded, onToggle }) {
  return (
    <>
      <tr
        className="border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer"
        onClick={onToggle}
      >
        <td className="px-4 py-3">
          {isExpanded
            ? <ChevronDown className="w-4 h-4 text-slate-400" />
            : <ChevronRight className="w-4 h-4 text-slate-400" />}
        </td>
        <td className="px-4 py-3">
          <p className="text-sm font-semibold text-slate-900">{company.name}</p>
          <p className="text-[10px] text-slate-500">{orgName || company.organization_id?.slice(0, 12) + '…'}</p>
        </td>
        <td className="px-4 py-3">
          <TempBadge temp={company.lead_temperature} />
        </td>
        <td className="px-4 py-3">
          <ScoreBadge score={company.relevance_score} />
        </td>
        <td className="px-4 py-3 text-xs text-slate-700 max-w-[200px]">
          <p className="truncate">{company.matched_target_customer_type || '—'}</p>
        </td>
        <td className="px-4 py-3 text-xs text-slate-700 max-w-[160px]">
          <p className="truncate">{company.matched_service_context || '—'}</p>
        </td>
        <td className="px-4 py-3">
          {company.engine_analysis_json
            ? <span className="text-[10px] bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full font-semibold">✓ Engine</span>
            : <span className="text-[10px] text-slate-400">—</span>}
        </td>
        <td className="px-4 py-3 text-[11px] text-slate-500">
          {moment(company.created_date).format('DD.MM.YY HH:mm')}
        </td>
      </tr>
      {isExpanded && (
        <tr className="bg-slate-50 border-b border-slate-200">
          <td colSpan={8} className="px-6 py-4">
            <LeadDetailPanel company={company} orgName={orgName} />
          </td>
        </tr>
      )}
    </>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function LeadScoringDiagnostics({ userRole, userEmail, orgId }) {
  const isPlatformAdmin = ['admin', 'platform_owner', 'platform_admin'].includes(userRole);
  const isOrgAdmin = userRole === 'organization_admin';
  const hasAccess = isPlatformAdmin || isOrgAdmin;

  const [companies, setCompanies] = useState([]);
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [filterOrg, setFilterOrg] = useState(isPlatformAdmin ? 'all' : (orgId || 'all'));
  const [filterTemp, setFilterTemp] = useState('all');
  const [filterHasEngine, setFilterHasEngine] = useState(false);
  const [filterTargetCustomer, setFilterTargetCustomer] = useState('');
  const [filterScoreMin, setFilterScoreMin] = useState('');
  const [searchText, setSearchText] = useState('');

  const orgMap = useMemo(() => {
    const m = {};
    orgs.forEach(o => { m[o.id] = o.name; });
    return m;
  }, [orgs]);

  // Distinct target customer types for filter
  const targetCustomerOptions = useMemo(() => {
    const set = new Set();
    companies.forEach(c => { if (c.matched_target_customer_type) set.add(c.matched_target_customer_type); });
    return Array.from(set).sort();
  }, [companies]);

  const filtered = useMemo(() => {
    if (!hasAccess) return [];
    return companies.filter(c => {
      if (filterOrg !== 'all' && c.organization_id !== filterOrg) return false;
      if (filterTemp !== 'all' && c.lead_temperature !== filterTemp) return false;
      if (filterHasEngine && !c.engine_analysis_json) return false;
      if (filterTargetCustomer && c.matched_target_customer_type !== filterTargetCustomer) return false;
      if (filterScoreMin !== '' && (c.relevance_score ?? 0) < Number(filterScoreMin)) return false;
      if (searchText.trim()) {
        const q = searchText.toLowerCase();
        const name = (c.name || '').toLowerCase();
        const orgName = (orgMap[c.organization_id] || '').toLowerCase();
        const context = (c.matched_service_context || '').toLowerCase();
        if (!name.includes(q) && !orgName.includes(q) && !context.includes(q)) return false;
      }
      return true;
    });
  }, [hasAccess, companies, filterOrg, filterTemp, filterHasEngine, filterTargetCustomer, filterScoreMin, searchText, orgMap]);

  const loadData = async () => {
    setLoading(true);
    try {
      const query = isOrgAdmin && orgId ? { organization_id: orgId } : {};
      const [companiesData, orgsData] = await Promise.all([
        base44.entities.Company.filter(query, '-created_date', 200),
        isPlatformAdmin
          ? base44.entities.Organization.list('-created_date', 200)
          : (orgId ? base44.entities.Organization.filter({ id: orgId }) : Promise.resolve([])),
      ]);
      setCompanies(companiesData || []);
      setOrgs(orgsData || []);
    } catch (e) {
      console.error('[LeadScoringDiagnostics] Ladefehler:', e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (hasAccess) loadData(); }, [hasAccess]);

  if (!hasAccess) {
    return (
      <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-6">
        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
        <div>
          <p className="text-sm font-bold text-red-900">Kein Zugriff</p>
          <p className="text-xs text-red-700">Das Lead-Scoring-Diagnose-Center ist nur für Platform-Admins und Organisations-Admins zugänglich.</p>
        </div>
      </div>
    );
  }

  const engineCount = companies.filter(c => c.engine_analysis_json).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">Lead-Scoring Diagnose</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {isPlatformAdmin ? 'Alle Organisations-Leads' : 'Nur eigene Organisation'}
            {' · '}letzte 200 Leads · {engineCount} mit Engine-Analyse
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData} disabled={loading} className="gap-1.5">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Aktualisieren
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Firma, Org oder Service-Kontext suchen…"
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            className="pl-9 bg-white"
          />
        </div>

        {isPlatformAdmin && (
          <select
            value={filterOrg}
            onChange={e => setFilterOrg(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 font-medium"
          >
            <option value="all">Alle Organisationen</option>
            {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        )}

        <select
          value={filterTemp}
          onChange={e => setFilterTemp(e.target.value)}
          className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 font-medium"
        >
          <option value="all">Alle Temperaturen</option>
          <option value="hot">Hot</option>
          <option value="warm">Warm</option>
          <option value="cold">Cold</option>
          <option value="unknown">Offen</option>
        </select>

        {targetCustomerOptions.length > 0 && (
          <select
            value={filterTargetCustomer}
            onChange={e => setFilterTargetCustomer(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 font-medium max-w-[220px]"
          >
            <option value="">Alle Zielkunden</option>
            {targetCustomerOptions.map(tc => <option key={tc} value={tc}>{tc}</option>)}
          </select>
        )}

        <Input
          type="number"
          placeholder="Min. Score"
          value={filterScoreMin}
          onChange={e => setFilterScoreMin(e.target.value)}
          className="w-28 bg-white"
        />

        <label className="flex items-center gap-1.5 text-sm text-slate-700 font-medium cursor-pointer select-none whitespace-nowrap">
          <input
            type="checkbox"
            checked={filterHasEngine}
            onChange={e => setFilterHasEngine(e.target.checked)}
            className="rounded"
          />
          Nur mit Engine-Analyse
        </label>
      </div>

      {/* Summary */}
      {!loading && (
        <div className="flex items-center gap-2 flex-wrap text-[11px]">
          {Object.entries(TEMP_CONFIG).map(([temp, cfg]) => {
            const count = companies.filter(c => (c.lead_temperature || 'unknown') === temp).length;
            if (count === 0) return null;
            return (
              <button
                key={temp}
                onClick={() => setFilterTemp(filterTemp === temp ? 'all' : temp)}
                className={`px-2.5 py-1 rounded-full border font-bold transition-colors ${
                  filterTemp === temp ? cfg.color : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {cfg.label}: {count}
              </button>
            );
          })}
          <span className="text-slate-400 ml-auto">{filtered.length} angezeigt</span>
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Lade Leads…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Target className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">Keine Leads gefunden</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="w-8 px-4 py-2.5" />
                  <th className="px-4 py-2.5 text-left text-[10px] font-bold text-slate-500 uppercase">Firma / Org</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-bold text-slate-500 uppercase">Temperatur</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-bold text-slate-500 uppercase">Score</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-bold text-slate-500 uppercase">Zielkunde</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-bold text-slate-500 uppercase">Service-Kontext</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-bold text-slate-500 uppercase">Engine</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-bold text-slate-500 uppercase">Erstellt</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(company => (
                  <LeadRow
                    key={company.id}
                    company={company}
                    orgName={orgMap[company.organization_id]}
                    isExpanded={expandedId === company.id}
                    onToggle={() => setExpandedId(expandedId === company.id ? null : company.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}