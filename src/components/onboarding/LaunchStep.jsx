import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Zap, CheckCircle2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function LaunchStep({ onBack, onLaunch, loading, organization, orgId }) {
  const [isSearching, setIsSearching] = useState(false);
  const [researchRunId, setResearchRunId] = useState(null);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("Starte Recherche...");
  const [leadsFound, setLeadsFound] = useState(0);
  const [isDone, setIsDone] = useState(false);
  const [availableLimit, setAvailableLimit] = useState(null);

  // Load available trial/plan limit on mount
  useEffect(() => {
    const loadLimit = async () => {
      try {
        const dashboardData = await base44.functions.invoke('getDashboardData', {});
        const maxContacts = dashboardData?.meta?.maxContacts || 300;
        const usedContacts = dashboardData?.meta?.currentUsage?.leads_created || 0;
        const available = maxContacts === -1 ? 'unbegrenzt' : Math.max(0, maxContacts - usedContacts);
        setAvailableLimit(available);
      } catch (e) {
        console.warn('[LaunchStep] Limit load failed:', e.message);
      }
    };
    loadLimit();
  }, []);

  // Polling for research run status
  useEffect(() => {
    if (!researchRunId || isDone) return;

    let polling = true;
    const pollStatus = async () => {
      while (polling && !isDone) {
        try {
          const status = await base44.functions.invoke('getResearchRunStatus', {
            research_run_id: researchRunId,
          });
          
          const data = status.data;
          if (data) {
            setProgress(data.progress_percent || 0);
            setMessage(data.current_step || 'Recherche läuft...');
            setLeadsFound(data.leads_saved || 0);

            // Check if done
            if (data.done || ['completed', 'partial', 'failed'].includes(data.status)) {
              setIsDone(true);
              polling = false;
              // Wait a bit then call onLaunchComplete
              setTimeout(() => {
                onLaunch(data);
              }, 1000);
            }
          }
        } catch (e) {
          console.warn('[LaunchStep] Polling error:', e.message);
        }
        await new Promise(r => setTimeout(r, 2500));
      }
    };
    pollStatus();

    return () => { polling = false; }; // Cleanup
  }, [researchRunId, isDone, onLaunch]);

  const handleClick = async () => {
    setIsSearching(true);
    try {
      // Start research run (async, queued status)
      const run = await base44.functions.invoke('startResearchRun', {
        organization_id: orgId,
        target_count: typeof availableLimit === 'number' ? Math.min(10, availableLimit) : 10,
      });
      
      if (run.data?.research_run_id) {
        setResearchRunId(run.data.research_run_id);
        setMessage('Recherche wird vorbereitet...');
      } else {
        throw new Error('Kein ResearchRun erstellt');
      }
    } catch (e) {
      console.error('[LaunchStep] Start error:', e.message);
      setIsSearching(false);
      onLaunch({ error: e.message });
    }
  };

  if (isSearching && researchRunId) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-6">
        {/* Progress Spinner or Check */}
        {isDone ? (
          <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
        ) : (
          <div className="animate-spin w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full mx-auto" />
        )}

        {/* Title */}
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            {isDone ? 'Recherche abgeschlossen!' : 'Wir suchen passende Unternehmen...'}
          </h2>
          <p className="text-sm font-medium text-slate-600">
            {isDone ? 'Gleich gehts weiter zu Ihren Leads' : 'Das dauert etwa 30–60 Sekunden'}
          </p>
        </div>

        {/* Progress Bar */}
        {!isDone && (
          <div className="w-full max-w-md mx-auto">
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-600 transition-all duration-500"
                style={{ width: `${Math.max(5, progress)}%` }}
              />
            </div>
            <p className="text-xs text-slate-600 mt-2 font-medium">{Math.round(progress)}% abgeschlossen</p>
          </div>
        )}

        {/* Live Status */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-blue-900 mb-1">{message}</p>
          {leadsFound > 0 && (
            <p className="text-xs text-blue-700">
              {leadsFound} {leadsFound === 1 ? 'Firmenkontakt' : 'Firmenkontakte'} gefunden
            </p>
          )}
        </div>

        {/* Steps */}
        {!isDone && (
          <div className="space-y-2 text-sm text-slate-700">
            <div className="flex items-center gap-2 justify-center">
              <span className={`w-2 h-2 rounded-full ${progress > 10 ? 'bg-green-500' : 'bg-blue-500 animate-pulse'}`} />
              Suchgebiet wird analysiert
            </div>
            <div className="flex items-center gap-2 justify-center">
              <span className={`w-2 h-2 rounded-full ${progress > 40 ? 'bg-green-500' : 'bg-slate-300'}`} />
              Unternehmen werden bewertet
            </div>
            <div className="flex items-center gap-2 justify-center">
              <span className={`w-2 h-2 rounded-full ${progress > 80 ? 'bg-green-500' : 'bg-slate-300'}`} />
              Duplikate werden gefiltert
            </div>
          </div>
        )}

        {isDone && (
          <p className="text-xs text-slate-500">Weiterleitung erfolgt automatisch...</p>
        )}
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
          <p className="font-semibold text-blue-900">
            {typeof availableLimit === 'number' 
              ? `${availableLimit} Firmenkontakte verfügbar`
              : availableLimit === 'unbegrenzt'
              ? 'Unbegrenzte Firmenkontakte'
              : 'Firmenkontakte verfügbar'}
          </p>
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