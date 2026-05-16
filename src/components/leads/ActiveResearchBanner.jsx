/**
 * ActiveResearchBanner
 * Zeigt einen Fortschrittsbalken auf der Leads-Seite während ein ResearchRun läuft.
 * Pollt alle 3s den Status und triggert onNewLeads wenn neue Companies gefunden wurden.
 */
import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, CheckCircle2, X, Sparkles } from "lucide-react";

const POLL_MS = 3000;

export default function ActiveResearchBanner({ orgId, onNewLeads }) {
  const [activeRun, setActiveRun] = useState(null); // null | { id, status, leads_saved, progress_percent, message }
  const [dismissed, setDismissed] = useState(null); // run_id des dismissten Runs
  const pollRef = useRef(null);
  const lastLeadsSavedRef = useRef(0);
  const checkingRef = useRef(false);

  // Suche nach aktiven Runs beim Mount und dann periodisch
  useEffect(() => {
    if (!orgId) return;
    checkForActiveRun();
    const interval = setInterval(checkForActiveRun, POLL_MS);
    return () => { clearInterval(interval); if (pollRef.current) clearTimeout(pollRef.current); };
  }, [orgId]);

  const checkForActiveRun = async () => {
    if (checkingRef.current) return;
    checkingRef.current = true;
    try {
      // Lade neueste ResearchRuns für diese Org
      const runs = await base44.entities.ResearchRun.filter(
        { organization_id: orgId },
        '-created_date',
        3
      );
      // Suche nach laufendem Run (queued oder running)
      const running = runs.find(r => r.status === 'queued' || r.status === 'running');
      // Zuletzt abgeschlossener Run (für 30s noch anzeigen)
      const recentDone = runs.find(r => {
        if (r.status !== 'completed') return false;
        const finishedAt = r.finished_at ? new Date(r.finished_at).getTime() : new Date(r.updated_date).getTime();
        return Date.now() - finishedAt < 30000;
      });

      if (running) {
        const newRun = {
          id: running.id,
          status: running.status,
          leads_saved: running.leads_saved || 0,
          progress_percent: running.progress_percent || 0,
          message: running.current_step || 'Recherche läuft…',
        };
        setActiveRun(newRun);

        // Neue Leads gefunden → onNewLeads triggern
        if (newRun.leads_saved > lastLeadsSavedRef.current) {
          lastLeadsSavedRef.current = newRun.leads_saved;
          onNewLeads?.();
        }
      } else if (recentDone && recentDone.id !== dismissed) {
        setActiveRun({
          id: recentDone.id,
          status: 'completed',
          leads_saved: recentDone.leads_saved || 0,
          progress_percent: 100,
          message: (recentDone.leads_saved || 0) > 0
            ? `${recentDone.leads_saved} neue Firmenkontakte gefunden`
            : 'Keine neuen Kontakte gefunden',
        });
        lastLeadsSavedRef.current = 0;
      } else if (!running && !recentDone) {
        setActiveRun(null);
        lastLeadsSavedRef.current = 0;
      }
    } catch (e) {
      // Stille Fehler – Banner nicht kritisch
    } finally {
      checkingRef.current = false;
    }
  };

  if (!activeRun) return null;

  const isDone = activeRun.status === 'completed';
  const isRunning = activeRun.status === 'running' || activeRun.status === 'queued';

  return (
    <div className={`rounded-xl border p-3 ${isDone ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {isRunning ? (
            <Loader2 className="w-4 h-4 animate-spin text-blue-500 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
          )}
          <div className="min-w-0">
            <div className={`text-sm font-semibold truncate ${isDone ? 'text-green-900' : 'text-blue-900'}`}>
              {isRunning ? 'Recherche läuft im Hintergrund' : 'Recherche abgeschlossen'}
            </div>
            <div className={`text-xs mt-0.5 truncate ${isDone ? 'text-green-700' : 'text-blue-600'}`}>
              {activeRun.message}
            </div>
          </div>
        </div>

        {isDone && (
          <button
            onClick={() => { setDismissed(activeRun.id); setActiveRun(null); }}
            className="text-slate-400 hover:text-slate-600 shrink-0 p-1 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Progress Bar (nur wenn running) */}
      {isRunning && (
        <div className="mt-2.5">
          <div className="w-full bg-blue-100 rounded-full h-1.5">
            <div
              className="bg-blue-500 h-1.5 rounded-full transition-all duration-700"
              style={{ width: `${Math.max(5, activeRun.progress_percent)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}