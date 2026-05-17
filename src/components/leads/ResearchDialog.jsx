/**
 * ResearchDialog – Asynchrone ResearchRun Engine
 * 1. Klick → startResearchRun (sofort zurück)
 * 2. Dialog zeigt Fortschritt
 * 3. Frontend pollt alle 3s processResearchRun (kleiner Batch)
 * 4. Bei done=true → Erfolg anzeigen, onSuccess triggern
 */
import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, CheckCircle2, XCircle, X } from "lucide-react";

const POLL_INTERVAL_MS = 3000;

export default function ResearchDialog({ open, orgId, onClose, onSuccess }) {
  const [phase, setPhase] = useState("idle"); // idle | starting | running | done | error
  const [researchRunId, setResearchRunId] = useState(null);
  const [progressPercent, setProgressPercent] = useState(0);
  const [leadsSaved, setLeadsSaved] = useState(0);
  const [currentStep, setCurrentStep] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const pollRef = useRef(null);
  const processingRef = useRef(false);

  // Reset wenn Dialog aufgeht
  useEffect(() => {
    if (open) {
      setPhase("idle");
      setResearchRunId(null);
      setProgressPercent(0);
      setLeadsSaved(0);
      setCurrentStep("");
      setErrorMsg("");
    } else {
      stopPolling();
    }
  }, [open]);

  // Cleanup on unmount
  useEffect(() => () => stopPolling(), []);

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  // ── Schritt 1: Research starten ──────────────────────────────────────────
  const handleStart = async () => {
    setPhase("starting");
    setErrorMsg("");

    try {
      const res = await base44.functions.invoke("startResearchRun", {
        organization_id: orgId,
        target_count: 25,
      });

      if (!res?.data?.success) {
        const msg = res?.data?.message || res?.data?.error || "Start fehlgeschlagen.";
        setErrorMsg(msg);
        setPhase("error");
        return;
      }

      const runId = res.data.research_run_id;
      setResearchRunId(runId);
      setPhase("running");
      setCurrentStep("Recherche wird gestartet…");
      setProgressPercent(5);

      // Polling starten
      startPolling(runId);

    } catch (err) {
      setErrorMsg(err?.message || "Unbekannter Fehler beim Starten.");
      setPhase("error");
    }
  };

  // ── Schritt 2: Polling → processResearchRun aufrufen ────────────────────
  function startPolling(runId) {
    pollRef.current = setInterval(() => {
      triggerBatch(runId);
    }, POLL_INTERVAL_MS);
  }

  const triggerBatch = async (runId) => {
    if (processingRef.current) return;
    processingRef.current = true;

    try {
      const res = await base44.functions.invoke("processResearchRun", {
        research_run_id: runId,
        organization_id: orgId,
      });

      const data = res?.data;
      if (!data) return;

      setProgressPercent(data.progress_percent || 0);
      setLeadsSaved(data.leads_saved || 0);
      setCurrentStep(data.current_step || data.message || "");

      if (data.done) {
        stopPolling();
        setPhase("done");
        onSuccess?.();
      }

    } catch (err) {
      console.error("[ResearchDialog] Batch error:", err?.message);
      // Nicht sofort als Fehler werten – nächster Poll-Cycle versucht es nochmal
    } finally {
      processingRef.current = false;
    }
  };

  // ── Schließen ────────────────────────────────────────────────────────────
  const handleClose = () => {
    if (phase === "running") {
      // Recherche läuft im Hintergrund weiter – Banner zeigt Fortschritt
      stopPolling();
    }
    onClose?.();
  };

  // ── UI ───────────────────────────────────────────────────────────────────
  const isRunning = phase === "running";
  const isDone = phase === "done";
  const isError = phase === "error";
  const isStarting = phase === "starting";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <Sparkles className="w-5 h-5 text-blue-600" />
              Firmen recherchieren
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="py-2 space-y-5">

          {/* IDLE: Startansicht */}
          {phase === "idle" && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                Vertriebo sucht automatisch passende Firmenkontakte in Ihrem Suchgebiet basierend auf Ihren Einstellungen.
              </p>
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-sm text-blue-800 space-y-1">
                <div className="font-semibold">Die Recherche läuft im Hintergrund.</div>
                <div className="text-blue-600 text-xs">Erste Kontakte erscheinen automatisch in Ihrer Leadliste – Sie können den Dialog schließen.</div>
              </div>
              <Button
                onClick={handleStart}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-2"
                size="lg"
              >
                <Sparkles className="w-4 h-4" />
                Recherche starten
              </Button>
            </div>
          )}

          {/* STARTING: Kurzer Spinner */}
          {isStarting && (
            <div className="flex flex-col items-center gap-3 py-4">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              <p className="text-sm font-medium text-slate-700">Recherche wird gestartet…</p>
            </div>
          )}

          {/* RUNNING: Fortschritt */}
          {isRunning && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin text-blue-500 shrink-0" />
                <div>
                  <div className="text-sm font-semibold text-slate-900">Recherche läuft im Hintergrund</div>
                  <div className="text-xs text-slate-500 mt-0.5">{currentStep || "Firmenprofile werden gesucht…"}</div>
                </div>
              </div>

              {/* Progressbar */}
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-700"
                  style={{ width: `${Math.max(5, progressPercent)}%` }}
                />
              </div>

              {leadsSaved > 0 && (
                <div className="flex items-center gap-2 text-sm text-emerald-700 font-medium bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  {leadsSaved} neue Firmenkontakte bereits gefunden
                </div>
              )}

              <p className="text-xs text-slate-400 text-center">
                Sie können diesen Dialog schließen – die Recherche läuft weiter.
              </p>

              <Button variant="outline" onClick={handleClose} className="w-full">
                Dialog schließen (Recherche läuft weiter)
              </Button>
            </div>
          )}

          {/* DONE: Abgeschlossen */}
          {isDone && (
            <div className="space-y-4">
              {leadsSaved > 0 ? (
                <div className="flex flex-col items-center gap-2 py-2 text-center">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                  <div className="text-lg font-bold text-slate-900">{leadsSaved} neue Firmenkontakte</div>
                  <div className="text-sm text-slate-500">wurden erfolgreich in Ihre Leadliste aufgenommen.</div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 py-2 text-center">
                  <CheckCircle2 className="w-10 h-10 text-slate-300" />
                  <div className="text-base font-semibold text-slate-700">Keine neuen Kontakte gefunden</div>
                  <div className="text-sm text-slate-500">Bitte erweitern Sie den Radius oder passen Sie Ihre Zielkunden in den Einstellungen an.</div>
                </div>
              )}
              <Button onClick={handleClose} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                Schließen
              </Button>
            </div>
          )}

          {/* ERROR */}
          {isError && (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-2 py-2 text-center">
                <XCircle className="w-10 h-10 text-red-400" />
                <div className="text-sm font-semibold text-red-700">{errorMsg}</div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleClose} className="flex-1">Schließen</Button>
                <Button onClick={() => setPhase("idle")} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
                  Erneut versuchen
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}