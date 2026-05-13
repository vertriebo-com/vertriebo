import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { AlertCircle, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const HONEYPOT_FIELD = "website_url"; // Honeypot field name
const RATE_LIMIT_KEY = "agency_demo_submissions";
const RATE_LIMIT_WINDOW = 3600000; // 1 hour
const MAX_SUBMISSIONS_PER_HOUR = 3;

export default function AgencyDemoModal({ isOpen, onClose }) {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [org, setOrg] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    company_name: "",
    email: "",
    phone: "",
    estimated_client_organizations: "",
    message: "",
    [HONEYPOT_FIELD]: "", // Honeypot
  });

  const submissionCountRef = useRef(0);

  // Load auth state when modal opens
  useEffect(() => {
    if (open && isOpen) {
      loadAuthState();
    }
  }, [isOpen]);

  const loadAuthState = async () => {
    setLoading(true);
    try {
      const currentUser = await base44.auth.me();
      if (currentUser) {
        setIsLoggedIn(true);
        setUser(currentUser);

        // Try to find organization
        const orgs = await base44.entities.Organization.filter({
          owner_email: currentUser.email,
        });
        if (orgs[0]) {
          setOrg(orgs[0]);
          setFormData((prev) => ({
            ...prev,
            name: currentUser.full_name || "",
            email: currentUser.email || "",
          }));
        } else {
          // Check as member
          const members = await base44.entities.OrganizationMember.filter({
            user_email: currentUser.email,
            status: "active",
          });
          if (members[0]) {
            const memberOrgs = await base44.entities.Organization.filter({
              id: members[0].organization_id,
            });
            if (memberOrgs[0]) {
              setOrg(memberOrgs[0]);
              setFormData((prev) => ({
                ...prev,
                name: currentUser.full_name || "",
                email: currentUser.email || "",
              }));
            }
          } else {
            // Logged in but no org yet
            setFormData((prev) => ({
              ...prev,
              name: currentUser.full_name || "",
              email: currentUser.email || "",
            }));
          }
        }
      } else {
        setIsLoggedIn(false);
      }
    } catch (e) {
      console.warn("[AgencyDemoModal] Auth check failed (non-blocking):", e?.message);
    } finally {
      setLoading(false);
    }
  };

  const checkRateLimit = () => {
    const now = Date.now();
    const stored = localStorage.getItem(RATE_LIMIT_KEY);

    if (stored) {
      const submissions = JSON.parse(stored);
      const recentSubmissions = submissions.filter((ts) => now - ts < RATE_LIMIT_WINDOW);

      if (recentSubmissions.length >= MAX_SUBMISSIONS_PER_HOUR) {
        return false;
      }

      recentSubmissions.push(now);
      localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(recentSubmissions));
    } else {
      localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify([now]));
    }

    return true;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Honeypot check
    if (formData[HONEYPOT_FIELD]) {
      console.warn("[AgencyDemoModal] Honeypot triggered, silently ignoring");
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        onClose();
      }, 2000);
      return;
    }

    // Rate limit check
    if (!checkRateLimit()) {
      setError("Zu viele Anfragen. Bitte versuchen Sie es später erneut.");
      return;
    }

    // Validation
    if (!formData.name || !formData.email || !formData.phone) {
      setError("Bitte füllen Sie alle Pflichtfelder aus.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError("Bitte geben Sie eine gültige E-Mail-Adresse ein.");
      return;
    }

    setSubmitting(true);

    try {
      // Determine context
      const isPublic = !isLoggedIn;
      const organizationId = org?.id || null;
      const userId = user?.id || null;

      // Create agency request record
      const agencyRequest = await base44.entities.create("AgencyRequest", {
        organization_id: organizationId,
        user_id: userId,
        plan: "agency",
        source: isPublic ? "public_pricing_page" : "pricing_page",
        name: formData.name,
        company_name: formData.company_name,
        email: formData.email,
        phone: formData.phone,
        estimated_client_organizations: formData.estimated_client_organizations || null,
        message: formData.message,
        status: "new",
        submitted_at: new Date().toISOString(),
        ip_source: "browser", // Client-side placeholder
      });

      // Send confirmation email
      await base44.functions.invoke("sendAgencyDemoEmail", {
        name: formData.name,
        email: formData.email,
        company_name: formData.company_name,
        phone: formData.phone,
        agency_request_id: agencyRequest.id,
      });

      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        onClose();
      }, 3000);

      toast.success("Anfrage gesendet! Wir melden uns bald bei Ihnen.");
    } catch (err) {
      console.error("[AgencyDemoModal] Submission error:", err);
      setError(err?.message || "Anfrage konnte nicht gesendet werden. Bitte versuchen Sie es später.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        {submitted ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <CheckCircle2 className="w-12 h-12 text-green-600" />
            <h3 className="text-lg font-bold text-slate-900">Vielen Dank!</h3>
            <p className="text-sm text-slate-700 text-center">
              Ihre Anfrage wurde empfangen. Wir setzen uns in Kürze mit Ihnen in Verbindung.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <h2 className="text-xl font-bold text-slate-900">Agency Plan Demo</h2>
              <p className="text-sm text-slate-600 mt-1 font-medium">
                Für Agenturen mit mehreren Kundenprojekten. Lassen Sie sich von unserem Spezialisten beraten.
              </p>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <p className="text-sm text-red-800 font-medium">{error}</p>
                  </div>
                )}

                {/* Honeypot (hidden) */}
                <input
                  type="text"
                  name={HONEYPOT_FIELD}
                  value={formData[HONEYPOT_FIELD]}
                  onChange={handleInputChange}
                  style={{ display: "none" }}
                  autoComplete="off"
                  tabIndex="-1"
                  aria-hidden="true"
                />

                {/* Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Name <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Ihr vollständiger Name"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                {/* Company */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Agentur / Unternehmen <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    name="company_name"
                    value={formData.company_name}
                    onChange={handleInputChange}
                    placeholder="Name Ihrer Agentur"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    E-Mail <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="kontakt@example.de"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Telefon <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="+49 123 456789"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                {/* Estimated Client Organizations */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Geschätzte Kundenorganisationen
                  </label>
                  <input
                    type="number"
                    name="estimated_client_organizations"
                    value={formData.estimated_client_organizations}
                    onChange={handleInputChange}
                    placeholder="z.B. 5-10"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-slate-600 mt-1 font-medium">
                    Wie viele Kundenprojekte betreuen Sie typischerweise?
                  </p>
                </div>

                {/* Message */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Nachricht
                  </label>
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleInputChange}
                    placeholder="Erzählen Sie uns mehr über Ihre Anforderungen…"
                    rows="3"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>

                {/* Info */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-slate-700 font-medium">
                    Ein Vertriebo-Spezialist wird sich per E-Mail oder Telefon mit Ihnen in Verbindung setzen, um die beste Lösung für Ihre Agentur zu besprechen.
                  </p>
                </div>

                {/* Buttons */}
                <div className="flex gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    disabled={submitting}
                    className="flex-1 border-slate-300 text-slate-900 hover:bg-slate-50"
                  >
                    Abbrechen
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" /> Wird gesendet…
                      </>
                    ) : (
                      "Anfrage senden"
                    )}
                  </Button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}