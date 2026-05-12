import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import TrialStatusBanner from "@/components/TrialStatusBanner";
import {
  CreditCard, Mail, Brain, Search, Database,
  AlertTriangle, CheckCircle2, Clock, ExternalLink, Loader2, RefreshCw, Sparkles, ArrowRight
} from "lucide-react";

const BILLING_STATUS_CONFIG = {
  active:             { label: "Aktiv",              color: "bg-green-100 text-green-700 border-green-200",   icon: CheckCircle2 },
  trialing:           { label: "Trial",              color: "bg-blue-100 text-blue-700 border-blue-200",     icon: Clock },
  past_due:           { label: "Zahlung überfällig", color: "bg-red-100 text-red-700 border-red-200",        icon: AlertTriangle },
  unpaid:             { label: "Unbezahlt",          color: "bg-red-100 text-red-700 border-red-200",        icon: AlertTriangle },
  canceled:           { label: "Gekündigt",          color: "bg-gray-100 text-gray-600 border-gray-200",     icon: AlertTriangle },
  incomplete:         { label: "Unvollständig",      color: "bg-yellow-100 text-yellow-700 border-yellow-200", icon: AlertTriangle },
  incomplete_expired: { label: "Abgelaufen",         color: "bg-gray-100 text-gray-600 border-gray-200",     icon: AlertTriangle },
};

function formatDate(iso) {
  if (!iso) return "–";
  return new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function UsageBar({ label, icon: Icon, used, max, color = "bg-blue-500" }) {
  const pct = max === -1 ? 0 : Math.min(100, Math.round((used / max) * 100));
  const isUnlimited = max === -1;
  const isWarning = !isUnlimited && pct >= 80;
  const isDanger = !isUnlimited && pct >= 95;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <Icon className="w-4 h-4 text-slate-600" /> {label}
        </span>
        <span className={`text-sm font-bold ${isDanger ? "text-red-600" : isWarning ? "text-amber-600" : "text-slate-950"}`}>
          {isUnlimited ? <span className="text-emerald-600">∞ Unbegrenzt</span> : `${used} / ${max}`}
        </span>
      </div>
      {!isUnlimited && (
        <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${isDanger ? "bg-red-500" : isWarning ? "bg-amber-500" : color}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
      {!isUnlimited && (
        <p className="text-[11px] font-medium text-slate-500">{Math.max(0, max - used)} verbleibend</p>
      )}
    </div>
  );
}

export default function BillingSettings({ org: orgProp, user }) {
  const [org, setOrg] = useState(orgProp);
  const [plan, setPlan] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [usageLog, setUsageLog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [allPlans, setAllPlans] = useState([]);
  const [checkoutLoading, setCheckoutLoading] = useState(null); // plan_id being checked out

  const loadData = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const [orgs, subs] = await Promise.all([
        base44.entities.Organization.filter({ id: org?.id || orgProp?.id }),
        base44.entities.Subscription.filter({ organization_id: org?.id || orgProp?.id }),
      ]);
      const freshOrg = orgs[0] || org;
      setOrg(freshOrg);

      const sub = subs[0] || null;
      setSubscription(sub);

      // Plan laden
      const planId = freshOrg?.plan_id;
      if (planId) {
        const plans = await base44.entities.Plan.filter({ id: planId });
        setPlan(plans[0] || null);
      }

      // Alle aktiven Pläne laden (für Plan-Auswahl)
      const availablePlans = await base44.entities.Plan.filter({ is_active: true });
      const standardPlans = availablePlans
        .filter(p => p.plan_type === 'standard' && p.stripe_price_id)
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      setAllPlans(standardPlans);

      // Aktuellen UsageLog laden – nach period_month filtern (zuverlässiger als period_start-Datumsvergleich)
      const now = new Date();
      const periodMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const usageLogs = await base44.entities.UsageLog.filter({
        organization_id: freshOrg.id,
        period_month: periodMonth,
      });
      setUsageLog(usageLogs[0] || null);
      console.log(`[BillingSettings] UsageLog für ${periodMonth}:`, usageLogs[0] || "nicht gefunden");
    } catch (e) {
      toast.error("Fehler beim Laden der Billing-Daten: " + e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // Auto-refresh nach erfolgreichem Checkout
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") === "success") {
      loadData(true); // Refresh mit Loading-Indikator
      window.dispatchEvent(new CustomEvent("checkout-success")); // Event für andere Components (z.B. Dashboard)
      // URL clean up (optional)
      window.history.replaceState({}, document.title, window.location.pathname + "?tab=billing");
    }
  }, []);

  const handleCheckout = async (planId) => {
    if (window.self !== window.top) {
      alert("Der Checkout funktioniert nur in der veröffentlichten App.");
      return;
    }
    setCheckoutLoading(planId);
    const res = await base44.functions.invoke("createCheckoutSession", {
      organization_id: org.id,
      plan_id: planId,
      success_url: window.location.origin + "/settings?tab=billing&checkout=success",
      cancel_url: window.location.origin + "/settings?tab=billing",
      allow_upgrade: false,
    });
    if (res.data?.url) {
      window.location.href = res.data.url;
    } else {
      toast.error(res.data?.error || "Fehler beim Starten des Checkouts.");
    }
    setCheckoutLoading(null);
  };

  const handlePortal = async () => {
    if (window.self !== window.top) {
      alert("Das Kundenportal funktioniert nur in der veröffentlichten App.");
      return;
    }
    setPortalLoading(true);
    const res = await base44.functions.invoke("createPortalSession", {
      organization_id: org.id,
      return_url: window.location.origin + "/settings",
    });
    if (res.data?.url) {
      window.location.href = res.data.url;
    } else {
      toast.error(res.data?.error || "Fehler beim Öffnen des Kundenportals.");
    }
    setPortalLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  const billingStatus = org?.billing_status || "trialing";
  const statusCfg = BILLING_STATUS_CONFIG[billingStatus] || BILLING_STATUS_CONFIG.trialing;
  const StatusIcon = statusCfg.icon;
  const isProblematic = ["past_due", "unpaid", "canceled", "incomplete", "incomplete_expired"].includes(billingStatus);

  return (
    <div className="space-y-5">

      {/* Trial Status Banner */}
      <TrialStatusBanner 
        trial_stage={org?.trial_stage}
        billing_status={org?.billing_status}
        trial_leads_granted={org?.trial_leads_granted || 0}
        onUpgrade={() => window.location.href = "/settings#upgrade"}
        onManagePlan={() => window.location.href = "/settings#upgrade"}
      />

      {/* Plan-Auswahl für Free Preview */}
      {org?.trial_stage === 'free_preview' && allPlans.length > 0 && (
        <div className="bg-white border-2 border-blue-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-start gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Verifizierten Testzugang aktivieren</h3>
              <p className="text-xs font-medium text-slate-600 mt-1">
                Wählen Sie einen Plan und starten Sie den 14-tägigen verifizierten Testzugang.
                <br />
                <span className="text-slate-500">Für den verifizierten Testzugang wird eine Zahlungsmethode hinterlegt. Die Abrechnung erfolgt nach Ablauf der 14-tägigen Testphase.</span>
              </p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            {allPlans.map(p => (
              <div key={p.id} className="border border-slate-200 rounded-xl p-4 flex flex-col gap-3 hover:border-blue-300 hover:shadow-sm transition-all">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-bold text-slate-900">{p.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {p.price_monthly ? `${(p.price_monthly / 100).toFixed(0)} € / Monat` : "–"}
                    </p>
                  </div>
                  {p.has_advanced_reports && (
                    <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Beliebt</span>
                  )}
                </div>
                <ul className="text-xs text-slate-600 space-y-1">
                  <li>✓ {p.max_leads_per_month === -1 ? "Unbegrenzt" : p.max_leads_per_month} Kontakte/Monat</li>
                  <li>✓ {p.max_lead_generations_per_month === -1 ? "Unbegrenzt" : p.max_lead_generations_per_month} Recherchen/Monat</li>
                  <li>✓ {p.max_ai_scorings_per_month === -1 ? "Unbegrenzt" : p.max_ai_scorings_per_month} KI-Aktionen/Monat</li>
                </ul>
                <Button
                  onClick={() => handleCheckout(p.id)}
                  disabled={checkoutLoading !== null}
                  size="sm"
                  className="w-full gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {checkoutLoading === p.id
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <ArrowRight className="w-3.5 h-3.5" />}
                  14 Tage testen
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Problematic billing warning */}
      {isProblematic && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div className="text-sm text-red-800">
            <strong>Achtung:</strong> Ihr Abo ist <strong>{statusCfg.label}</strong>.{" "}
            {billingStatus === "past_due" || billingStatus === "unpaid"
              ? "Bitte aktualisieren Sie Ihre Zahlungsmethode, um den Zugang zu erhalten."
              : "Bitte schließen Sie ein neues Abonnement ab, um die Plattform weiter zu nutzen."}
          </div>
        </div>
      )}

      {/* Plan & Status Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Aktueller Plan</h3>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-extrabold text-slate-950">{plan?.name || "–"}</span>
              <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${statusCfg.color}`}>
                <StatusIcon className="w-3 h-3" /> {statusCfg.label}
              </span>
            </div>
            {plan?.price_monthly && (
              <p className="text-sm text-slate-600 font-medium mt-0.5">
                {(plan.price_monthly / 100).toFixed(0)} € / Monat
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            </Button>
            <Button
              onClick={handlePortal}
              disabled={portalLoading || !org?.stripe_customer_id}
              size="sm"
              className="gap-1.5"
            >
              {portalLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ExternalLink className="w-3.5 h-3.5" />}
              Abo verwalten
            </Button>
          </div>
        </div>

        {/* Subscription Period */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-200">
          <div>
            <p className="text-xs text-slate-600 font-medium mb-0.5">Aktuelle Periode</p>
            <p className="text-sm font-semibold text-slate-900">
              {subscription?.current_period_start
                ? `${formatDate(subscription.current_period_start)} – ${formatDate(subscription.current_period_end)}`
                : "–"}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-600 font-medium mb-0.5">Nächste Abrechnung</p>
            <p className="text-sm font-semibold text-slate-900">{formatDate(subscription?.current_period_end)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-600 font-medium mb-0.5">Trial-Ende</p>
            <p className="text-sm font-semibold text-slate-900">{org?.trial_ends_at ? formatDate(org.trial_ends_at) : "–"}</p>
          </div>
        </div>

        {subscription?.cancel_at_period_end && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm text-amber-800">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            Abo wird zum {formatDate(subscription.cancel_at || subscription.current_period_end)} nicht verlängert.
          </div>
        )}
      </div>

      {/* Current Access Level */}
      {org?.trial_stage === 'free_preview' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">
            Aktueller Zugang
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-semibold text-slate-700">Zugang:</span>
              <span className="text-blue-600 font-bold">Kostenlose Vorschau</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="font-semibold text-slate-700">Firmenkontakte:</span>
              <span className="text-slate-900 font-bold">{org?.trial_leads_granted || 0} / 3 genutzt</span>
            </div>
          </div>
        </div>
      )}

      {org?.trial_stage === 'verified_trial' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">
            Aktueller Zugang
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-semibold text-slate-700">Zugang:</span>
              <span className="text-amber-600 font-bold">Verifizierter Testzugang</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="font-semibold text-slate-700">Max. pro Recherche:</span>
              <span className="text-slate-900 font-bold">25 Firmenkontakte</span>
            </div>
          </div>
        </div>
      )}

      {/* Usage this month */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">
          Verbrauch diesen Monat
        </h3>
        <div className="grid sm:grid-cols-2 gap-3">
          <UsageBar
            label="Gespeicherte Firmenkontakte"
            icon={Database}
            used={usageLog?.leads_created || 0}
            max={plan?.max_leads_per_month ?? -1}
            color="bg-blue-500"
          />
          <UsageBar
            label="Vertriebo-Recherchen"
            icon={Search}
            used={usageLog?.lead_generations_used || 0}
            max={plan?.max_lead_generations_per_month ?? -1}
            color="bg-indigo-500"
          />
          <UsageBar
            label="Dokumentierte E-Mails"
            icon={Mail}
            used={usageLog?.manual_emails_logged || 0}
            max={-1}
            color="bg-green-500"
          />
          <UsageBar
            label="Vertriebo-Aktionen"
            icon={Brain}
            used={usageLog?.ai_actions_used || 0}
            max={plan?.max_ai_scorings_per_month ?? -1}
            color="bg-purple-500"
          />
        </div>

        {!usageLog && (
          <div className="sm:col-span-2 text-center py-6">
            <p className="text-sm font-semibold text-slate-600">Noch kein Verbrauch in diesem Monat erfasst.</p>
          </div>
        )}

        {/* Geschätzte externe API-Kosten: nur intern sichtbar (Admin) */}
      </div>

      {/* Plan Limits Info */}
      {plan && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Plan-Limits im Überblick</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            {[
              { label: "Benutzer", value: plan.max_users === -1 ? "∞" : plan.max_users },
              { label: "Kontakte/Monat", value: plan.max_leads_per_month === -1 ? "∞" : plan.max_leads_per_month },
              { label: "E-Mails/Monat", value: plan.max_emails_per_month === -1 ? "∞" : plan.max_emails_per_month },
              { label: "KI-Aktionen/Monat", value: plan.max_ai_scorings_per_month === -1 ? "∞" : plan.max_ai_scorings_per_month },
            ].map(item => (
              <div key={item.label} className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <div className="text-2xl font-extrabold text-slate-950">{item.value}</div>
                <div className="text-[11px] font-semibold text-slate-600 mt-1">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!org?.stripe_customer_id && (
        <p className="text-xs text-slate-600 font-medium text-center">
          Kein Stripe-Konto verknüpft – bitte Abonnement abschließen.
        </p>
      )}
    </div>
  );
}