import { Mail, ChevronDown } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const TEMPLATES = (company) => [
  {
    label: "Erstkontakt",
    subject: `Gebäudereinigung für ${company.name}`,
    body: `Sehr geehrte Damen und Herren,\n\nmein Name ist [Ihr Name] von Huwa Gebäudedienste GmbH. Wir sind ein professionelles Reinigungsunternehmen im Raum Neuwied und bieten maßgeschneiderte Reinigungslösungen für Unternehmen wie Ihres an.\n\nGerne würde ich Ihnen in einem kurzen Gespräch vorstellen, wie wir auch ${company.name} zuverlässig und kosteneffizient unterstützen können.\n\nDarf ich Sie kurz telefonisch kontaktieren oder hätten Sie Interesse an einem unverbindlichen Angebot?\n\nMit freundlichen Grüßen\n[Ihr Name]\nHuwa Gebäudedienste GmbH`,
  },
  {
    label: "Angebot senden",
    subject: `Angebot Gebäudereinigung – ${company.name}`,
    body: `Sehr geehrte Damen und Herren,\n\nwie besprochen, sende ich Ihnen anbei unser Angebot für die Gebäudereinigung bei ${company.name}.\n\nUnser Angebot umfasst:\n• Regelmäßige Unterhaltsreinigung\n• Glasreinigung\n• Sonderreinigungen auf Anfrage\n\nBei Fragen stehe ich Ihnen jederzeit zur Verfügung.\n\nMit freundlichen Grüßen\n[Ihr Name]\nHuwa Gebäudedienste GmbH`,
  },
  {
    label: "Rückruf bestätigen",
    subject: `Rückruf – ${company.name}`,
    body: `Sehr geehrte Damen und Herren,\n\nvielen Dank für Ihr Interesse an unseren Dienstleistungen.\n\nIch melde mich wie vereinbart am [Datum] um [Uhrzeit] Uhr bei Ihnen.\n\nBis dahin stehe ich bei Fragen gerne per E-Mail zur Verfügung.\n\nMit freundlichen Grüßen\n[Ihr Name]\nHuwa Gebäudedienste GmbH`,
  },
];

export default function EmailTemplates({ company }) {
  const [open, setOpen] = useState(false);

  if (!company.email) return null;

  const handleTemplate = (tpl) => {
    const mailto = `mailto:${company.email}?subject=${encodeURIComponent(tpl.subject)}&body=${encodeURIComponent(tpl.body)}`;
    window.open(mailto);
    setOpen(false);
  };

  return (
    <div className="relative">
      <button onClick={() => setOpen(v => !v)} className="inline-flex items-center gap-1.5 h-8 text-xs font-medium border border-border bg-background px-3 rounded-md hover:bg-muted transition-colors">
        <Mail className="w-3.5 h-3.5" /> E-Mail Vorlage <ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <div className="absolute right-0 top-9 z-50 bg-card border border-border rounded-xl shadow-lg min-w-[180px] py-1">
          {TEMPLATES(company).map(tpl => (
            <button
              key={tpl.label}
              className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors"
              onClick={() => handleTemplate(tpl)}
            >
              {tpl.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}