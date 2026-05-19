import { useState, useEffect } from "react";
import { X, Cookie, Shield, BarChart2, ChevronDown, ChevronUp } from "lucide-react";

const STORAGE_KEY = "vertriebo_cookie_consent";
const CONSENT_VERSION = "1"; // Erhöhen wenn neue Kategorien → Banner erscheint erneut

export function getCookieConsent() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data.version !== CONSENT_VERSION) return null;
    return data;
  } catch {
    return null;
  }
}

export function saveCookieConsent(choices) {
  const data = {
    version: CONSENT_VERSION,
    savedAt: new Date().toISOString(),
    necessary: true, // immer an
    analytics: choices.analytics ?? false,
    marketing: choices.marketing ?? false,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  return data;
}

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    const existing = getCookieConsent();
    if (!existing) {
      // Kurze Verzögerung für bessere UX
      setTimeout(() => setVisible(true), 800);
    }
  }, []);

  const accept = (type) => {
    if (type === "all") {
      saveCookieConsent({ analytics: true, marketing: true });
    } else if (type === "necessary") {
      saveCookieConsent({ analytics: false, marketing: false });
    } else {
      saveCookieConsent({ analytics, marketing });
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[9999] p-3 sm:p-4"
      style={{ pointerEvents: "all" }}
    >
      <div className="max-w-2xl mx-auto bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 pt-4 pb-2">
          <Cookie className="w-5 h-5 text-blue-600 flex-shrink-0" />
          <h2 className="text-sm font-bold text-slate-900">Wir nutzen Cookies</h2>
        </div>

        <div className="px-4 pb-3">
          <p className="text-xs text-slate-600 leading-relaxed">
            Wir verwenden Cookies, um diese Website zu betreiben und Ihr Erlebnis zu verbessern.
            Technisch notwendige Cookies sind immer aktiv. Weitere Informationen in unserer{" "}
            <a href="/datenschutz" className="text-blue-600 hover:underline font-medium">Datenschutzerklärung</a>.
          </p>

          {/* Detailansicht */}
          {showDetails && (
            <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
              {/* Notwendige Cookies */}
              <div className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Shield className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-xs font-bold text-slate-900">Notwendig</span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-semibold">Immer aktiv</span>
                  </div>
                  <p className="text-[11px] text-slate-600">Session-Cookies für Login, Sicherheit und Grundfunktionen. Ohne diese funktioniert die Website nicht.</p>
                </div>
                <div className="w-8 h-5 bg-emerald-500 rounded-full flex-shrink-0 mt-1 cursor-not-allowed opacity-70" />
              </div>

              {/* Analyse-Cookies */}
              <div className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <BarChart2 className="w-3.5 h-3.5 text-blue-600" />
                    <span className="text-xs font-bold text-slate-900">Analyse</span>
                  </div>
                  <p className="text-[11px] text-slate-600">Helfen uns zu verstehen, wie Besucher die Website nutzen (anonymisiert, kein Tracking von Personen).</p>
                </div>
                <button
                  onClick={() => setAnalytics(!analytics)}
                  className={`w-8 h-5 rounded-full flex-shrink-0 mt-1 transition-colors ${analytics ? "bg-blue-600" : "bg-slate-300"}`}
                >
                  <span className={`block w-4 h-4 bg-white rounded-full shadow transition-transform mx-0.5 ${analytics ? "translate-x-3" : "translate-x-0"}`} />
                </button>
              </div>

              {/* Marketing-Cookies */}
              <div className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Cookie className="w-3.5 h-3.5 text-purple-600" />
                    <span className="text-xs font-bold text-slate-900">Marketing</span>
                  </div>
                  <p className="text-[11px] text-slate-600">Ermöglichen personalisierte Inhalte und Werbung. Aktuell nutzen wir keine externen Marketing-Tools.</p>
                </div>
                <button
                  onClick={() => setMarketing(!marketing)}
                  className={`w-8 h-5 rounded-full flex-shrink-0 mt-1 transition-colors ${marketing ? "bg-purple-600" : "bg-slate-300"}`}
                >
                  <span className={`block w-4 h-4 bg-white rounded-full shadow transition-transform mx-0.5 ${marketing ? "translate-x-3" : "translate-x-0"}`} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="px-4 pb-4 flex flex-col sm:flex-row gap-2">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center justify-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 py-2 px-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors sm:mr-auto"
          >
            {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {showDetails ? "Weniger" : "Details"}
          </button>

          <div className="flex gap-2 sm:gap-2">
            <button
              onClick={() => accept("necessary")}
              className="flex-1 sm:flex-none text-xs font-semibold py-2 px-3 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap"
            >
              Nur notwendige
            </button>
            {showDetails && (
              <button
                onClick={() => accept("custom")}
                className="flex-1 sm:flex-none text-xs font-semibold py-2 px-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 hover:bg-blue-100 transition-colors whitespace-nowrap"
              >
                Auswahl speichern
              </button>
            )}
            <button
              onClick={() => accept("all")}
              className="flex-1 sm:flex-none text-xs font-bold py-2 px-4 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors whitespace-nowrap"
            >
              Alle akzeptieren
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}