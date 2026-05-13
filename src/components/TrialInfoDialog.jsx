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
  onUpgrade,
  plan = null,
  subscription = null,
  trialEndsAt = null
}) {
  const isFreePreview = trial_stage === 'free_preview';
  const isVerifiedTrial = trial_stage === 'verified_trial';
  const isPaid = trial_stage === 'paid';
  const isLimitReached = isFreePreview && trial_leads_granted >= 10;
  
  const planLimit = plan?.max_leads_per_month ?? 300;
  const planName = plan?.name || 'Starter';
  const planPrice = plan?.price_monthly ? `${(plan.price_monthly / 100).toFixed(0)} €` : '99 €';

  // Dynamische Title-Logik basierend auf trial_stage
  const getDialogTitle = () => {
    if (isFreePreview) {
      return isLimitReached ? 'Vorschau-Limit erreicht' : 'Kostenlose Vorschau';
    }
    if (isVerifiedTrial) {
      return `${planName}-Testphase aktiv`;
    }
    if (isPaid) {
      return `${planName}-Plan aktiv`;
    }
    return 'Abonnement';
  };

  // Dynamische CTA-Logik basierend auf trial_stage
  const getCtaLabel = () => {
    if (isFreePreview) return 'Testzugang aktivieren';
    if (isVerifiedTrial || isPaid) return 'Plan verwalten';
    return 'Zum Billing';
  };

  const getTitleColor = () => {
    if (isLimitReached) return 'text-red-600';
    if (isFreePreview) return 'text-blue-600';
    if (isVerifiedTrial) return 'text-amber-600';
    if (isPaid) return 'text-emerald-600';
    return 'text-slate-900';
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm bg-white border border-slate-200 shadow-xl rounded-2xl">
        <DialogHeader>
          <DialogTitle className={cn(
            'flex items-center gap-2',
            getTitleColor()
          )}>
            <AlertCircle className="w-5 h-5" />
            {getDialogTitle()}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {isFreePreview && (
            <>
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <p className="text-sm text-blue-900 font-bold mb-2">
                  {isLimitReached 
                    ? 'Sie haben Ihre kostenlosen Vorschau-Kontakte genutzt.'
                    : 'Sie testen Vertriebo mit einer begrenzten Vorschau.'}
                </p>
                <p className="text-xs text-blue-900 font-medium">
                      {isLimitReached
                        ? `Sie haben alle 10 Firmenkontakte der kostenlosen Vorschau aufgebraucht.`
                        : `Sie können bis zu 10 Firmenkontakte zum Ausprobieren prüfen (${trial_leads_granted} / 10 genutzt).`}
                    </p>
              </div>

              {!isLimitReached && (
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <p className="text-xs text-slate-800 font-bold">
                    <strong>Bereit für mehr?</strong> Aktivieren Sie den verifizierten Testzugang für:
                  </p>
                  <ul className="text-xs text-slate-700 font-medium mt-2 space-y-1 ml-4">
                    <li>✓ {planLimit === -1 ? 'Unbegrenzte' : `Bis zu ${planLimit}`} Firmenkontakte pro Abrechnungszeitraum</li>
                    <li>✓ Vollständige Kontaktdaten</li>
                    <li>✓ KI-Analysen</li>
                    <li>✓ 14 Tage kostenloses Testen</li>
                  </ul>
                </div>
              )}

              {isLimitReached && (
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <p className="text-xs text-slate-800 font-bold mb-2">
                    Was bietet der verifizierte Testzugang?
                  </p>
                  <ul className="text-xs text-slate-700 font-medium space-y-1 ml-4">
                    <li>✓ {planLimit === -1 ? 'Unbegrenzte' : `Bis zu ${planLimit}`} Firmenkontakte pro Abrechnungszeitraum</li>
                    <li>✓ Vollständige Kontaktinformationen</li>
                    <li>✓ KI-Analysen</li>
                    <li>✓ 14 Tage kostenloses Testen</li>
                  </ul>
                </div>
              )}
            </>
          )}

          {isVerifiedTrial && plan && (
            <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                <p className="text-sm text-amber-900 font-bold mb-2">
                  {planName}-Testphase aktiv
                </p>
                <p className="text-xs text-amber-900 font-medium mb-3">
                Sie testen den {planName}-Tarif mit bis zu {planLimit === -1 ? 'unbegrenzten' : planLimit} Firmenkontakten pro Abrechnungszeitraum.
              </p>
              {trialEndsAt && (
                <p className="text-xs text-amber-900 font-medium">
                  <strong>Testphase endet am:</strong> {new Date(trialEndsAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </p>
              )}
              {!trialEndsAt && (
                <p className="text-xs text-amber-900 font-medium">
                  Nach Ablauf der Testphase wird Ihr {planName}-Abo für {planPrice}/Monat aktiviert, wenn Sie nicht kündigen.
                </p>
              )}
            </div>
          )}

          {isPaid && plan && (
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <p className="text-sm text-green-900 font-bold mb-2">
                {planName}-Plan aktiv
              </p>
              <p className="text-xs text-green-900 font-medium">
                Sie haben {planLimit === -1 ? 'unbegrenzte' : `bis zu ${planLimit}`} Firmenkontakte pro Monat.
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-2 border-t border-slate-200 pt-4">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"
          >
            Schließen
          </Button>
          {(isFreePreview || isVerifiedTrial) && (
            <Button
              onClick={() => {
                onClose();
                if (onUpgrade) {
                  onUpgrade();
                } else {
                  window.location.href = "/settings?tab=billing";
                }
              }}
              className={cn(
                "flex-1 text-white gap-1",
                isFreePreview ? "bg-blue-600 hover:bg-blue-700" : "bg-amber-600 hover:bg-amber-700"
              )}
            >
              {getCtaLabel()}
              <ArrowRight className="w-3 h-3" />
            </Button>
          )}
          {isPaid && (
            <Button
              onClick={() => {
                onClose();
                window.location.href = "/settings?tab=billing";
              }}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
            >
              {getCtaLabel()}
              <ArrowRight className="w-3 h-3" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}