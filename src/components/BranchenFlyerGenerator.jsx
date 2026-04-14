import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Loader2, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function t(str) {
  return str
    .replace(/ä/g, "ae").replace(/Ä/g, "Ae")
    .replace(/ö/g, "oe").replace(/Ö/g, "Oe")
    .replace(/ü/g, "ue").replace(/Ü/g, "Ue")
    .replace(/ß/g, "ss")
    .replace(/–/g, "-").replace(/—/g, "-");
}

const BRANCHEN = [
  {
    key: "buero",
    label: "Büro & Verwaltung",
    color: [15, 76, 179],
    icon: "BUERO",
    headline: "Sauberkeit, die Ihre Mitarbeiter motiviert",
    subline: "Professionelle Büroreinigung für ein angenehmes Arbeitsumfeld",
    intro: "Ein sauberes Büro steigert die Produktivität und hinterlässt bei Kunden einen professionellen Eindruck. Huwa sorgt dafür, dass Ihr Büro täglich frisch und hygienisch gereinigt ist – damit sich Ihr Team auf das Wesentliche konzentrieren kann.",
    leistungen: [
      { title: "Tägliche Unterhaltsreinigung", desc: "Böden, Oberflächen, Schreibtische – zuverlässig jeden Morgen vor Arbeitsbeginn oder am Abend." },
      { title: "Sanitär- & Küchenreinigung", desc: "Hygienische Reinigung aller WCs, Waschbecken, Küchen und Pausenräume." },
      { title: "Fenster- & Glasreinigung", desc: "Kristallklare Fenster und Glasfronten für ein helles, einladendes Büroambiente." },
      { title: "Grundreinigung", desc: "Intensive Tiefenreinigung aller Räume – ideal für Umzüge, Jahresabschlüsse oder nach Renovierungen." },
    ],
    vorteile: [
      "Reinigung außerhalb Ihrer Arbeitszeiten",
      "Feste Ansprechpartner – immer erreichbar",
      "Kein Eigenaufwand für Reinigungsmittel",
      "Flexible Intervalle: täglich, wöchentlich, monatlich",
    ],
    cta: "Kostenloses Angebot für Ihr Büro anfordern!",
  },
  {
    key: "arzt",
    label: "Arzt- & Zahnarztpraxis",
    color: [0, 140, 100],
    icon: "PRAXIS",
    headline: "Hygiene, auf die Sie sich verlassen können",
    subline: "Zertifizierte Reinigung für medizinische Einrichtungen",
    intro: "In Arzt- und Zahnarztpraxen ist Hygiene keine Option – sie ist Pflicht. Huwa reinigt Ihre Praxis nach höchsten Hygienestandards und stellt sicher, dass Patienten und Personal jederzeit in einem sicheren Umfeld arbeiten und warten.",
    leistungen: [
      { title: "Hygienische Unterhaltsreinigung", desc: "Tägliche Desinfektion aller Kontaktflächen, Türgriffe, Wartebereich und Behandlungsräume." },
      { title: "Sanitärdesinfektion", desc: "Gründliche Reinigung und Desinfektion aller Sanitäranlagen nach RKI-Empfehlungen." },
      { title: "Bodenreinigung & Desinfektion", desc: "Wischdesinfektion aller Böden mit geeigneten, zugelassenen Reinigungsmitteln." },
      { title: "Abfallentsorgung", desc: "Fachgerechte Entsorgung und Reinigung von Abfallbehältern in allen Praxisräumen." },
    ],
    vorteile: [
      "Reinigung vor Praxisöffnung oder nach Feierabend",
      "Verwendung zugelassener Desinfektionsmittel",
      "Geschultes Personal für medizinische Umgebungen",
      "Diskrete & zuverlässige Durchführung",
    ],
    cta: "Jetzt Praxisreinigung anfragen – kostenlos & unverbindlich!",
  },
  {
    key: "halle",
    label: "Produktions- & Lagerhalle",
    color: [180, 80, 0],
    icon: "HALLE",
    headline: "Starke Reinigung für starke Betriebe",
    subline: "Maschinelle Hallenreinigung für Industrie und Logistik",
    intro: "Produktions- und Lagerhallen stellen besondere Anforderungen an die Reinigung: große Flächen, schwere Verschmutzungen, Maschinen und enge Zeitfenster. Huwa setzt modernste Reinigungsmaschinen ein und sorgt für saubere, sichere Arbeitsbedingungen.",
    leistungen: [
      { title: "Maschinelle Hallenreinigung", desc: "Scheuersaugmaschinen und Kehrmaschinen für schnelle und gründliche Reinigung großer Flächen." },
      { title: "Hochdruckreinigung", desc: "Entfernung hartnäckiger Öl-, Fett- und Schmutzrückstände von Böden, Wänden und Maschinen." },
      { title: "Lager- & Regalbodenpflege", desc: "Reinigung von Lagerregalen, Rollcontainern und Lagerbereichen." },
      { title: "Grundreinigung nach Schichtbetrieb", desc: "Intensive Reinigung am Wochenende oder zwischen Schichten – minimale Betriebsunterbrechung." },
    ],
    vorteile: [
      "Modernste Reinigungsmaschinen im Einsatz",
      "Auch für schwere Industrie-Verschmutzungen",
      "Reinigung nachts / am Wochenende möglich",
      "Schnelle Reaktionszeiten & Sonderreinigungen",
    ],
    cta: "Hallenpflege anfragen – kostenlose Besichtigung vor Ort!",
  },
  {
    key: "autohaus",
    label: "Autohaus & Kfz-Betrieb",
    color: [80, 80, 80],
    icon: "KFZ",
    headline: "Glänzende Sauberkeit für Ihren Betrieb",
    subline: "Werkstatt-, Hallen- und Showroomreinigung aus einer Hand",
    intro: "Ob Werkstatthalle, Ausstellungsraum oder Kundensanitär – in Autohäusern und Kfz-Betrieben entstehen täglich starke Verschmutzungen durch Öl, Reifen und Werkzeug. Huwa sorgt für Ordnung und Sauberkeit, die Ihre Kunden beeindruckt.",
    leistungen: [
      { title: "Werkstattreinigung", desc: "Entfernung von Öl-, Fett- und Reifenspuren auf Werkstattböden – maschinell oder manuell." },
      { title: "Showroom & Ausstellung", desc: "Tägliche Pflege Ihres Ausstellungsraums: Böden, Glasfronten, Empfang und Kundenbereiche." },
      { title: "Hochdruckreinigung Außenbereich", desc: "Reinigung von Einfahrten, Parkflächen, Rampen und Außenbereichen." },
      { title: "Sanitär & Aufenthaltsräume", desc: "Hygienische Reinigung aller Mitarbeiter- und Kundensanitäranlagen sowie Pausenräume." },
    ],
    vorteile: [
      "Erfahrung mit Öl- und Industrieverschmutzungen",
      "Reinigung außerhalb der Öffnungszeiten",
      "Auf Wunsch tägliche oder wöchentliche Intervalle",
      "Komplettservice – von der Werkstatt bis zum Showroom",
    ],
    cta: "Jetzt Betriebsreinigung anfragen – unverbindlich & kostenlos!",
  },
  {
    key: "kanzlei",
    label: "Kanzlei & Architekturbüro",
    color: [60, 40, 120],
    icon: "KANZLEI",
    headline: "Diskretion & Sauberkeit für anspruchsvolle Umgebungen",
    subline: "Professionelle Reinigung für Kanzleien, Notariate und Planungsbüros",
    intro: "In Kanzleien und Architekturbüros ist ein gepflegtes Erscheinungsbild essenziell. Ihre Mandanten und Klienten erwarten ein seriöses Umfeld. Huwa reinigt diskret, zuverlässig und nach Ihren Wünschen – damit Sie sich auf Ihre Arbeit konzentrieren können.",
    leistungen: [
      { title: "Diskrete Unterhaltsreinigung", desc: "Reinigung aller Büroräume, Besprechungszimmer und Empfangsbereiche außerhalb der Kanzleizeiten." },
      { title: "Aktenschrank & Regalpflege", desc: "Staubfreie Reinigung von Regalen, Aktenschränken und Arbeitsflächen ohne Umsortierung." },
      { title: "Sanitär & Küche", desc: "Hygienische Reinigung aller Sanitäranlagen und der Büroküche." },
      { title: "Glasreinigung", desc: "Reinigung von Trennwänden, Glasfronten und Fenstern für ein hochwertiges Erscheinungsbild." },
    ],
    vorteile: [
      "100% diskrete Durchführung",
      "Reinigung vor oder nach Kanzleiöffnung",
      "Fester Mitarbeiter – kein ständig wechselndes Personal",
      "Auf Wunsch auch samstags",
    ],
    cta: "Kanzleipflege anfragen – kostenlos & unverbindlich!",
  },
  {
    key: "gastronomie",
    label: "Gastronomie & Lebensmittel",
    color: [180, 30, 50],
    icon: "GASTRO",
    headline: "Sauber, hygienisch, HACCP-konform",
    subline: "Gewerbliche Reinigung für Restaurants, Cafés und Lebensmittelbetriebe",
    intro: "In der Gastronomie sind Hygiene und Sauberkeit gesetzlich vorgeschrieben und für den Erfolg entscheidend. Huwa reinigt Ihre Küche, Gastraum und Lager nach HACCP-Grundsätzen – damit Sie sich auf Ihre Gäste konzentrieren können.",
    leistungen: [
      { title: "Küchenreinigung & Entfettung", desc: "Gründliche Reinigung von Küchengeräten, Abzugshauben, Grills, Friteusen und Arbeitsflächen." },
      { title: "Gastraum & Theke", desc: "Tägliche Reinigung von Tischen, Stühlen, Böden, Tresen und Fensterflächen." },
      { title: "Kühlraum & Lager", desc: "Regelmäßige Reinigung und Desinfektion von Kühlräumen und Lagerbereichen." },
      { title: "Sanitäranlagen", desc: "Hygienische Reinigung und Desinfektion aller Gäste- und Personaltoiletten." },
    ],
    vorteile: [
      "HACCP-konforme Reinigungsverfahren",
      "Reinigung nach Betriebsschluss oder vor Öffnung",
      "Geeignete Lebensmittel-zugelassene Reinigungsmittel",
      "Auch Sonderreinigungen nach Veranstaltungen",
    ],
    cta: "Jetzt Gastro-Reinigung anfragen – kostenlos & schnell!",
  },
];

function generateBranchenPDF(branche) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210;
  const H = 297;
  const [r, g, b] = branche.color;

  // ── Header ──
  doc.setFillColor(r, g, b);
  doc.rect(0, 0, W, 50, "F");

  // HUWA branding
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("HUWA", 15, 12);
  doc.setFontSize(7);
  doc.setTextColor(200, 220, 255);
  doc.text(t("Gebaeudereinigung & Hausmeisterdienste"), 15, 17);

  // Branch icon/label top right
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.setFillColor(255, 255, 255, 0.2);
  doc.text(t(branche.label), W - 15, 12, { align: "right" });

  // Big headline
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  const headlineLines = doc.splitTextToSize(t(branche.headline), W - 30);
  doc.text(headlineLines, 15, 28);

  // Subline
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(210, 230, 255);
  doc.text(t(branche.subline), 15, 28 + headlineLines.length * 7 + 2);

  // ── Intro ──
  let y = 60;
  doc.setTextColor(30, 40, 60);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const intro = doc.splitTextToSize(t(branche.intro), W - 30);
  doc.text(intro, 15, y);
  y += intro.length * 5 + 10;

  // ── Leistungen ──
  doc.setFillColor(r, g, b);
  doc.rect(0, y - 5, W, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(t("Unsere Leistungen fuer Sie"), 15, y + 1);
  y += 12;

  doc.setFillColor(245, 247, 252);
  doc.rect(12, y - 3, W - 24, branche.leistungen.length * 22 + 4, "F");

  branche.leistungen.forEach((l, i) => {
    // Number circle
    doc.setFillColor(r, g, b);
    doc.circle(20, y + 2, 3.5, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text(String(i + 1), 20, y + 3.5, { align: "center" });

    doc.setTextColor(r, g, b);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(t(l.title), 27, y + 3);
    y += 7;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(70, 80, 100);
    const lines = doc.splitTextToSize(t(l.desc), W - 44);
    doc.text(lines, 27, y);
    y += lines.length * 4.5 + 5;
  });

  y += 6;

  // ── Vorteile ──
  doc.setTextColor(30, 40, 60);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(t("Ihre Vorteile"), 15, y);
  y += 8;

  const colW = (W - 30) / 2;
  branche.vorteile.forEach((v, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const bx = 15 + col * (colW + 6);
    const by = y + row * 12;
    // colored left border
    doc.setFillColor(r, g, b);
    doc.rect(bx, by - 4, 2.5, 10, "F");
    doc.setFillColor(245, 247, 252);
    doc.rect(bx + 2.5, by - 4, colW - 2.5, 10, "F");
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(30, 40, 60);
    doc.text(t(v), bx + 6, by + 2);
  });

  y += Math.ceil(branche.vorteile.length / 2) * 12 + 12;

  // ── Über uns Box ──
  doc.setFillColor(r, g, b, 0.08);
  doc.setDrawColor(r, g, b);
  doc.setLineWidth(0.5);
  doc.roundedRect(12, y, W - 24, 28, 3, 3, "FD");
  doc.setTextColor(r, g, b);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(t("Über Huwa Gebaeudereinigung & Hausmeisterdienste"), 18, y + 8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(50, 60, 80);
  const aboutText = doc.splitTextToSize(
    t("Ihr regionaler Partner aus Neuwied. Wir sind seit Jahren zuverlässig, fair und professionell – für kleine Büros und große Industriebetriebe gleichermaßen. Sprechen Sie uns an!"),
    W - 36
  );
  doc.text(aboutText, 18, y + 14);

  // ── Footer ──
  doc.setFillColor(r, g, b);
  doc.rect(0, H - 35, W, 35, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(t(branche.cta), W / 2, H - 22, { align: "center" });
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(200, 220, 255);
  doc.text("Tel: 02601 / 9131820   |   info@huwa-gebaeudedienste.de   |   www.huwa-gebaeudedienste.de", W / 2, H - 13, { align: "center" });
  doc.setFontSize(7.5);
  doc.text("Mittelweg 24 - 56566 Neuwied", W / 2, H - 7, { align: "center" });

  doc.save(t("Huwa_Flyer_" + branche.label.replace(/ & /g, "_").replace(/ /g, "_") + ".pdf"));
}

export default function BranchenFlyerGenerator() {
  const [loadingKey, setLoadingKey] = useState(null);

  const handleGenerate = (branche) => {
    setLoadingKey(branche.key);
    setTimeout(() => {
      try {
        generateBranchenPDF(branche);
        toast.success(t("Flyer für " + branche.label + " erfolgreich erstellt!"));
      } catch (e) {
        toast.error("Fehler beim Erstellen des Flyers.");
        console.error(e);
      }
      setLoadingKey(null);
    }, 100);
  };

  return (
    <div className="bg-card border border-border rounded-xl">
      <div className="px-5 py-4 border-b border-border">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          {t("Branchen-Flyer generieren")}
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          {t("Jede Branche erhält einen individuellen, spezialisierten Flyer – einfach klicken & herunterladen.")}
        </p>
      </div>
      <div className="p-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {BRANCHEN.map(branche => (
          <button
            key={branche.key}
            onClick={() => handleGenerate(branche)}
            disabled={loadingKey === branche.key}
            className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background hover:bg-accent hover:border-primary/30 transition-all text-left group disabled:opacity-60"
          >
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-white text-[9px] font-bold"
              style={{ backgroundColor: `rgb(${branche.color.join(",")})` }}
            >
              {loadingKey === branche.key
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <FileText className="w-4 h-4" />
              }
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                {branche.label}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {loadingKey === branche.key ? "Erstelle PDF..." : "Flyer herunterladen"}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}