import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";
import { toast } from "sonner";

const BRANCHE_TEMPLATES = {
  "Arztpraxis": {
    betreff: "Professionelle Reinigung für Ihre Praxis – Huwa Gebäudedienste",
    intro: "für Arztpraxen bieten wir hygienische Unterhaltsreinigung mit Desinfektion nach höchsten Standards an.",
  },
  "Zahnarztpraxis": {
    betreff: "Hygienische Praxisreinigung – Huwa Gebäudedienste Neuwied",
    intro: "für Zahnarztpraxen bieten wir hygienische Unterhaltsreinigung mit Desinfektion nach höchsten Standards an.",
  },
  "IT / Software": {
    betreff: "Büroreinigung für Ihr Unternehmen – Huwa Gebäudedienste",
    intro: "für IT-Unternehmen bieten wir flexible Büroreinigung zu fairen Preisen an – auch außerhalb Ihrer Arbeitszeiten.",
  },
  "Kanzlei / Architekt": {
    betreff: "Professionelle Büroreinigung – Huwa Gebäudedienste Neuwied",
    intro: "für Kanzleien und Büros bieten wir diskrete, zuverlässige Unterhaltsreinigung an.",
  },
  "Autohaus / Kfz-Betrieb": {
    betreff: "Werkstatt- & Hallenreinigung – Huwa Gebäudedienste",
    intro: "für Autohäuser und Werkstätten bieten wir professionelle Hallen- und Werkstattreinigung an.",
  },
  "Baufirma": {
    betreff: "Bauendreinigung & Hallenreinigung – Huwa Gebäudedienste",
    intro: "für Baufirmen bieten wir Bauendreinigung, Grundreinigung und maschinelle Hallenreinigung an.",
  },
};

const DEFAULT_TEMPLATE = {
  betreff: "Professionelle Gebäudereinigung – Huwa Gebäudedienste Neuwied",
  intro: "wir bieten professionelle Unterhaltsreinigung, Büroreinigung und Sonderreinigungen für Gewerbe und Industrie an.",
};

function buildMailto(company) {
  const template = BRANCHE_TEMPLATES[company.branche] || DEFAULT_TEMPLATE;
  const ansprechpartner = company.ansprechpartner ? `${company.ansprechpartner}` : "Damen und Herren";

  const body = `Sehr geehrte/r ${ansprechpartner},

mein Name ist [Ihr Name] und ich bin Mitarbeiter der Huwa Gebäudedienste aus Neuwied.

Wir haben versucht Sie telefonisch zu erreichen, leider ohne Erfolg – daher melden wir uns auf diesem Weg.

${template.intro}

Unsere Leistungen auf einen Blick:
• Unterhaltsreinigung (täglich / wöchentlich)
• Büro- & Praxisreinigung
• Hallen- & Maschinelle Reinigung
• Grundreinigung & Sonderreinigungen

Wir würden uns freuen, Ihnen ein unverbindliches Angebot zu unterbreiten und einen kurzen Termin vor Ort zu vereinbaren.

Darf ich Sie kurz zurückrufen, um einen passenden Termin abzustimmen?

Mit freundlichen Grüßen,
[Ihr Name]
Huwa Gebäudedienste
Tel: [Ihre Nummer]
www.huwa-gebaeudedienste.de`;

  const subject = encodeURIComponent(template.betreff);
  const bodyEncoded = encodeURIComponent(body);
  const to = encodeURIComponent(company.email || "");

  return `mailto:${to}?subject=${subject}&body=${bodyEncoded}`;
}

export default function SendEmailButton({ company }) {
  const hasEmail = !!company?.email;

  const handleClick = () => {
    if (!hasEmail) {
      toast.error("Keine Email-Adresse hinterlegt");
      return;
    }
    const mailto = buildMailto(company);
    window.location.href = mailto;
    toast.success("Email-Programm wird geöffnet...");
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className="text-xs gap-1.5 text-blue-700 border-blue-200 hover:bg-blue-50"
      onClick={handleClick}
      title={hasEmail ? company.email : "Keine Email-Adresse vorhanden"}
    >
      <Mail className="w-3 h-3" />
      Email senden
    </Button>
  );
}