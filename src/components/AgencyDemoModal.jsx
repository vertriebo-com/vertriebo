import { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function AgencyDemoModal({ isOpen, onClose }) {
  const [formData, setFormData] = useState({
    name: "",
    firma: "",
    email: "",
    telefon: "",
    kundenorganisationen: "",
    nachricht: ""
  });
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentOrg, setCurrentOrg] = useState(null);

  useEffect(() => {
    if (isOpen) {
      // Try to get current user
      base44.auth.me().then(user => {
        if (user) {
          setCurrentUser(user);
          setFormData(prev => ({ ...prev, email: user.email, name: user.full_name || "" }));
          
          // Try to get organization
          base44.entities.Organization.filter({ owner_email: user.email })
            .then(orgs => {
              if (orgs?.[0]) {
                setCurrentOrg(orgs[0]);
                setFormData(prev => ({ ...prev, firma: orgs[0].name || "" }));
              }
            })
            .catch(() => {});
        }
      }).catch(() => {});
    }
  }, [isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Send email notification
      await base44.integrations.Core.SendEmail({
        to: "info@huwa-gebaeudedienste.de",
        subject: `Neue Agency-Demo-Anfrage von ${formData.name}`,
        body: `
Neue Agency-Demo-Anfrage:

Name: ${formData.name}
Firma: ${formData.firma}
E-Mail: ${formData.email}
Telefon: ${formData.telefon}
Kundenorganisationen: ${formData.kundenorganisationen || "Nicht angegeben"}

Nachricht:
${formData.nachricht}

${currentOrg ? `Organization ID: ${currentOrg.id}` : "Keine eingeloggte Organisation"}
        `
      });

      toast.success("Anfrage versendet! Wir melden uns bald bei Ihnen.");
      setFormData({
        name: "",
        firma: "",
        email: "",
        telefon: "",
        kundenorganisationen: "",
        nachricht: ""
      });
      onClose();
    } catch (error) {
      console.error("[AgencyDemoModal] Error:", error);
      toast.error("Fehler beim Versenden. Bitte versuchen Sie es später erneut.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-900">Agency Plan - Demo anfragen</h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700 transition"
            aria-label="Schließen"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-slate-600 mb-6">
          Füllen Sie das Formular aus und wir melden uns mit einem Angebot bei Ihnen.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-900 mb-1">Name *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ihr Name"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-900 mb-1">Firma *</label>
            <input
              type="text"
              name="firma"
              value={formData.firma}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Firmenname"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-900 mb-1">E-Mail *</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="ihr@email.de"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-900 mb-1">Telefonnummer</label>
            <input
              type="tel"
              name="telefon"
              value={formData.telefon}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="+49 123 456789"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-900 mb-1">
              Anzahl Kundenorganisationen / Teams
            </label>
            <input
              type="text"
              name="kundenorganisationen"
              value={formData.kundenorganisationen}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="z.B. 5 Teams oder 10+ Agencies"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-900 mb-1">
              Nachricht
            </label>
            <textarea
              name="nachricht"
              value={formData.nachricht}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Ihre Anfrage oder spezifische Anforderungen..."
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Abbrechen
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Demo anfragen"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}