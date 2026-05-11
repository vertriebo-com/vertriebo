import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

/**
 * Dialog: Bestätigung bei Branchenwechsel mit bereits gesetzten Zielkunden
 * 
 * Wenn Nutzer die Branche ändert und bereits manuelle Zielkunden gesetzt hat,
 * fragen wir: „Sollen die automatischen Zielkunden aktualisiert werden?"
 */
export default function IndustryChangeConfirmDialog({ 
   isOpen, 
   oldIndustry, 
   newIndustry,
   currentTargetCustomers, // bestehende manuelle Zielkunden
   suggestedTargetCustomers, // Vorschläge für neue Branche
   currentServices = [],
   suggestedServices = [],
   currentExcludedCustomers = [],
   suggestedExcludedCustomers = [],
   onConfirm, // callback: (applySuggestions: boolean) => void
   onCancel
 }) {
  const [isLoading, setIsLoading] = useState(false);

  const handleApplySuggestions = async () => {
    setIsLoading(true);
    await onConfirm(true);
    setIsLoading(false);
  };

  const handleKeepCurrent = async () => {
    setIsLoading(true);
    await onConfirm(false);
    setIsLoading(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={isOpen ? null : onCancel}>
      <DialogContent className="max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl p-0">
        <DialogHeader className="bg-gradient-to-r from-amber-50 to-orange-50 px-6 pt-6 pb-3 border-b border-slate-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <DialogTitle className="text-base text-slate-900">Zielkunden aktualisieren?</DialogTitle>
              <DialogDescription className="text-xs text-slate-600 mt-1">
                Sie haben die Branche von <strong>{oldIndustry}</strong> zu <strong>{newIndustry}</strong> geändert.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 py-5 space-y-4">
          <p className="text-sm font-medium text-slate-900">
            Ihre aktuellen Zielkunden:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {currentTargetCustomers.map(ct => (
              <span key={ct} className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                {ct}
              </span>
            ))}
          </div>

          <div className="border-t border-dashed border-slate-200 pt-4 space-y-3">
            <div>
              <p className="text-sm font-medium text-slate-900 mb-2">
                Vorgeschlagene Zielkunden für {newIndustry}:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {suggestedTargetCustomers.slice(0, 8).map(ct => (
                  <span key={ct} className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 border border-blue-200">
                    {ct}
                  </span>
                ))}
                {suggestedTargetCustomers.length > 8 && (
                  <span className="text-xs px-2 py-1 text-slate-500 font-medium">
                    +{suggestedTargetCustomers.length - 8} weitere
                  </span>
                )}
              </div>
            </div>
            {suggestedServices.length > 0 && (
              <div>
                <p className="text-sm font-medium text-slate-900 mb-2">Vorgeschlagene Leistungen:</p>
                <div className="flex flex-wrap gap-1.5">
                  {suggestedServices.slice(0, 5).map(s => (
                    <span key={s} className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 border border-green-200">
                      {s}
                    </span>
                  ))}
                  {suggestedServices.length > 5 && (
                    <span className="text-xs px-2 py-1 text-slate-500 font-medium">+{suggestedServices.length - 5}</span>
                  )}
                </div>
              </div>
            )}
            {suggestedExcludedCustomers.length > 0 && (
              <div>
                <p className="text-sm font-medium text-slate-900 mb-2">Ausschlüsse:</p>
                <div className="flex flex-wrap gap-1.5">
                  {suggestedExcludedCustomers.slice(0, 5).map(e => (
                    <span key={e} className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700 border border-red-200">
                      {e}
                    </span>
                  ))}
                  {suggestedExcludedCustomers.length > 5 && (
                    <span className="text-xs px-2 py-1 text-slate-500 font-medium">+{suggestedExcludedCustomers.length - 5}</span>
                  )}
                </div>
              </div>
            )}
          </div>

          <p className="text-xs text-slate-500 italic pt-2">
            Sie können die Zielkunden anschließend noch manuell anpassen.
          </p>
        </div>

        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex gap-2 rounded-b-2xl justify-end">
          <Button
            variant="outline"
            onClick={handleKeepCurrent}
            disabled={isLoading}
            className="h-9 text-sm"
          >
            Behalte meine Auswahl
          </Button>
          <Button
            onClick={handleApplySuggestions}
            disabled={isLoading}
            className="h-9 text-sm gap-1.5 bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Wird aktualisiert...
              </>
            ) : (
              <>
                <RefreshCw className="w-3.5 h-3.5" />
                Vorschläge übernehmen
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}