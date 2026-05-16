import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Building2, MapPin, Phone, Globe, CheckCircle2, AlertTriangle,
  XCircle, ChevronRight, Loader2, Info
} from "lucide-react";

const STATUS_CONFIG = {
  ready_for_review: { label: "Bereit zur Übernahme", color: "bg-green-100 text-green-800 border-green-200", icon: CheckCircle2 },
  needs_review:     { label: "Prüfung empfohlen",    color: "bg-amber-100 text-amber-800 border-amber-200", icon: AlertTriangle },
  imported:         { label: "Importiert",            color: "bg-slate-100 text-slate-700 border-slate-200", icon: Info },
  outside_radius:   { label: "Außerhalb Radius",      color: "bg-orange-100 text-orange-800 border-orange-200", icon: XCircle },
  promoted_to_company: { label: "Übernommen",         color: "bg-blue-100 text-blue-800 border-blue-200", icon: CheckCircle2 },
  rejected:         { label: "Abgelehnt",             color: "bg-red-100 text-red-700 border-red-200", icon: XCircle },
  failed:           { label: "Fehlgeschlagen",        color: "bg-red-100 text-red-700 border-red-200", icon: XCircle },
  duplicate:        { label: "Duplikat",              color: "bg-slate-100 text-slate-500 border-slate-200", icon: Info },
  pending:          { label: "Ausstehend",            color: "bg-slate-100 text-slate-600 border-slate-200", icon: Info },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${cfg.color}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

function ConfidenceBadge({ value }) {
  if (value == null) return null;
  const color = value >= 70 ? "text-green-700 bg-green-50 border-green-200"
    : value >= 40 ? "text-amber-700 bg-amber-50 border-amber-200"
    : "text-red-600 bg-red-50 border-red-200";
  return (
    <span className={`inline-flex items-center text-[11px] font-bold px-2 py-0.5 rounded-full border ${color}`}>
      {Math.round(value)}% Match
    </span>
  );
}

export default function ExternalSourceCard({ source, orgId, onRefetch }) {
  const [loading, setLoading] = useState(false);
  const [showForceWarning, setShowForceWarning] = useState(false);

  // Google Match aus raw_data auslesen
  let googleMatch = null;
  try { googleMatch = JSON.parse(source.raw_data || '{}')._google_match || null; } catch {}
  const phone   = googleMatch?.phone || source.telefon || '';
  const website = googleMatch?.website || source.website || '';
  const address = googleMatch?.address || source.address || '';

  const matchStatus       = source.match_status || 'imported';
  const enrichmentStatus  = source.enrichment_status || 'pending';
  const isPromoted        = matchStatus === 'promoted_to_company';
  const isRejected        = matchStatus === 'rejected';
  const isReadyForReview  = matchStatus === 'ready_for_review';
  const isNeedsReview     = matchStatus === 'needs_review';
  const canPromote        = isReadyForReview || isNeedsReview;
  const canReject         = !isPromoted && !isRejected && matchStatus !== 'failed';

  const handlePromote = async (force = false) => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke("promoteExternalSourceToCompany", {
        organization_id: orgId,
        external_source_id: source.id,
        force_promote: force,
      });
      const data = res.data;
      if (data?.success) {
        toast.success(`"${source.company_name}" wurde als Lead übernommen.`);
        setShowForceWarning(false);
        onRefetch();
      } else if (data?.error === 'company_duplicate') {
        toast.warning("Firma existiert bereits als Lead.");
        onRefetch();
      } else {
        toast.error(data?.error || "Übernahme fehlgeschlagen.");
      }
    } catch (e) {
      toast.error(e?.message || "Übernahme fehlgeschlagen.");
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    setLoading(true);
    try {
      await base44.entities.ExternalCompanySource.update(source.id, {
        match_status: 'rejected',
      });
      toast.info(`"${source.company_name}" abgelehnt.`);
      onRefetch();
    } catch (e) {
      toast.error("Ablehnen fehlgeschlagen.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`bg-white border rounded-xl p-4 shadow-sm transition-all ${isPromoted ? 'opacity-60 border-slate-200' : isRejected ? 'opacity-50 border-slate-200' : 'border-[#E2E8F0] hover:shadow-md'}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0 mt-0.5">
            <Building2 className="w-4 h-4 text-blue-600" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-slate-900 truncate">{source.company_name}</h3>
            <p className="text-xs text-slate-500 font-medium">{source.legal_form || '–'}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1 justify-end shrink-0">
          <StatusBadge status={matchStatus} />
          <ConfidenceBadge value={source.enrichment_confidence} />
        </div>
      </div>

      {/* Details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs mb-3">
        {(source.city || source.address) && (
          <div className="flex items-center gap-1.5 text-slate-600">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">{address || source.address || source.city}</span>
          </div>
        )}
        {source.distance_km != null && (
          <div className="flex items-center gap-1.5 text-slate-600">
            <span className="font-medium">Entfernung:</span>
            <span>{Math.round(source.distance_km * 10) / 10} km</span>
          </div>
        )}
        {phone && (
          <div className="flex items-center gap-1.5 text-slate-600">
            <Phone className="w-3 h-3 shrink-0" />
            <span className="truncate">{phone}</span>
          </div>
        )}
        {website && (
          <div className="flex items-center gap-1.5 text-slate-600">
            <Globe className="w-3 h-3 shrink-0" />
            <a href={website.startsWith('http') ? website : 'https://' + website}
              target="_blank" rel="noopener noreferrer"
              className="truncate text-blue-600 hover:underline">
              {website.replace(/^https?:\/\/(www\.)?/, '')}
            </a>
          </div>
        )}
        {enrichmentStatus === 'pending' && (
          <div className="flex items-center gap-1 text-slate-400 text-[11px] col-span-2">
            <Info className="w-3 h-3" /> Noch nicht mit Google abgeglichen
          </div>
        )}
      </div>

      {/* Promoted info */}
      {isPromoted && source.promoted_company_id && (
        <div className="mb-3">
          <a href={`/leads/${source.promoted_company_id}`}
            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline">
            Lead anzeigen <ChevronRight className="w-3 h-3" />
          </a>
        </div>
      )}

      {/* Force-promote warning */}
      {showForceWarning && (
        <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 space-y-2">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
            <p className="font-medium leading-snug">
              Dieser Treffer hat eine niedrige Übereinstimmung. Bitte prüfen Sie Name, Adresse, Website und Telefon, bevor Sie ihn übernehmen.
            </p>
          </div>
          <div className="flex gap-2 pt-1">
            <Button size="sm" onClick={() => handlePromote(true)} disabled={loading}
              className="bg-amber-600 hover:bg-amber-700 text-white gap-1.5 text-xs h-7">
              {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
              Trotzdem übernehmen
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowForceWarning(false)} className="text-xs h-7">
              Abbrechen
            </Button>
          </div>
        </div>
      )}

      {/* Actions */}
      {!isPromoted && !isRejected && !showForceWarning && (
        <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-100 mt-2">
          {isReadyForReview && (
            <Button size="sm" onClick={() => handlePromote(false)} disabled={loading}
              className="bg-green-600 hover:bg-green-700 text-white gap-1.5 text-xs h-7">
              {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
              Als Lead übernehmen
            </Button>
          )}
          {isNeedsReview && (
            <Button size="sm" onClick={() => setShowForceWarning(true)} disabled={loading}
              className="bg-amber-500 hover:bg-amber-600 text-white gap-1.5 text-xs h-7">
              <AlertTriangle className="w-3 h-3" /> Trotz niedriger Sicherheit übernehmen
            </Button>
          )}
          {canReject && (
            <Button size="sm" variant="outline" onClick={handleReject} disabled={loading}
              className="text-slate-600 border-slate-300 hover:bg-red-50 hover:text-red-700 hover:border-red-300 text-xs h-7">
              Ablehnen
            </Button>
          )}
        </div>
      )}
    </div>
  );
}