import React from 'react';
import { AlertCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export default function TrialInfoDialog({ 
  isOpen, 
  onClose, 
  trial_stage, 
  trial_leads_granted = 0,
  onUpgrade 
}) {
  const isFreePreview = trial_stage === 'free_preview';
  const isLimitReached = isFreePreview && trial_leads_granted >= 3;

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm bg-white border border-slate-200 shadow-xl rounded-2xl">
        <DialogHeader>
          <DialogTitle className={cn(
            'flex items-center gap-2',
            isLimitReached ? 'text-red-600' : 'text-blue-600'
          )}>
            <AlertCircle className="w-5 h-5" />
            {isLimitReached ? 'Vorschau-Limit erreicht' : 'Kostenlose Vorschau'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {isFreePreview && (
            <>
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <p className="text-sm text-blue-900 font-medium mb-2">
                  {isLimitReached 
                    ? 'Sie haben Ihre kostenlosen Vorschau-Kontakte genutzt.'
                    : 'Sie testen Vertriebo mit einer begrenzten Vorschau.'}
                </p>
                <p className="text-xs text-blue-800">
                  {isLimitReached
                    ? `Sie haben alle 3 kostenlosen Vorschau-Kontakte aufgebraucht.`
                    : `Sie können bis zu 3 Firmenkontakte prüfen (${trial_leads_granted} / 3 genutzt).`}
                </p>
              </div>

              {!isLimitReached && (
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <p className="text-xs text-slate-700">
                    <strong>Bereit für mehr?</strong> Aktivieren Sie den verifizierten Testzugang für:
                  </p>
                  <ul className="text-xs text-slate-600 mt-2 space-y-1 ml-4">
                    <li>✓ 25 Firmenkontakte testen</li>
                    <li>✓ Vollständige Kontaktdaten</li>
                    <li>✓ 5 KI-Analysen</li>
                    <li>✓ 14 Tage kostenloses Testen</li>
                  </ul>
                </div>
              )}

              {isLimitReached && (
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <p className="text-xs text-slate-700 font-medium mb-2">
                    Was bietet der verifizierte Testzugang?
                  </p>
                  <ul className="text-xs text-slate-600 space-y-1 ml-4">
                    <li>✓ Bis zu 25 Firmenkontakte</li>
                    <li>✓ Vollständige Kontaktinformationen</li>
                    <li>✓ Unbegrenzte KI-Analysen</li>
                    <li>✓ 14 Tage kostenloses Testen</li>
                  </ul>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex gap-2 border-t border-slate-200 pt-4">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"
          >
            Später
          </Button>
          <Button
            onClick={() => {
              onUpgrade?.();
              onClose();
            }}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white gap-1"
          >
            Testzugang aktivieren
            <ArrowRight className="w-3 h-3" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}