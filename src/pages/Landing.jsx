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

const PLANS = [
{
  name: "Starter",
  planId: "69fb1b37d7433caf98c34ff9",
  price: "99",
  description: "Für Einzelkämpfer und kleine Betriebe",
  popular: false,
  features: [
  "2 Vertriebler",
  "300 gespeicherte Firmenkontakte",
  "100 Recherche-Credits",
  "CRM & Pipeline",
  "Basis-Reports",
  "500 E-Mails/Monat"]

},
{
  name: "Professional",
  planId: "69fb1b37d7433caf98c34ffa",
  price: "199",
  description: "Für Teams, die regelmäßig aktiv Vertrieb machen",
  popular: true,
  features: [
  "5 Vertriebler",
  "1.500 gespeicherte Firmenkontakte",
  "750 Recherche-Credits",
  "Alle Starter-Features",
  "KI-Morgenreport + Team-Auswertung",
  "Eigene E-Mail-Vorlagen",
  "2.000 E-Mails/Monat"]

},
{
  name: "Gold",
  planId: "69fb7de571a0504da10ef985",
  price: "349",
  description: "Für wachsende Vertriebsteams mit hohem Kontaktvolumen",
  popular: false,
  features: [
  "10 Vertriebler",
  "5.000 gespeicherte Firmenkontakte",
  "2.000 Recherche-Credits",
  "Alle Professional-Features",
  "1.000 KI-Aktionen",
  "5.000 E-Mails/Monat",
  "Priority Support"]

},
{
  name: "Agency",
  planId: "69fb1b37d7433caf98c34ffb",
  price: "599",
  description: "Für größere Teams mit persönlicher Einrichtung",
  popular: false,
  features: [
  "Individuelle Vertriebler-Anzahl",
  "15.000 gespeicherte Firmenkontakte",
  "5.000 Recherche-Credits",
  "Alle Gold-Features",
  "3.000 KI-Aktionen",
  "10.000 E-Mails/Monat",
  "Persönliches Onboarding"]

}];


export default function Landing() {
  const [loading, setLoading] = useState(null);

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

  const handleCheckout = async (plan) => {
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
      {/* Navbar */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-100 bg-white/95 backdrop-blur-xl shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-2.5 lg:px-8">
          <a href="/" className="flex items-center shrink-0 group">
            <img src="https://media.base44.com/images/public/69d8fb5b8dde510755b29a7e/6bf8a2d63_ChatGPTImage11Mai202615_23_00.png"
            alt="Vertriebo"
            className="h-20 md:h-24 lg:h-28 w-auto object-contain transition-transform group-hover:scale-105" />
          </a>

          <div className="flex items-center gap-2 md:gap-4">
            <button 
              onClick={handleLogin} 
              className="px-4 md:px-5 py-2.5 rounded-lg text-xs md:text-sm font-semibold text-slate-700 border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all duration-200">
              Login
            </button>
            <button 
              onClick={handleRegister} 
              className="px-4 md:px-6 py-2.5 rounded-lg text-xs md:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 shadow-md shadow-blue-600/30 transition-all duration-200 flex items-center gap-1.5">
              <span>🚀</span> 14 Tage testen
            </button>
          </div>
        </div>
      </header>

      {/* A) Hero mit starkem Nutzenversprechen */}
       <div className="relative overflow-hidden bg-white border-b border-slate-200">
         <div className="max-w-7xl mx-auto px-6 py-16 md:py-24 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Linke Seite: Headline + CTA */}
            <div className="text-left">
              <div className="inline-flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full mb-5 bg-blue-600 text-white">
                <Zap className="w-3.5 h-3.5 fill-white" /> Für lokale Dienstleister
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight mb-6 text-slate-900 leading-tight">
                Neue Firmenkontakte finden. Vertrieb organisieren.<br />Rückrufe nie wieder vergessen.
              </h1>
              <p className="text-lg mb-3 text-slate-600 leading-relaxed font-medium">
                Vertriebo verbindet Firmenrecherche, Lead-Priorisierung, Aufgaben, E-Mails und Teamsteuerung in einem einfachen System.
              </p>
              <p className="text-sm mb-8 text-slate-500 font-medium">
                Für alle lokalen B2B-Dienstleister — Gebäudereinigung, IT-Service, Handwerk, Spedition, Pflege, Catering und 20 weitere Branchen.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3 mb-8">
                 <button
                   onClick={() => document.getElementById('pricing').scrollIntoView({ behavior: 'smooth' })}
                   className="px-7 py-3.5 rounded-xl text-base font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/25">

                   14 Tage kostenlos testen
                 </button>
                 <a
                   href="#how-it-works"
                   className="px-7 py-3.5 rounded-xl text-base font-bold text-slate-700 border-2 border-slate-300 bg-white hover:bg-slate-50 transition-all flex items-center justify-center gap-2">

                   Wie es funktioniert
                 </a>
               </div>

               <div className="text-sm text-slate-700 bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
                 <p className="font-semibold text-blue-900 mb-3">Starten Sie kostenlos:</p>
                 <div className="space-y-2">
                   <p>→ 10 Firmenkontakte sofort — ohne Kreditkarte</p>
                   <p>→ 14 Tage voller Zugang mit Kreditkarte</p>
                   <p>→ Danach monatlich kündbar</p>
                 </div>
               </div>
              
              {/* Trust Badges */}
              <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-slate-600">
                <div className="flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-600" /> 14 Tage kostenlos
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-600" /> Monatlich kündbar
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-600" /> DSGVO-orientiert
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-600" /> Deutsches Produkt
                </div>
              </div>
            </div>

            {/* Rechte Seite: Realistisches Dashboard-Mockup */}
            <div className="relative hidden lg:block">
              <div className="bg-white rounded-2xl shadow-2xl border-2 border-slate-200 overflow-hidden">
                {/* Browser Chrome */}
                <div className="bg-slate-100 px-4 py-3 border-b border-slate-300 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-400 border border-red-500" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400 border border-yellow-500" />
                    <div className="w-3 h-3 rounded-full bg-green-400 border border-green-500" />
                  </div>
                  <div className="text-[10px] font-bold text-slate-600">app.vertriebo.de/dashboard</div>
                  <div className="w-12" />
                </div>

                {/* App Content */}
                <div className="flex">
                  {/* Mini Sidebar */}
                  <div className="w-14 bg-slate-50 border-r border-slate-200 py-4 space-y-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center mx-auto">
                      <span className="text-white font-bold text-xs">V</span>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center mx-auto">
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center mx-auto">
                      <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center mx-auto">
                      <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                    </div>
                  </div>

                  {/* Main Dashboard */}
                  <div className="flex-1 p-5">
                    {/* Stats Row */}
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                        <p className="text-[9px] font-bold text-blue-700 uppercase">Heute fällig</p>
                        <p className="text-lg font-black text-blue-900">12</p>
                        <p className="text-[8px] text-blue-600">Rückrufe</p>
                      </div>
                      <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
                        <p className="text-[9px] font-bold text-emerald-700 uppercase">Offen</p>
                        <p className="text-lg font-black text-emerald-900">47</p>
                        <p className="text-[8px] text-emerald-600">Leads</p>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                        <p className="text-[9px] font-bold text-purple-700 uppercase">Woche</p>
                        <p className="text-lg font-black text-purple-900">23</p>
                        <p className="text-[8px] text-purple-600">Anrufe</p>
                      </div>
                    </div>

                    {/* Prioritized Leads */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] font-bold text-slate-700 flex items-center gap-1">
                          <svg className="w-3 h-3 text-amber-500 fill-amber-500" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                          Priorisierte Leads
                        </p>
                        <button className="text-[9px] font-bold text-blue-600 hover:underline">Alle →</button>
                      </div>
                      
                      {/* Lead 1 - High Priority */}
                      <div className="bg-white rounded-lg p-3 border-2 border-red-200 bg-red-50 mb-2">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[9px] font-bold text-red-700 uppercase">Priorität: Hoch</p>
                          <span className="text-[9px] font-bold text-red-700 bg-red-100 px-1.5 py-0.5 rounded-full">Rückruf</span>
                        </div>
                        <p className="text-xs font-bold text-slate-900 mb-1">Schmidt Gebäudereinigung GmbH</p>
                        <p className="text-[9px] text-slate-600 mb-2">Berlin · Gebäudereinigung</p>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[9px] text-slate-500">Letzter Kontakt: Gestern</span>
                        </div>
                        <button className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded flex items-center justify-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                          Nächsten anrufen
                        </button>
                      </div>

                      {/* Lead 2 */}
                      <div className="bg-white rounded-lg p-2.5 border border-slate-200">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-[9px] font-bold text-amber-700 uppercase">Priorität: Hoch</p>
                          <span className="text-[9px] font-bold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded-full">Erstkontakt</span>
                        </div>
                        <p className="text-xs font-bold text-slate-900">Hausmeisterdienst Müller</p>
                        <p className="text-[9px] text-slate-500">Potsdam · Noch nie kontaktiert</p>
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="grid grid-cols-2 gap-2">
                      <button className="py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[9px] font-bold rounded">
                        📞 Anrufen
                      </button>
                      <button className="py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-[9px] font-bold rounded">
                        📝 Kontakt loggen
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile: Vereinfachtes Mockup */}
            <div className="relative lg:hidden">
              <div className="bg-white rounded-2xl shadow-2xl border-2 border-slate-200 overflow-hidden">
                <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-300 flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                  <span className="text-[9px] font-bold text-slate-600 ml-2">app.vertriebo.de</span>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="bg-blue-50 rounded p-2 border border-blue-200">
                      <p className="text-[8px] font-bold text-blue-700">Heute</p>
                      <p className="text-base font-black text-blue-900">12</p>
                    </div>
                    <div className="bg-emerald-50 rounded p-2 border border-emerald-200">
                      <p className="text-[8px] font-bold text-emerald-700">Offen</p>
                      <p className="text-base font-black text-emerald-900">47</p>
                    </div>
                  </div>
                  <div className="bg-red-50 rounded-lg p-3 border-2 border-red-200">
                    <p className="text-[9px] font-bold text-red-700 uppercase mb-1">Priorität: Hoch</p>
                    <p className="text-sm font-bold text-slate-900">Schmidt GmbH</p>
                    <p className="text-[9px] text-slate-600">Rückruf heute</p>
                    <button className="w-full mt-2 py-1.5 bg-emerald-600 text-white text-[9px] font-bold rounded">
                      Anrufen
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* B) Was Vertriebo anders macht (6 Kernpunkte) */}
      <div className="bg-slate-50 border-y border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold mb-3 text-slate-900">Mehr Struktur im B2B-Vertrieb</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Vertriebo ist kein normales CRM. Es hilft Ihnen aktiv, neue Firmenkunden zu finden und Ihren Vertrieb jeden Tag zu steuern – von der Recherche bis zum Nachfassen.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
            {[
            {
              icon: "🔍",
              title: "Automatische Firmenkontakt-Recherche",
              desc: "Legen Sie Zielgebiet, Branche und Kundentyp fest – Vertriebo findet passende Firmenkontakte für Ihren Vertrieb.",
              color: "border-blue-200 bg-blue-50"
            },
            {
              icon: "🗺️",
              title: "Lückenlose Gebiets-Abdeckung",
              desc: "Nicht nur die Kreisstadt — Vertriebo durchsucht alle Orte in Ihrem Radius automatisch.",
              color: "border-teal-200 bg-teal-50"
            },
            {
              icon: "⭐",
              title: "Priorisierte Tagesliste",
              desc: "Ihr Team sieht jeden Tag, welche Kontakte heute angerufen, nachgefasst oder erneut kontaktiert werden sollten.",
              color: "border-amber-200 bg-amber-50"
            },
            {
              icon: "📞",
              title: "Rückrufe & Follow-ups",
              desc: "Aus Gesprächen entstehen direkt Aufgaben und Erinnerungen – damit kein Kontakt verloren geht.",
              color: "border-emerald-200 bg-emerald-50"
            },
            {
              icon: "✉️",
              title: "E-Mail-Vorlagen mit Branding",
              desc: "Vorlagen, Signatur und Antwortadresse sind je Unternehmen anpassbar – professionell und einheitlich.",
              color: "border-purple-200 bg-purple-50"
            },
            {
              icon: "👥",
              title: "Vertriebssteuerung für Teams",
              desc: "Admins sehen Fortschritt, offene Aufgaben, Aktivität und Ergebnisse. Vertriebler sehen nur ihre eigenen Leads.",
              color: "border-indigo-200 bg-indigo-50"
            },
            {
              icon: "✅",
              title: "Alles leicht bedienbar",
              desc: "Keine komplizierte CRM-Einrichtung. Zielgebiet festlegen, Kontakte recherchieren, losarbeiten.",
              color: "border-slate-200 bg-slate-50"
            },
            {
              icon: "🧠",
              title: "System das mitlernt",
              desc: "Je mehr Sie nutzen, desto besser wird Vertriebo. Erfolgreiche Branchen werden automatisch priorisiert.",
              color: "border-orange-200 bg-orange-50"
            },
            {
              icon: "📊",
              title: "Echtzeit-Erfolgsquoten",
              desc: "Sehen Sie sofort, wie Ihr Team performt: Quote pro Vertriebler, beste Branchen, ROI der Recherche.",
              color: "border-rose-200 bg-rose-50"
            }].
            map((item, i) =>
            <div key={i} className={`border-2 rounded-xl p-5 ${item.color}`}>
                <div className="text-3xl mb-3">{item.icon}</div>
                <h3 className="font-bold text-slate-900 mb-2">{item.title}</h3>
                <p className="text-sm text-slate-700 leading-relaxed">{item.desc}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* C) So funktioniert Vertriebo (3 Schritte) */}
      <div id="how-it-works" className="bg-white">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <h2 className="text-3xl font-bold text-center mb-10 text-slate-900">So funktioniert Vertriebo</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
            {
              step: "1",
              title: "Zielgebiet festlegen",
              desc: "Branche wählen, PLZ eingeben, Radius einstellen. Vertriebo durchsucht automatisch alle Orte im Umkreis — nicht nur die Hauptstadt, sondern jeden Ort dazwischen.",
              icon: "🎯"
            },
            {
              step: "2",
              title: "Kontakte priorisieren",
              desc: "Das System bewertet alle Firmen nach Potenzial und erstellt täglich neue priorisierte Anruflisten für Ihr Team.",
              icon: "⭐"
            },
            {
              step: "3",
              title: "Vertrieb steuern",
              desc: "Ihr Team arbeitet die Tagesliste ab, loggt Kontakte und erhält automatische Erinnerungen für Rückrufe und Follow-ups.",
              icon: "📊"
            }].
            map((item) =>
            <div key={item.step} className="relative">
                <div className="bg-white border-2 border-slate-200 rounded-2xl p-6 h-full hover:border-blue-400 transition-colors">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center">
                      <span className="text-2xl">{item.icon}</span>
                    </div>
                    <div className="text-4xl font-black text-slate-200">{item.step}</div>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-3">{item.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{item.desc}</p>
                </div>
                {item.step !== "3" &&
              <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                    <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
              }
              </div>
            )}
          </div>
        </div>
      </div>

      {/* D) Produkt-Screenshots mit echtem UI */}
      <ProductShowcase />

      {/* E) Zielgruppen (kompakt als Tags) */}
      <div className="bg-white border-t border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Für lokale Dienstleister</h2>
            <p className="text-sm text-slate-600">
              Vertriebo wurde von Vertriebsprofis entwickelt – für Betriebe, die aktiv neue Firmenkunden gewinnen wollen. Gebäudereinigung, IT-Service, Handwerk, Facility Service, Spedition, Pflege, Catering und 20+ weitere Branchen nutzen Vertriebo bereits.
            </p>
          </div>

          {/* Kompakte Tag-Liste */}
          <div className="flex flex-wrap justify-center gap-3">
            {[
            { icon: "🏢", name: "Gebäudereinigung" },
            { icon: "🛡️", name: "Sicherheitsdienst" },
            { icon: "🏠", name: "Facility Service" },
            { icon: "📦", name: "Entrümpelung" },
            { icon: "🔨", name: "Handwerk" },
            { icon: "💻", name: "IT-Service" },
            { icon: "🌿", name: "Gartenbau" },
            { icon: "🚚", name: "Spedition" },
            { icon: "🔧", name: "SHK / Heizung" },
            { icon: "⚡", name: "Elektro" },
            { icon: "🍽️", name: "Catering" },
            { icon: "👥", name: "Personal / Zeitarbeit" },
            { icon: "⚙️", name: "Industrieservice" },
            { icon: "🧹", name: "Maler / Renovierung" },
            { icon: "💰", name: "Buchhaltung" },
            { icon: "🏥", name: "Gesundheit / Pflege" }].
            map((ind) =>
            <div key={ind.name} className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-slate-50 border border-slate-200">
                <span className="text-base">{ind.icon}</span>
                <span className="text-sm font-semibold text-slate-700">{ind.name}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* G) Preise */}
      <div id="pricing" className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-center mb-4 text-slate-900">Einfache, transparente Preise</h2>
        <p className="text-center text-slate-600 mb-12 max-w-2xl mx-auto">
          Monatlich kündbar. Keine versteckten Kosten. 14 Tage kostenlos testen.
        </p>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5 mb-12">
          {PLANS.map((plan) =>
          <div
            key={plan.name}
            className={`rounded-2xl p-6 relative flex flex-col border-2 bg-white ${
            plan.popular ? "ring-2 ring-blue-600 ring-offset-2" : ""}`
            }
            style={{
              borderColor: plan.popular ? "#2563EB" : "#E2E8F0"
            }}>
            
              {plan.popular &&
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold px-3 py-1 rounded-full text-white bg-blue-600">
                  Beliebtester Plan
                </div>
            }
              <div className="mb-4">
                <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
                <p className="text-sm text-slate-600">{plan.description}</p>
              </div>
              <div className="mb-6">
                <span className="text-4xl font-extrabold text-slate-900">{plan.price}€</span>
                <span className="text-sm ml-1 text-slate-500">/Monat</span>
              </div>
              <ul className="space-y-2 mb-6 flex-1">
                {plan.features.map((f) =>
              <li key={f} className="flex items-start gap-2 text-sm text-slate-700">
                    <Check className="w-4 h-4 flex-shrink-0 text-emerald-600 mt-0.5" />
                    {f}
                  </li>
              )}
              </ul>
              <button
              onClick={() => handleCheckout(plan)}
              disabled={loading === plan.name}
              className={`w-full py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50 ${
              plan.popular ?
              "bg-blue-600 text-white hover:bg-blue-700" :
              "bg-slate-100 text-slate-900 hover:bg-slate-200"}`
              }>
              
                {loading === plan.name ? "Wird geladen..." : "Jetzt starten"}
              </button>
            </div>
          )}
        </div>
        
        {/* FAQ unter den Preisen */}
        <PricingFAQ />
        
        <p className="text-center text-xs text-slate-500 mt-8">
          Alle Preise zzgl. MwSt. · Monatlich kündbar · Fair-Use für Agency-Plan
        </p>
      </div>

      {/* H) Abschluss-CTA */}
      <div className="bg-blue-600 py-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Starten Sie mit Vertriebo und bringen Sie Struktur in Ihre Neukundengewinnung.
          </h2>
          <p className="text-blue-100 mb-8 max-w-2xl mx-auto">
            Keine Excel-Listen mehr. Keine vergessenen Rückrufe. Ein klares System für Ihren Vertriebserfolg.
          </p>
          <button
            onClick={handleRegister}
            className="px-8 py-4 rounded-xl text-base font-bold text-blue-600 bg-white hover:bg-blue-50 transition-all shadow-lg">
            
            14 Tage kostenlos testen →
          </button>
          <p className="text-blue-200 text-sm mt-4">
            Ohne langfristige Bindung · Monatlich kündbar
          </p>
        </div>
      </div>

      {/* I) Footer */}
      <div className="py-10 text-center text-sm text-slate-500 border-t border-slate-200 bg-white">
        <p className="mb-4">© 2026 Vertriebo</p>
        <div className="flex flex-wrap justify-center gap-6 mb-4">
          <a href="/impressum" className="hover:text-slate-900 transition-colors font-semibold">Impressum</a>
          <a href="/datenschutz" className="hover:text-slate-900 transition-colors font-semibold">Datenschutz</a>
          <a href="/agb" className="hover:text-slate-900 transition-colors font-semibold">AGB</a>
          <a href="mailto:info@huwa-gebaeudedienste.de" className="hover:text-slate-900 transition-colors font-semibold">Kontakt</a>
        </div>
        <p className="text-xs text-slate-400">
          Ein Produkt der Huwa Gebäudereinigung & Hausmeisterdienste GmbH
        </p>
      </div>
    </div>);

}