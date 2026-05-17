/**
 * ActiveResearchBanner
 * ====================
 * Zeigt Fortschrittsbalken während ein ResearchRun läuft.
 *
 * WICHTIG – Koordination mit ResearchDialog:
 * - Wenn ein Processing-Lock aktiv ist (run.processing_lock_until in Zukunft),
 *   verarbeitet der Banner NICHT selbst → verhindert parallele Duplikate.
 * - Banner ruft processResearchRun nur auf wenn KEIN aktiver Lock existiert.
 * - ResearchDialog ist der primäre Worker solange er offen ist.
 * - Banner übernimmt als Fallback wenn Dialog geschlossen wurde.
 */
import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, CheckCircle2, X } from "lucide-react";

const POLL_MS = 5000; // Etwas längerer Interval als ResearchDialog (3s), um Kollisionen zu reduzieren
const STALE_TIMEOUT_MS = 90000;

export default function ActiveResearchBanner({ orgId, onNewLeads }) {
  const [activeRun, setActiveRun] = useState(null);
  const [dismissed, setDismissed] = useState(null);
  const lastLeadsSavedRef = useRef(0);
  const processingRef = useRef(false);
  const retryCountRef = useRef(0);
  const MAX_RETRIES = 3;

  useEffect(() => {
    if (!orgId) return;
    tickLoop();
    const interval = setInterval(tickLoop, POLL_MS);
    return () => clearInterval(interval);
  }, [orgId]);

  const tickLoop = async () => {
    if (processingRef.current) return;
    processingRef.current = true;
    try {
      const runs = await base44.entities.ResearchRun.filter(
        { organization_id: orgId }, '-created_date', 3
      );
      const running = runs.find(r => r.status === 'queued' || r.status === 'running');
      const recentDone = runs.find(r => {
        if (!['completed', 'partial', 'failed'].includes(r.status)) return false;
        const ts = r.finished_at ? new Date(r.finished_at).getTime() : new Date(r.updated_date).getTime();
        return Date.now() - ts < 30000;
      });

      if (running) {
        // ── Lock-Prüfung: Aktiver Worker läuft bereits (z.B. ResearchDialog) ──
        const lockUntil = running.processing_lock_until ? new Date(running.processing_lock_until).getTime() : 0;
        const isLockActive = lockUntil > Date.now();

        // Stale-Check
        const lastUpdate = running.updated_date ? new Date(running.updated_date).getTime() : Date.now();
        const isStale = Date.now() - lastUpdate > STALE_TIMEOUT_MS;

        if (isStale && retryCountRef.current >= MAX_RETRIES) {
          // Stale + zu viele Retries → forcierter Abschluss
          console.warn('[ActiveResearchBanner] Stale run, forcing finish:', running.id);
          await base44.functions.invoke('processResearchRun', {
            research_run_id: running.id,
            organization_id: orgId,
            force_finish: true,
          }).catch(() => {});
          retryCountRef.current = 0;
          return;
        }

        // ── Wenn Lock aktiv: nur anzeigen, NICHT selbst verarbeiten ──────────
        if (isLockActive) {
          // Anderer Worker (ResearchDialog) ist aktiv → nur UI aktualisieren
          setActiveRun({
            id: running.id,
            status: running.status,
            leads_saved: running.leads_saved ?? 0,
            progress_percent: running.progress_percent ?? 5,
            message: running.current_step || 'Recherche läuft…',
          });

          if ((running.leads_saved || 0) > lastLeadsSavedRef.current) {
            lastLeadsSavedRef.current = running.leads_saved || 0;
            onNewLeads?.();
          }
          return;
        }

        // ── Kein Lock aktiv → Banner kann selbst verarbeiten (Dialog geschlossen) ──
        const res = await base44.functions.invoke('processResearchRun', {
          research_run_id: running.id,
          organization_id: orgId,
        });
        const data = res?.data;

        if (data?.leads_saved > lastLeadsSavedRef.current) {
          lastLeadsSavedRef.current = data.leads_saved;
          retryCountRef.current = 0;
          onNewLeads?.();
        } else if (!isStale && !data?.already_processing) {
          retryCountRef.current++;
        }

        if (data?.done || ['completed', 'partial', 'failed'].includes(data?.status)) {
          setActiveRun({
            id: running.id,
            status: data.status || 'completed',
            leads_saved: data.leads_saved || running.leads_saved || 0,
            progress_percent: 100,
            message: (data.leads_saved || 0) > 0
              ? `${data.leads_saved} neue Firmenkontakte gefunden`
              : 'Keine neuen Kontakte gefunden',
          });
          lastLeadsSavedRef.current = 0;
          onNewLeads?.();
          return;
        }

        setActiveRun({
          id: running.id,
          status: running.status,
          leads_saved: data?.leads_saved ?? running.leads_saved ?? 0,
          progress_percent: data?.progress_percent ?? running.progress_percent ?? 0,
          message: data?.current_step || running.current_step || 'Recherche läuft…',
        });

      } else if (recentDone && recentDone.id !== dismissed) {
        setActiveRun({
          id: recentDone.id,
          status: recentDone.status,
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
      console.warn('[ActiveResearchBanner] tick error:', e?.message);
    } finally {
      processingRef.current = false;
    }
  };

  if (!activeRun) return null;

  const isDone = ['completed', 'partial', 'failed'].includes(activeRun.status);
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