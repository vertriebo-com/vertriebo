import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  CreditCard, Zap, Mail, Brain, Search, Database,
  AlertTriangle, CheckCircle2, Clock, ExternalLink, Loader2, RefreshCw
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
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5 text-slate-700 font-medium">
          <Icon className="w-4 h-4 text-slate-500" /> {label}
        </span>
        <span className="font-bold text-slate-900">
          {isUnlimited ? <span className="text-emerald-600 font-semibold">∞ Unbegrenzt</span> : `${used} / ${max}`}
        </span>
      </div>
      {!isUnlimited && (
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${isDanger ? "bg-red-500" : isWarning ? "bg-amber-500" : color}`}
            style={{ width: `${pct}%` }}
          />
        </div>
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

      // Aktuellen UsageLog laden
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const usageLogs = await base44.entities.UsageLog.filter({
        organization_id: freshOrg.id,
        period_start: periodStart,
      });
      setUsageLog(usageLogs[0] || null);
    } catch (e) {
      toast.error("Fehler beim Laden der Billing-Daten: " + e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadData(); }, []);

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
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const billingStatus = org?.billing_status || "trialing";
  const statusCfg = BILLING_STATUS_CONFIG[billingStatus] || BILLING_STATUS_CONFIG.trialing;
  const StatusIcon = statusCfg.icon;
  const isProblematic = ["past_due", "unpaid", "canceled", "incomplete", "incomplete_expired"].includes(billingStatus);

  return (
    <div className="space-y-5">

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
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Aktueller Plan</h3>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-extrabold">{plan?.name || "–"}</span>
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
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 border-t border-border">
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

      {/* Usage this month */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-5">
          Verbrauch diesen Monat
        </h3>
        <div className="space-y-4">
          <UsageBar
            label="Recherche-Credits (Kontakte)"
            icon={Database}
            used={usageLog?.leads_created || 0}
            max={plan?.max_leads_per_month ?? -1}
            color="bg-blue-500"
          />
          <UsageBar
            label="Recherche-Läufe"
            icon={Search}
            used={usageLog?.lead_generations_used || 0}
            max={plan?.max_lead_generations_per_month ?? -1}
            color="bg-indigo-500"
          />
          <UsageBar
            label="E-Mails gesendet"
            icon={Mail}
            used={usageLog?.emails_sent || 0}
            max={plan?.max_emails_per_month ?? -1}
            color="bg-green-500"
          />
          <UsageBar
            label="KI-Aktionen"
            icon={Brain}
            used={usageLog?.ai_actions_used || 0}
            max={plan?.max_ai_scorings_per_month ?? -1}
            color="bg-purple-500"
          />
        </div>

        {!usageLog && (
          <p className="text-xs text-slate-600 font-medium mt-4">
            Noch kein Verbrauch in diesem Monat erfasst.
          </p>
        )}

        {usageLog?.estimated_external_cost_cent > 0 && (
          <div className="mt-5 pt-4 border-t border-slate-200 flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-slate-600 font-medium"><Zap className="w-3.5 h-3.5" /> Geschätzte externe API-Kosten</span>
            <span className="font-bold text-slate-900">{(usageLog.estimated_external_cost_cent / 100).toFixed(2)} €</span>
          </div>
        )}
      </div>

      {/* Plan Limits Info */}
      {plan && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
          <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-4">Plan-Limits</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            {[
              { label: "Benutzer", value: plan.max_users === -1 ? "∞" : plan.max_users },
              { label: "Kontakte/Monat", value: plan.max_leads_per_month === -1 ? "∞" : plan.max_leads_per_month },
              { label: "E-Mails/Monat", value: plan.max_emails_per_month === -1 ? "∞" : plan.max_emails_per_month },
              { label: "KI-Aktionen/Monat", value: plan.max_ai_scorings_per_month === -1 ? "∞" : plan.max_ai_scorings_per_month },
            ].map(item => (
              <div key={item.label} className="bg-white border border-slate-200 rounded-xl p-3">
                <div className="text-xl font-extrabold text-slate-900">{item.value}</div>
                <div className="text-[11px] text-slate-600 font-medium mt-1">{item.label}</div>
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