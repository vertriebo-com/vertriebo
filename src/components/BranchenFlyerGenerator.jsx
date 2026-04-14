import { useState } from "react";
import { FileText, Loader2, Download } from "lucide-react";
import { toast } from "sonner";
import { jsPDF } from "jspdf";

// jsPDF v2+ unterstuetzt UTF-8 direkt mit den Standard-Fonts wenn
// wir die Sonderzeichen-Zeichen manuell mappen
function s(str) {
  if (!str) return "";
  return String(str)
    .replace(/ä/g, "\xe4").replace(/Ä/g, "\xc4")
    .replace(/ö/g, "\xf6").replace(/Ö/g, "\xd6")
    .replace(/ü/g, "\xfc").replace(/Ü/g, "\xdc")
    .replace(/ß/g, "\xdf")
    .replace(/\u2013/g, "-").replace(/\u2014/g, "-");
}

const HUWA_BLUE   = [15,  76, 179];
const HUWA_DARK   = [10,  30,  70];
const HUWA_LIGHT  = [235, 242, 255];
const HUWA_ACCENT = [255, 185,   0];

const BRANCHEN = [
  {
    key: "buero",
    label: "Büro & Verwaltung",
    tagline: "Sauberkeit, die Ihre Mitarbeiter motiviert",
    subline: "Professionelle Büroreinigung – täglich zuverlässig",
    intro: "Ein sauberes Büro steigert die Produktivität und hinterlässt bei Kunden einen professionellen Eindruck. Huwa sorgt dafür, dass Ihr Büro täglich frisch und hygienisch gereinigt ist.",
    leistungen: [
      { title: "Tägliche Unterhaltsreinigung", desc: "Böden, Oberflächen, Schreibtische – zuverlässig vor Arbeitsbeginn oder am Abend." },
      { title: "Sanitär- & Küchenreinigung", desc: "Hygienische Reinigung aller WCs, Waschbecken, Küchen und Pausenräume." },
      { title: "Fenster- & Glasreinigung", desc: "Kristallklare Fenster und Glasfronten für ein helles, einladendes Ambiente." },
      { title: "Grundreinigung", desc: "Intensive Tiefenreinigung – ideal für Umzüge, Jahresabschlüsse oder nach Renovierungen." },
      { title: "Treppenhausreinigung", desc: "Regelmäßige Pflege von Treppenhäusern, Aufzügen und Eingangsbereichen." },
    ],
    vorteile: ["Reinigung außerhalb Ihrer Arbeitszeiten", "Feste Ansprechpartner", "Kein Eigenaufwand für Reinigungsmittel", "Flexible Intervalle: täglich bis monatlich"],
    cta: "Kostenloses Angebot für Ihr Büro anfordern!",
  },
  {
    key: "arzt",
    label: "Arzt- & Zahnarztpraxis",
    tagline: "Hygiene, auf die Sie sich verlassen können",
    subline: "Reinigung nach höchsten Hygienestandards",
    intro: "In Arzt- und Zahnarztpraxen ist Hygiene keine Option – sie ist Pflicht. Huwa reinigt Ihre Praxis nach höchsten Standards und stellt sicher, dass Patienten und Personal jederzeit in einem sicheren Umfeld sind.",
    leistungen: [
      { title: "Hygienische Unterhaltsreinigung", desc: "Tägliche Desinfektion aller Kontaktflächen, Türgriffe, Wartebereich und Behandlungsräume." },
      { title: "Sanitärdesinfektion", desc: "Gründliche Reinigung und Desinfektion aller Sanitäranlagen nach RKI-Empfehlungen." },
      { title: "Bodenreinigung & Desinfektion", desc: "Wischdesinfektion mit geeigneten, zugelassenen Mitteln auf allen Böden." },
      { title: "Abfallentsorgung", desc: "Fachgerechte Entsorgung und Reinigung von Abfallbehältern in allen Praxisräumen." },
      { title: "Wartezimmer & Empfang", desc: "Täglich frisch gereinigter Empfangsbereich für einen positiven ersten Eindruck." },
    ],
    vorteile: ["Reinigung vor Praxisöffnung oder nach Feierabend", "Zugelassene Desinfektionsmittel", "Geschultes Personal für med. Umgebungen", "Diskret & zuverlässig"],
    cta: "Jetzt Praxisreinigung anfragen – kostenlos & unverbindlich!",
  },
  {
    key: "halle",
    label: "Produktions- & Lagerhalle",
    tagline: "Starke Reinigung für starke Betriebe",
    subline: "Maschinelle Hallenreinigung für Industrie & Logistik",
    intro: "Produktions- und Lagerhallen stellen besondere Anforderungen: große Flächen, schwere Verschmutzungen und enge Zeitfenster. Huwa setzt modernste Reinigungsmaschinen ein und sorgt für sichere Arbeitsbedingungen.",
    leistungen: [
      { title: "Maschinelle Hallenreinigung", desc: "Scheuersaugmaschinen und Kehrmaschinen für schnelle Reinigung großer Flächen." },
      { title: "Hochdruckreinigung", desc: "Entfernung hartnäckiger Öl-, Fett- und Schmutzrückstände von Böden und Wänden." },
      { title: "Lager- & Regalbodenpflege", desc: "Reinigung von Lagerregalen, Rollcontainern und Lagerbereichen." },
      { title: "Industrieboden-Pflege", desc: "Schutz und Pflege von Epoxid-, Beton- und Industrieböden." },
      { title: "Sonderreinigung nach Schicht", desc: "Intensive Reinigung am Wochenende – minimale Betriebsunterbrechung." },
    ],
    vorteile: ["Modernste Reinigungsmaschinen", "Auch für schwere Industrieverschmutzungen", "Nachts / am Wochenende möglich", "Schnelle Reaktionszeiten"],
    cta: "Hallenpflege anfragen – kostenlose Besichtigung vor Ort!",
  },
  {
    key: "autohaus",
    label: "Autohaus & Kfz-Betrieb",
    tagline: "Glänzende Sauberkeit für Ihren Betrieb",
    subline: "Werkstatt-, Hallen- und Showroomreinigung aus einer Hand",
    intro: "Ob Werkstatthalle, Ausstellungsraum oder Kundensanitär – in Autohäusern entstehen täglich starke Verschmutzungen durch Öl, Reifen und Werkzeug. Huwa sorgt für Ordnung und Sauberkeit.",
    leistungen: [
      { title: "Werkstattreinigung", desc: "Entfernung von Öl-, Fett- und Reifenspuren auf Werkstattböden – maschinell oder manuell." },
      { title: "Showroom & Ausstellung", desc: "Tägliche Pflege des Ausstellungsraums: Böden, Glasfronten, Empfang und Kundenbereiche." },
      { title: "Hochdruck Außenbereich", desc: "Reinigung von Einfahrten, Parkflächen, Rampen und Außenbereichen." },
      { title: "Sanitär & Aufenthaltsräume", desc: "Hygienische Reinigung aller Mitarbeiter- und Kundensanitär sowie Pausenräume." },
      { title: "Schaufensterreinigung", desc: "Blitzsaubere Schaufenster und Glasfassaden für einen professionellen Auftritt." },
    ],
    vorteile: ["Erfahrung mit Industrie-Verschmutzungen", "Reinigung außerhalb der Öffnungszeiten", "Täglich oder wöchentlich", "Komplett-Service vom Profi"],
    cta: "Jetzt Betriebsreinigung anfragen – unverbindlich & kostenlos!",
  },
  {
    key: "kanzlei",
    label: "Kanzlei & Architekturbüro",
    tagline: "Diskretion & Sauberkeit für anspruchsvolle Umgebungen",
    subline: "Reinigung für Kanzleien, Notariate und Planungsbüros",
    intro: "In Kanzleien und Architekturbüros ist ein gepflegtes Erscheinungsbild essenziell. Ihre Mandanten erwarten ein seriöses Umfeld. Huwa reinigt diskret, zuverlässig und nach Ihren Wünschen.",
    leistungen: [
      { title: "Diskrete Unterhaltsreinigung", desc: "Reinigung aller Büroräume, Besprechungszimmer und Empfangsbereiche außerhalb der Kanzleizeiten." },
      { title: "Aktenschrank & Regalpflege", desc: "Staubfreie Reinigung von Regalen und Arbeitsflächen ohne Umsortierung." },
      { title: "Sanitär & Küche", desc: "Hygienische Reinigung aller Sanitäranlagen und der Büroküche." },
      { title: "Glasreinigung", desc: "Reinigung von Trennwänden, Glasfronten und Fenstern für ein hochwertiges Bild." },
      { title: "Empfangsbereich", desc: "Täglich frischer Empfang – der erste Eindruck entscheidet." },
    ],
    vorteile: ["100 % diskrete Durchführung", "Reinigung vor/nach Kanzleiöffnung", "Fester Mitarbeiter – kein Wechsel", "Auf Wunsch auch samstags"],
    cta: "Kanzleipflege anfragen – kostenlos & unverbindlich!",
  },
  {
    key: "gastronomie",
    label: "Gastronomie & Lebensmittel",
    tagline: "Sauber, hygienisch, HACCP-konform",
    subline: "Gewerbliche Reinigung für Restaurants, Cafés und Betriebe",
    intro: "In der Gastronomie sind Hygiene und Sauberkeit gesetzlich vorgeschrieben. Huwa reinigt Ihre Küche, den Gastraum und das Lager nach HACCP-Grundsätzen – damit Sie sich auf Ihre Gäste konzentrieren können.",
    leistungen: [
      { title: "Küchenreinigung & Entfettung", desc: "Gründliche Reinigung von Küchengeräten, Abzugshauben, Grills und Friteusen." },
      { title: "Gastraum & Theke", desc: "Tägliche Reinigung von Tischen, Stühlen, Böden, Tresen und Fensterflächen." },
      { title: "Kühlraum & Lager", desc: "Regelmäßige Reinigung und Desinfektion von Kühlräumen und Lagerbereichen." },
      { title: "Sanitäranlagen", desc: "Hygienische Reinigung und Desinfektion aller Gäste- und Personaltoiletten." },
      { title: "Sonderreinigung nach Events", desc: "Schnelle Grundreinigung nach Veranstaltungen und Großevents." },
    ],
    vorteile: ["HACCP-konforme Reinigungsverfahren", "Reinigung nach Betriebsschluss", "Lebensmittel-zugelassene Mittel", "Sonderreinigungen nach Events"],
    cta: "Jetzt Gastro-Reinigung anfragen – kostenlos & schnell!",
  },
  {
    key: "einzelhandel",
    label: "Einzelhandel & Supermarkt",
    tagline: "Einladende Sauberkeit für mehr Umsatz",
    subline: "Verkaufsflächen- und Schaufensterreinigung",
    intro: "Sauberkeit im Einzelhandel steigert das Einkaufserlebnis und erhöht die Verweildauer der Kunden. Huwa hält Ihre Verkaufsflächen, Regale und Eingangsbereiche stets in bestem Zustand.",
    leistungen: [
      { title: "Verkaufsflächenreinigung", desc: "Tägliche Reinigung aller Verkaufsflächen, Regale und Auslagen – vor Ladenöffnung." },
      { title: "Schaufensterreinigung", desc: "Blitzsaubere Schaufenster und Eingangstür – der erste Eindruck zählt." },
      { title: "Kassenbereich & Kundenlaufzonen", desc: "Intensive Pflege stark frequentierter Bereiche für Hygiene und Sauberkeit." },
      { title: "Sanitäranlagen", desc: "Regelmäßige Reinigung und Desinfektion der Kundensanitäranlagen." },
      { title: "Lager & Backoffice", desc: "Ordentliche und saubere Lagerbereiche für effizientes Arbeiten." },
    ],
    vorteile: ["Reinigung vor Ladenöffnung", "Schaufenster immer blitzsauber", "Erfahrung mit Großflächen", "Flexible Wochentag-Planung"],
    cta: "Jetzt Reinigungsangebot anfordern – kostenlos!",
  },
  {
    key: "hotel",
    label: "Hotel & Pension",
    tagline: "Erstklassige Sauberkeit für erstklassige Gäste",
    subline: "Zimmer-, Lobby- und Gemeinschaftsflächenreinigung",
    intro: "In der Hotellerie entscheidet Sauberkeit über Bewertungen und Wiederbuchungen. Huwa bietet professionelle Reinigung auf höchstem Niveau – schnell, zuverlässig und nach Ihrem Standard.",
    leistungen: [
      { title: "Zimmerreinigung", desc: "Professionelle Zimmerreinigung nach Ihrem Hausstandard – schnell und gründlich." },
      { title: "Lobby & Empfangsbereich", desc: "Tägliche Pflege des Eingangsbereichs, der Lobby und der Gemeinschaftsflächen." },
      { title: "Frühstücksraum & Restaurant", desc: "Reinigung nach dem Frühstück und vor der Abendbewirtung." },
      { title: "Sanitär & Wellness", desc: "Hygienische Reinigung von Bädern, Saunen und Wellnessbereichen." },
      { title: "Außenanlage", desc: "Eingangsbereich, Parkflächen und Terrassen stets sauber und einladend." },
    ],
    vorteile: ["Erfahrung im Hospitality-Bereich", "Schnelle Zimmerumrüstung", "Diskretion gegenüber Gästen", "Flexible Zeiten – auch an Wochenenden"],
    cta: "Hotelangebot anfordern – unverbindlich & kostenlos!",
  },
  {
    key: "schule",
    label: "Schule & Bildungseinrichtung",
    tagline: "Saubere Lernumgebung für beste Ergebnisse",
    subline: "Reinigung für Schulen, Kitas und Bildungseinrichtungen",
    intro: "Kinder und Jugendliche verbringen viel Zeit in Bildungseinrichtungen. Eine saubere, hygienische Umgebung ist entscheidend für Gesundheit und Wohlbefinden. Huwa sorgt für optimale Lernbedingungen.",
    leistungen: [
      { title: "Klassenzimmerreinigung", desc: "Tägliche Reinigung aller Unterrichtsräume, Tafeln, Tische und Böden." },
      { title: "Sanitäranlagen", desc: "Besonders gründliche Hygiene in Schüler- und Lehrersanitäranlagen." },
      { title: "Flure & Treppenhäuser", desc: "Saubere Laufwege und Gemeinschaftsflächen für einen positiven Schulalltag." },
      { title: "Turnhalle & Sportanlagen", desc: "Regelmäßige Desinfektion und Reinigung von Sportböden und Umkleiden." },
      { title: "Kita & Krippe", desc: "Kindgerechte, schadstofffreie Reinigung für die Kleinsten." },
    ],
    vorteile: ["Reinigung außerhalb der Unterrichtszeiten", "Schadstofffreie Reinigungsmittel", "Erfahrung mit Bildungseinrichtungen", "Langjährige Partnerschaften"],
    cta: "Jetzt Schulreinigung anfragen – kostenlos!",
  },
  {
    key: "pflege",
    label: "Pflege & Seniorenheim",
    tagline: "Würdevoll sauber – für Ihre Bewohner",
    subline: "Reinigung für Pflegeeinrichtungen und Seniorenheime",
    intro: "Pflegeeinrichtungen stellen höchste Ansprüche an Hygiene und Sauberkeit. Huwa reinigt mit Sensibilität und Fachkenntnis – für das Wohlbefinden Ihrer Bewohner und die Sicherheit Ihrer Mitarbeiter.",
    leistungen: [
      { title: "Bewohnerzimmerreinigung", desc: "Diskrete, regelmäßige Reinigung aller Zimmer – respektvoll und gründlich." },
      { title: "Gemeinschafts- & Aufenthaltsräume", desc: "Tägliche Pflege von Aufenthaltsräumen, Speisesaal und Flurbereichen." },
      { title: "Küche & Speisesaal", desc: "Hygienische Reinigung nach HACCP-Standard in allen Küchen- und Essbereichen." },
      { title: "Desinfektionsreinigung", desc: "Gezielte Desinfektion bei Infektionsrisiken und nach medizinischen Eingriffen." },
      { title: "Außenanlage & Terrassen", desc: "Gepflegte Außenanlagen als Wohlfühloase für Bewohner und Besucher." },
    ],
    vorteile: ["Empathischer Umgang mit Bewohnern", "Zertifizierte Desinfektionsmittel", "Erfahrung in Pflegeeinrichtungen", "Diskret & verlässlich"],
    cta: "Pflegeheim-Reinigung anfragen – unverbindlich!",
  },
];

function drawHeader(doc, W, branche) {
  doc.setFillColor(...HUWA_DARK);
  doc.rect(0, 0, W, 14, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("HUWA", 8, 9.5);

  doc.setFillColor(...HUWA_ACCENT);
  doc.circle(30, 7, 1, "F");

  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(180, 200, 230);
  doc.text(s("Gebäudereinigung & Hausmeisterdienste"), 34, 9.5);

  doc.setFontSize(6);
  doc.setTextColor(160, 185, 220);
  doc.text("02601/9131820  |  www.huwa-gebaeudedienste.de", W - 8, 9.5, { align: "right" });

  doc.setFillColor(...HUWA_BLUE);
  doc.rect(0, 14, W, 42, "F");
  doc.setFillColor(...HUWA_ACCENT);
  doc.rect(0, 14, 4, 42, "F");

  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.3);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(W - 58, 18, 52, 8, 2, 2, "D");
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text(s(branche.label), W - 32, 23.5, { align: "center" });

  doc.setFontSize(17);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  const hl = doc.splitTextToSize(s(branche.tagline), W - 25);
  doc.text(hl, 10, 30);

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(190, 215, 255);
  doc.text(s(branche.subline), 10, 30 + hl.length * 7 + 2);
}

function drawFooter(doc, W, H, cta) {
  doc.setFillColor(...HUWA_DARK);
  doc.rect(0, H - 30, W, 30, "F");
  doc.setFillColor(...HUWA_ACCENT);
  doc.rect(0, H - 30, W, 1.5, "F");

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text(s(cta), W / 2, H - 19, { align: "center" });

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(160, 185, 220);
  doc.text("Tel: 02601 / 9131820   |   info@huwa-gebaeudedienste.de   |   www.huwa-gebaeudedienste.de", W / 2, H - 11, { align: "center" });
  doc.text("Mittelweg 24  -  56566 Neuwied", W / 2, H - 5, { align: "center" });
}

function sectionBar(doc, W, y, title) {
  doc.setFillColor(...HUWA_BLUE);
  doc.rect(0, y - 1, W, 9, "F");
  doc.setFillColor(...HUWA_ACCENT);
  doc.rect(0, y - 1, 4, 9, "F");
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text(s(title), 10, y + 5);
}

function generatePDF(branche) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210;
  const H = 297;

  drawHeader(doc, W, branche);

  let y = 64;

  // Intro
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(50, 60, 80);
  const introLines = doc.splitTextToSize(s(branche.intro), W - 20);
  doc.text(introLines, 10, y);
  y += introLines.length * 4.8 + 8;

  // Leistungen
  sectionBar(doc, W, y, "Unsere Leistungen für Sie");
  y += 13;

  branche.leistungen.forEach((l, i) => {
    doc.setFillColor(...HUWA_BLUE);
    doc.circle(14, y + 1.5, 3.2, "F");
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text(String(i + 1), 14, y + 3, { align: "center" });

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...HUWA_BLUE);
    doc.text(s(l.title), 20, y + 2);

    doc.setFontSize(7.8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 70, 90);
    const descLines = doc.splitTextToSize(s(l.desc), W - 28);
    doc.text(descLines, 20, y + 7);
    y += 7 + descLines.length * 4.2 + 3;
  });

  y += 4;

  // Vorteile
  sectionBar(doc, W, y, "Ihre Vorteile auf einen Blick");
  y += 13;

  const colW = (W - 22) / 2;
  branche.vorteile.forEach((v, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const bx = 10 + col * (colW + 4);
    const by = y + row * 10;

    doc.setFillColor(...HUWA_LIGHT);
    doc.roundedRect(bx, by - 1, colW, 8.5, 1.5, 1.5, "F");
    doc.setFillColor(...HUWA_BLUE);
    doc.roundedRect(bx, by - 1, 2.5, 8.5, 1, 1, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(20, 30, 60);
    doc.text(s(v), bx + 5.5, by + 4.5);
  });

  y += Math.ceil(branche.vorteile.length / 2) * 10 + 8;

  // Über uns Box
  doc.setFillColor(...HUWA_LIGHT);
  doc.setDrawColor(...HUWA_BLUE);
  doc.setLineWidth(0.4);
  doc.roundedRect(10, y, W - 20, 22, 2, 2, "FD");
  doc.setFillColor(...HUWA_ACCENT);
  doc.roundedRect(10, y, 3, 22, 1, 1, "F");

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...HUWA_BLUE);
  doc.text(s("Über Huwa Gebäudereinigung & Hausmeisterdienste"), 17, y + 7);
  doc.setFontSize(7.8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(50, 60, 80);
  const about = doc.splitTextToSize(
    s("Ihr regionaler Partner aus Neuwied. Seit Jahren zuverlässig, fair und professionell – für kleine Büros und große Industriebetriebe gleichermaßen. Sprechen Sie uns an – wir erstellen Ihnen gerne ein kostenloses Angebot!"),
    W - 28
  );
  doc.text(about, 17, y + 13);

  drawFooter(doc, W, H, branche.cta);
  doc.save("Huwa_Flyer_" + branche.key + ".pdf");
}

export default function BranchenFlyerGenerator() {
  const [loadingKey, setLoadingKey] = useState(null);

  const handleGenerate = (branche) => {
    setLoadingKey(branche.key);
    setTimeout(() => {
      try {
        generatePDF(branche);
        toast.success("Flyer für " + branche.label + " erstellt!");
      } catch (e) {
        toast.error("Fehler beim Erstellen.");
        console.error(e);
      }
      setLoadingKey(null);
    }, 80);
  };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
          <FileText className="w-4 h-4 text-white" />
        </div>
        <div>
          <h3 className="text-sm font-semibold">Branchen-Flyer</h3>
          <p className="text-xs text-muted-foreground">Individueller PDF-Flyer pro Branche – einheitliches Huwa-Design</p>
        </div>
      </div>
      <div className="p-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {BRANCHEN.map(branche => (
          <button
            key={branche.key}
            onClick={() => handleGenerate(branche)}
            disabled={loadingKey === branche.key}
            className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background hover:bg-accent hover:border-primary/40 transition-all text-left group disabled:opacity-50"
          >
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              {loadingKey === branche.key
                ? <Loader2 className="w-4 h-4 animate-spin text-primary" />
                : <Download className="w-4 h-4 text-primary" />
              }
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                {branche.label}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {loadingKey === branche.key ? "Erstelle PDF..." : "PDF herunterladen"}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}