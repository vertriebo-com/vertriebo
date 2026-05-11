import { Target, MapPin, Sparkles, CheckCircle2 } from "lucide-react";

export default function RelevanceSection({ company }) {
  if (!company) return null;

  // Relevanz-Infos aus Company extrahieren
  const targetCustomer = company.matched_target_customer_type || company.branche || "–";
  const reason = company.relevance_reason || "Automatisch gefunden";
  const distance = company.distance_km !== null ? `${company.distance_km.toFixed(1)} km` : "–";
  const searchArea = company.search_center_city || "–";
  const searchRadius = company.search_radius_km || 25;

  return (
    <div className="bg-gradient-to-r from-blue-50 to-blue-50 border border-blue-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
          <Target className="w-4 h-4 text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-blue-900 mb-2.5">Warum dieser Lead?</h3>
          <div className="space-y-2">
            {/* Zielkunde */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-blue-800">Zielkunde:</span>
              <span className="text-sm font-semibold text-blue-900">{targetCustomer}</span>
            </div>

            {/* Passt wegen */}
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-medium text-blue-800 flex-shrink-0">Passt wegen:</span>
              <span className="text-sm text-blue-800 text-right leading-snug">{reason}</span>
            </div>

            {/* Entfernung */}
            {distance !== "–" && (
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-blue-800">Entfernung:</span>
                <span className="text-sm font-semibold text-blue-900 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-blue-600" /> {distance}
                </span>
              </div>
            )}

            {/* Suchgebiet */}
            {searchArea !== "–" && (
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-blue-800">Suchgebiet:</span>
                <span className="text-sm font-semibold text-blue-900">
                  {searchRadius} km um {searchArea}
                </span>
              </div>
            )}

            {/* Quelle */}
            <div className="flex items-center justify-between pt-1.5 border-t border-blue-200">
              <span className="text-xs font-medium text-blue-700 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> Gefunden durch:
              </span>
              <span className="text-xs font-semibold text-blue-900">Vertriebo-Recherche</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}