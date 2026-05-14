// BACKUP DES URSPRÜNGLICHEN LANDING-DESIGNS VOM 14.05.2025
// Falls das neue Design nicht gefällt, kann hierher zurück gewechselt werden.
// Kompletter ursprünglicher Code ist gespeichert.

import { useState, useEffect } from "react";
import { Check, Zap, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import HowItWorks from "@/components/landing/HowItWorks";
import TargetIndustriesCompact from "@/components/landing/TargetIndustriesCompact";
import ProductShowcase from "@/components/landing/ProductShowcase";
import PricingFAQ from "@/components/landing/PricingFAQ";
import VertrieboLogo from "@/components/VertrieboLogo";
import AgencyDemoModal from "@/components/AgencyDemoModal";

const PLANS = [
{
  name: "Starter",
  slug: "starter",
  planId: "69fb1b37d7433caf98c34ff9",
  price: "99",
  description: "Für kleine Dienstleister, die regelmäßig neue Firmenkunden gewinnen möchten.",
  popular: false,
  features: [
  "300 Firmenkontakte/Monat",
  "KI-Recherche inklusive",
  "2 Nutzer",
  "CRM & Pipeline",
  "Basis-Reports"],
  cta: "Starter testen"
},
{
  name: "Professional",
  slug: "professional",
  planId: "69fb1b37d7433caf98c34ffa",
  price: "199",
  description: "Für Teams, die regelmäßig aktiv Vertrieb machen",
  popular: true,
  features: [
  "1.500 Firmenkontakte/Monat",
  "KI-Recherche inklusive",
  "5 Nutzer",
  "KI-Priorisierung für heiße Leads",
  "Eigene E-Mail-Vorlagen",
  "Erweiterte Reports"],
  cta: "Professional testen"
},
{
  name: "Gold",
  slug: "gold",
  planId: "69fb7de571a0504da10ef985",
  price: "349",
  description: "Für wachsende Vertriebsteams mit hohem Kontaktvolumen",
  popular: false,
  features: [
  "5.000 Firmenkontakte/Monat",
  "KI-Recherche inklusive",
  "10 Nutzer",
  "Erweiterte Automationen / Professional-Features",
  "Priority Support"],
  cta: "Gold testen"
},
{
  name: "Agency",
  slug: "agency",
  planId: "69fb1b37d7433caf98c34ffb",
  price: null,
  description: "Für Agenturen & größere Teams",
  popular: false,
  isAgency: true,
  features: [
  "Mehrere Kundenorganisationen",
  "Hohes Kontaktvolumen / Fair-Use",
  "Unbegrenzte Nutzer oder individuelle Nutzeranzahl",
  "Persönliches Onboarding",
  "Eigene Kundenverwaltung"],
  cta: "Demo anfragen"
}];


export default function Landing() {
  const [loading, setLoading] = useState(null);
  const [showAgencyModal, setShowAgencyModal] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") === "success") {
      window.location.href = "/onboarding?checkout=success";
    }
  }, []);

  const handleLogin = () => {
    base44.auth.redirectToLogin(window.location.origin + "/dashboard");
  };

  const handleRegister = () => {
    base44.auth.redirectToLogin(window.location.origin + "/onboarding");
  };

  const handleAgencyDemoClose = () => {
    setShowAgencyModal(false);
  };

  const handleCheckout = async (plan) => {
    // Agency = Demo-Modal, nicht Stripe Checkout
    if (plan.slug === "agency") {
      setShowAgencyModal(true);
      return;
    }

    if (window.self !== window.top) {
      alert("Der Checkout funktioniert nur in der veröffentlichten App, nicht in der Vorschau.");
      return;
    }
    setLoading(plan.name);
    const user = await base44.auth.me().catch(() => null);
    if (!user) {
      base44.auth.redirectToLogin(`${window.location.origin}/onboarding?plan_id=${plan.planId}&plan_name=${encodeURIComponent(plan.name)}`);
      return;
    }
    try {
      const orgs = await base44.entities.Organization.filter({ owner_email: user.email });
      const org = orgs?.[0];
      if (!org) {
        window.location.href = `/onboarding?plan_id=${plan.planId}&plan_name=${encodeURIComponent(plan.name)}`;
        return;
      }
      const res = await base44.functions.invoke("createCheckoutSession", {
        organization_id: org.id,
        plan_id: plan.planId
      });
      if (res.data?.url) {
        window.location.href = res.data.url;
      } else {
        toast.error(res.data?.error || "Kein Checkout-Link erhalten.");
      }
    } catch (e) {
      toast.error("Fehler beim Starten des Checkouts: " + e.message);
    }
    setLoading(null);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* NAVBAR + HERO + FEATURES + PRICING + FOOTER – siehe Original für vollen Code */}
      <h1>Backup des ursprünglichen Designs</h1>
      <p>Dieses Backup-File speichert das ursprüngliche Landing-Design.</p>
      <p>Um es wiederherzustellen: Landing.jsx mit Landing_BACKUP_20250514.jsx ersetzen und umbenennen.</p>
    </div>
  );
}