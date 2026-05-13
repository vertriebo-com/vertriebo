import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Zap, CheckCircle2, ArrowRight } from "lucide-react";

export default function LaunchStep({ onBack, onLaunch, loading, organization }) {
  const [isSearching, setIsSearching] = useState(false);

  const handleClick = async () => {
    setIsSearching(true);
    await onLaunch();
  };

  if (isSearching) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-6">
        <div className="animate-spin w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full mx-auto" />
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Wir suchen passende Unternehmen für Sie...</h2>
          <p className="text-sm font-medium text-slate-600">Das dauert etwa 30–60 Sekunden</p>
        </div>

        <div className="space-y-2 text-sm text-slate-700">
          <div className="flex items-center gap-2 justify-center">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            Suchgebiet wird analysiert
          </div>
          <div className="flex items-center gap-2 justify-center">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            Unternehmen werden bewertet
          </div>
          <div className="flex items-center gap-2 justify-center">
            <span className="w-2 h-2 rounded-full bg-slate-300" />
            Duplikate werden gefiltert
          </div>
        </div>

        <p className="text-xs text-slate-500 mt-6">Bitte nicht schließen...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-6">
        <div className="w-16 h-16 mx-auto bg-blue-100 rounded-2xl flex items-center justify-center">
          <Zap className="w-8 h-8 text-blue-600" />
        </div>

        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">✨ Fast bereit!</h2>
          <p className="text-slate-600 font-medium">Starten Sie jetzt Ihre erste Recherche</p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-2">
          <p className="font-semibold text-blue-900">Bis zu 10 kostenlose Firmenkontakte</p>
          <p className="text-sm text-blue-800">Wir durchsuchen Ihr Gebiet und filtern automatisch passende Unternehmen aus.</p>
        </div>

        <div className="space-y-2 text-sm text-left max-w-sm mx-auto">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
            <span className="text-slate-700"><strong>Branche:</strong> {organization?.industry}</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
            <span className="text-slate-700"><strong>Profil:</strong> Komplett ausgefüllt</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
            <span className="text-slate-700"><strong>Trial:</strong> 14 Tage kostenlos</span>
          </div>
        </div>

        <Button
          onClick={handleClick}
          disabled={loading}
          className="w-full gap-2 bg-blue-600 hover:bg-blue-700 h-12 text-base font-semibold"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-5 h-5" />}
          Erste Firmenkontakte finden
        </Button>

        <p className="text-xs text-slate-500">Nach der Recherche sehen Sie sofort Ihre Leads im Dashboard.</p>
      </div>

      {/* Upgrade Info */}
      <div className="bg-gradient-to-r from-slate-50 to-slate-100 border border-slate-200 rounded-xl p-4">
        <p className="text-xs font-semibold text-slate-700 mb-2">💡 Upgrade Tipp</p>
        <p className="text-xs text-slate-600 mb-3">Mit dem 14-Tage-Testzugang erhalten Sie:</p>
        <ul className="text-xs text-slate-600 space-y-1 mb-3">
          <li>✓ Bis zu 75 Firmenkontakte pro Recherche</li>
          <li>✓ Unbegrenzte KI-Analysen</li>
          <li>✓ Automatische E-Mail-Vorlagen</li>
        </ul>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={onBack} disabled={loading}>Zurück</Button>
      </div>
    </div>
  );
}