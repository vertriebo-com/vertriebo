import { useState } from "react";
import { FileText, Loader2, Download } from "lucide-react";
import { toast } from "sonner";
import { jsPDF } from "jspdf";

// ── Umlaut-Safe ──────────────────────────────────────────
function tx(str) {
  if (!str) return "";
  return String(str)
    .replace(/ä/g, "ae").replace(/Ä/g, "Ae")
    .replace(/ö/g, "oe").replace(/Ö/g, "Oe")
    .replace(/ü/g, "ue").replace(/Ü/g, "Ue")
    .replace(/ß/g, "ss")
    .replace(/–/g, "-").replace(/—/g, "-")
    .replace(/„/g, '"').replace(/"/g, '"').replace(/"/g, '"');
}

// ── Huwa Brand Colors ────────────────────────────────────
const HUWA_BLUE   = [15,  76, 179];   // primary
const HUWA_DARK   = [10,  30,  70];   // dark header
const HUWA_LIGHT  = [235, 242, 255];  // bg tint
const HUWA_ACCENT = [255, 185,   0];  // gold accent

// ── Branchen ─────────────────────────────────────────────
const BRANCHEN = [
  {
    key: "buero",
    label: "Buero & Verwaltung",
    labelRaw: "Büro & Verwaltung",
    tagline: "Sauberkeit, die Ihre Mitarbeiter motiviert",
    subline: "Professionelle Bueroreinigung - taeglich zuverlaessig",
    intro: "Ein sauberes Buero steigert die Produktivitaet und hinterlaesst bei Kunden einen professionellen Eindruck. Huwa sorgt dafuer, dass Ihr Buero taeglich frisch und hygienisch gereinigt ist.",
    leistungen: [
      { title: "Taegl. Unterhaltsreinigung", desc: "Boeden, Oberflaechen, Schreibtische - zuverlaessig vor Arbeitsbeginn oder am Abend." },
      { title: "Sanitaer- & Kuechemreinigung", desc: "Hygienische Reinigung aller WCs, Waschbecken, Kuechen und Pausenraeume." },
      { title: "Fenster- & Glasreinigung", desc: "Kristallklare Fenster und Glasfronten fuer ein helles, einladendes Ambiente." },
      { title: "Grundreinigung", desc: "Intensive Tiefenreinigung - ideal fuer Umzuege, Jahresabschluesse oder nach Renovierungen." },
      { title: "Treppenhausreinigung", desc: "Regelmaessige Pflege von Treppenhaeusern, Aufzuegen und Eingangsbereichen." },
    ],
    vorteile: ["Reinigung ausserhalb Ihrer Arbeitszeiten", "Feste Ansprechpartner", "Kein Eigenaufwand fuer Reinigungsmittel", "Flexible Intervalle: taeglich bis monatlich"],
    cta: "Kostenloses Angebot fuer Ihr Buero anfordern!",
  },
  {
    key: "arzt",
    label: "Arzt- & Zahnarztpraxis",
    labelRaw: "Arzt- & Zahnarztpraxis",
    tagline: "Hygiene auf die Sie sich verlassen koennen",
    subline: "Reinigung nach hoechsten Hygienestandards",
    intro: "In Arzt- und Zahnarztpraxen ist Hygiene keine Option - sie ist Pflicht. Huwa reinigt Ihre Praxis nach hoechsten Standards und stellt sicher, dass Patienten und Personal jederzeit in einem sicheren Umfeld sind.",
    leistungen: [
      { title: "Hygienische Unterhaltsreinigung", desc: "Taegliche Desinfektion aller Kontaktflaechen, Tuergriffe, Wartebereich und Behandlungsraeume." },
      { title: "Sanitaerdesinfektion", desc: "Gruendliche Reinigung und Desinfektion aller Sanitaeanlagen nach RKI-Empfehlungen." },
      { title: "Bodenreinigung & Desinfektion", desc: "Wischdesinfektion mit geeigneten, zugelassenen Mitteln auf allen Boeden." },
      { title: "Abfallentsorgung", desc: "Fachgerechte Entsorgung und Reinigung von Abfallbehaeltern in allen Praxisraeumen." },
      { title: "Wartezimmer & Empfang", desc: "Taeglich frisch gereinigter Empfangsbereich fuer einen positiven ersten Eindruck." },
    ],
    vorteile: ["Reinigung vor Praxisoeffnung oder nach Feierabend", "Zugelassene Desinfektionsmittel", "Geschultes Personal fuer med. Umgebungen", "Diskret & zuverlaessig"],
    cta: "Jetzt Praxisreinigung anfragen - kostenlos & unverbindlich!",
  },
  {
    key: "halle",
    label: "Produktions- & Lagerhalle",
    labelRaw: "Produktions- & Lagerhalle",
    tagline: "Starke Reinigung fuer starke Betriebe",
    subline: "Maschinelle Hallenreinigung fuer Industrie & Logistik",
    intro: "Produktions- und Lagerhallen stellen besondere Anforderungen: grosse Flaechen, schwere Verschmutzungen und enge Zeitfenster. Huwa setzt modernste Reinigungsmaschinen ein und sorgt fuer sichere Arbeitsbedingungen.",
    leistungen: [
      { title: "Maschinelle Hallenreinigung", desc: "Scheuersaugmaschinen und Kehrmaschinen fuer schnelle Reinigung grosser Flaechen." },
      { title: "Hochdruckreinigung", desc: "Entfernung hartnackiger Oel-, Fett- und Schmutzrueckstaende von Boeden und Waenden." },
      { title: "Lager- & Regalbodenpflege", desc: "Reinigung von Lagerregalen, Rollcontainern und Lagerbereichen." },
      { title: "Industrieboden-Pflege", desc: "Schutz und Pflege von Epoxid-, Beton- und Industrieboeden." },
      { title: "Sonderreinigung nach Schicht", desc: "Intensive Reinigung am Wochenende - minimale Betriebsunterbrechung." },
    ],
    vorteile: ["Modernste Reinigungsmaschinen", "Auch fuer schwere Industrieverschmutzungen", "Nachts / am Wochenende moeglich", "Schnelle Reaktionszeiten"],
    cta: "Hallenpflege anfragen - kostenlose Besichtigung vor Ort!",
  },
  {
    key: "autohaus",
    label: "Autohaus & Kfz-Betrieb",
    labelRaw: "Autohaus & Kfz-Betrieb",
    tagline: "Glaenzende Sauberkeit fuer Ihren Betrieb",
    subline: "Werkstatt-, Hallen- und Showroomreinigung aus einer Hand",
    intro: "Ob Werkstatthalle, Ausstellungsraum oder Kundensanitaer - in Autohaeusern entstehen taeglich starke Verschmutzungen durch Oel, Reifen und Werkzeug. Huwa sorgt fuer Ordnung und Sauberkeit.",
    leistungen: [
      { title: "Werkstattreinigung", desc: "Entfernung von Oel-, Fett- und Reifenspuren auf Werkstattboeden - maschinell oder manuell." },
      { title: "Showroom & Ausstellung", desc: "Taegl. Pflege des Ausstellungsraums: Boeden, Glasfronten, Empfang und Kundenbereiche." },
      { title: "Hochdruck Aussenbereich", desc: "Reinigung von Einfahrten, Parkflaechen, Rampen und Aussenbereichen." },
      { title: "Sanitaer & Aufenthaltsraeume", desc: "Hygienische Reinigung aller Mitarbeiter- und Kundensanitaer sowie Pausenraeume." },
      { title: "Glasreinigung Schaufenster", desc: "Blitzsaubere Schaufenster und Glasfassaden fuer einen professionellen Auftritt." },
    ],
    vorteile: ["Erfahrung mit Industrie-Verschmutzungen", "Reinigung ausserhalb der Oeffnungszeiten", "Taeglich oder woechentlich", "Komplett-Service vom Profi"],
    cta: "Jetzt Betriebsreinigung anfragen - unverbindlich & kostenlos!",
  },
  {
    key: "kanzlei",
    label: "Kanzlei & Architekturburo",
    labelRaw: "Kanzlei & Architekturbüro",
    tagline: "Diskretion & Sauberkeit fuer anspruchsvolle Umgebungen",
    subline: "Reinigung fuer Kanzleien, Notariate und Planungsbueros",
    intro: "In Kanzleien und Architekturbueros ist ein gepflegtes Erscheinungsbild essenziell. Ihre Mandanten erwarten ein serioeses Umfeld. Huwa reinigt diskret, zuverlaessig und nach Ihren Wuenschen.",
    leistungen: [
      { title: "Diskrete Unterhaltsreinigung", desc: "Reinigung aller Bueroaraeume, Besprechungszimmer und Empfangsbereiche ausserhalb der Kanzleizeiten." },
      { title: "Aktenschrank & Regalpflege", desc: "Staubfreie Reinigung von Regalen und Arbeitsflaechen ohne Umsortierung." },
      { title: "Sanitaer & Kueche", desc: "Hygienische Reinigung aller Sanitaeanlagen und der Bueroekueche." },
      { title: "Glasreinigung", desc: "Reinigung von Trennwaenden, Glasfronten und Fenstern fuer ein hochwertiges Bild." },
      { title: "Empfangsbereich", desc: "Taeglich frischer Empfang - der erste Eindruck entscheidet." },
    ],
    vorteile: ["100% diskrete Durchfuehrung", "Reinigung vor/nach Kanzleioeffnung", "Fester Mitarbeiter - kein Wechsel", "Auf Wunsch auch samstags"],
    cta: "Kanzleipflege anfragen - kostenlos & unverbindlich!",
  },
  {
    key: "gastronomie",
    label: "Gastronomie & Lebensmittel",
    labelRaw: "Gastronomie & Lebensmittel",
    tagline: "Sauber, hygienisch, HACCP-konform",
    subline: "Gewerbliche Reinigung fuer Restaurants, Cafes und Betriebe",
    intro: "In der Gastronomie sind Hygiene und Sauberkeit gesetzlich vorgeschrieben. Huwa reinigt Ihre Kueche, Gastraum und Lager nach HACCP-Grundsaetzen - damit Sie sich auf Ihre Gaeste konzentrieren koennen.",
    leistungen: [
      { title: "Kuechemreinigung & Entfettung", desc: "Gruendliche Reinigung von Kuechemgeraten, Abzugshauben, Grills und Friteusen." },
      { title: "Gastraum & Theke", desc: "Taegl. Reinigung von Tischen, Stuehlen, Boeden, Tresen und Fensterflaechen." },
      { title: "Kuehlraum & Lager", desc: "Regelmaessige Reinigung und Desinfektion von Kuehlraeumen und Lagerbereichen." },
      { title: "Sanitaeanlagen", desc: "Hygienische Reinigung und Desinfektion aller Gaeste- und Personaltoiletten." },
      { title: "Sonderreinigung nach Events", desc: "Schnelle Grundreinigung nach Veranstaltungen und Grossveranstaltungen." },
    ],
    vorteile: ["HACCP-konforme Reinigungsverfahren", "Reinigung nach Betriebsschluss", "Lebensmittel-zugelassene Mittel", "Sonderreinigungen nach Events"],
    cta: "Jetzt Gastro-Reinigung anfragen - kostenlos & schnell!",
  },
  {
    key: "einzelhandel",
    label: "Einzelhandel & Supermarkt",
    labelRaw: "Einzelhandel & Supermarkt",
    tagline: "Einladende Sauberkeit fuer mehr Umsatz",
    subline: "Verkaufsflaechen- und Schaufensterreinigung",
    intro: "Sauberkeit im Einzelhandel steigert das Einkaufserlebnis und erhoht die Verweildauer der Kunden. Huwa haelt Ihre Verkaufsflaechen, Regale und Eingangsbereiche stets in bestem Zustand.",
    leistungen: [
      { title: "Verkaufsflaechenreinigung", desc: "Taegl. Reinigung aller Verkaufsflaechen, Regale und Auslagen - vor Ladeoeffnung." },
      { title: "Schaufensterreinigung", desc: "Blitzsaubere Schaufenster und Eingangstuer - der erste Eindruck zaehlt." },
      { title: "Kassenbereich & Kundenlaufzonen", desc: "Intensive Pflege stark frequentierter Bereiche fuer Hygiene und Sauberkeit." },
      { title: "Sanitaeanlagen", desc: "Regelmaessige Reinigung und Desinfektion der Kundensanitaeanlagen." },
      { title: "Lager & Backoffice", desc: "Ordentliche und saubere Lagerbereiche fuer effizientes Arbeiten." },
    ],
    vorteile: ["Reinigung vor Ladeoeffnung", "Schaufenster immer blitzsauber", "Erfahrung in Grossflaechen", "Flexible Wochentag-Planung"],
    cta: "Jetzt Reinigungsangebot anfordern - kostenlos!",
  },
  {
    key: "hotel",
    label: "Hotel & Pension",
    labelRaw: "Hotel & Pension",
    tagline: "Erstklassige Sauberkeit fuer erstklassige Gaeste",
    subline: "Zimmer-, Lobby- und Allgemeinflaechemreinigung",
    intro: "In der Hotellerie entscheidet Sauberkeit ueber Bewertungen und Wiederbuchungen. Huwa bietet professionelle Reinigung auf hoechstem Niveau - schnell, zuverlaessig und nach Ihrem Standard.",
    leistungen: [
      { title: "Zimmerreinigung", desc: "Professionelle Zimmerreinigung nach Ihrem Hausstandard - schnell und gruendlich." },
      { title: "Lobby & Empfangsbereich", desc: "Taegl. Pflege des Eingangsbereichs, der Lobby und der Gemeinschaftsflaechen." },
      { title: "Fruehstuecksraum & Restaurant", desc: "Reinigung nach dem Fruehstueck und vor der Abendbewirtung." },
      { title: "Sanitaer & Wellness", desc: "Hygienische Reinigung von Badern, Saunen und Wellnessbereichen." },
      { title: "Aussenanlage", desc: "Eingangsbereich, Parkflaechen und Terrassen stets sauber und einladend." },
    ],
    vorteile: ["Erfahrung im Hospitality-Bereich", "Schnelle Zimmerumruestung", "Diskretion gegenueber Gaesten", "Flexible Zeiten - auch an Wochenenden"],
    cta: "Hotelangebot anfordern - unverbindlich & kostenlos!",
  },
  {
    key: "schule",
    label: "Schule & Bildungseinrichtung",
    labelRaw: "Schule & Bildungseinrichtung",
    tagline: "Saubere Lernumgebung fuer beste Ergebnisse",
    subline: "Reinigung fuer Schulen, Kitas und Bildungseinrichtungen",
    intro: "Kinder und Jugendliche verbringen viel Zeit in Bildungseinrichtungen. Eine saubere, hygienische Umgebung ist entscheidend fuer Gesundheit und Wohlbefinden. Huwa sorgt fuer optimale Lernbedingungen.",
    leistungen: [
      { title: "Klassenzimmerreinigung", desc: "Taegl. Reinigung aller Unterrichtsraeume, Tafeln, Tische und Boeden." },
      { title: "Sanitaeanlagen", desc: "Besonders gruendliche Hygiene in Schueler- und Lehrersanitaeanlagen." },
      { title: "Flure & Treppenhaeuser", desc: "Saubere Laufwege und Gemeinschaftsflaechen fuer einen positiven Schulalltag." },
      { title: "Turnhalle & Sportanlagen", desc: "Regelmaessige Desinfektion und Reinigung von Sportboeden und Umkleiden." },
      { title: "Kita & Krippe", desc: "Kindgerechte, schadstofffreie Reinigung fuer die Kleinsten." },
    ],
    vorteile: ["Reinigung ausserhalb der Unterrichtszeiten", "Schadstofffreie Reinigungsmittel", "Erfahrung mit Bildungseinrichtungen", "Langjaehrige Partnerschaften"],
    cta: "Jetzt Schulreinigung anfragen - kostenlos!",
  },
  {
    key: "pflege",
    label: "Pflege & Seniorenheim",
    labelRaw: "Pflege & Seniorenheim",
    tagline: "Wuerdevoll sauber - fuer Ihre Bewohner",
    subline: "Reinigung fuer Pflegeeinrichtungen und Seniorenheime",
    intro: "Pflegeeinrichtungen stellen hoechste Ansprueche an Hygiene und Sauberkeit. Huwa reinigt mit Sensibilitaet und Fachkenntnis - fuer das Wohlbefinden Ihrer Bewohner und die Sicherheit Ihrer Mitarbeiter.",
    leistungen: [
      { title: "Bewohnerzimmerreinigung", desc: "Diskrete, regelmaessige Reinigung aller Zimmer - respektvoll und gruendlich." },
      { title: "Gemeinschafts- & Aufenthaltsraeume", desc: "Taegl. Pflege von Aufenthalt, Speisesaal und Flurbereichen." },
      { title: "Kueche & Speisesaal", desc: "Hygienische Reinigung nach HACCP-Standard in allen Kuechen- und Essbereichen." },
      { title: "Desinfektionsreinigung", desc: "Gezielte Desinfektion bei Infektionsrisiken und nach medizinischen Eingriffen." },
      { title: "Aussenanlage & Terrassen", desc: "Gepflegte Aussenanlagen als Wohlfulhoase fuer Bewohner und Besucher." },
    ],
    vorteile: ["Empathischer Umgang mit Bewohnern", "Zertifizierte Desinfektionsmittel", "Erfahrung in Pflegeeinrichtungen", "Diskret & verlaesslich"],
    cta: "Pflegeheim-Reinigung anfragen - unverbindlich!",
  },
];

// ── PDF Generator ─────────────────────────────────────────
function drawHuwaHeader(doc, W, branche) {
  // Dark top bar
  doc.setFillColor(...HUWA_DARK);
  doc.rect(0, 0, W, 14, "F");

  // HUWA Logo Text
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("HUWA", 8, 9.5);

  // Separator dot
  doc.setFillColor(...HUWA_ACCENT);
  doc.circle(30, 7, 1, "F");

  // Subtext
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(180, 200, 230);
  doc.text("Gebaeudereinigung & Hausmeisterdienste", 34, 9.5);

  // Contact right
  doc.setFontSize(6);
  doc.setTextColor(160, 185, 220);
  doc.text("02601/9131820  |  www.huwa-gebaeudedienste.de", W - 8, 9.5, { align: "right" });

  // Blue hero banner
  doc.setFillColor(...HUWA_BLUE);
  doc.rect(0, 14, W, 42, "F");

  // Gold accent line
  doc.setFillColor(...HUWA_ACCENT);
  doc.rect(0, 14, 4, 42, "F");

  // Branch label pill
  doc.setFillColor(255, 255, 255, 0.15);
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.3);
  doc.roundedRect(W - 58, 18, 52, 8, 2, 2, "FD");
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text(tx(branche.labelRaw), W - 32, 23.5, { align: "center" });

  // Headline
  doc.setFontSize(17);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  const hl = doc.splitTextToSize(tx(branche.tagline), W - 25);
  doc.text(hl, 10, 30);

  // Subline
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(190, 215, 255);
  doc.text(tx(branche.subline), 10, 30 + hl.length * 7 + 2);
}

function drawHuwaFooter(doc, W, H, cta) {
  doc.setFillColor(...HUWA_DARK);
  doc.rect(0, H - 30, W, 30, "F");

  doc.setFillColor(...HUWA_ACCENT);
  doc.rect(0, H - 30, W, 1.5, "F");

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text(tx(cta), W / 2, H - 19, { align: "center" });

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(160, 185, 220);
  doc.text("Tel: 02601 / 9131820   |   info@huwa-gebaeudedienste.de   |   www.huwa-gebaeudedienste.de", W / 2, H - 11, { align: "center" });
  doc.text("Mittelweg 24  -  56566 Neuwied", W / 2, H - 5, { align: "center" });
}

function generatePDF(branche) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210;
  const H = 297;

  drawHuwaHeader(doc, W, branche);

  let y = 64;

  // ── Intro ──
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(50, 60, 80);
  const introLines = doc.splitTextToSize(tx(branche.intro), W - 20);
  doc.text(introLines, 10, y);
  y += introLines.length * 4.8 + 8;

  // ── Leistungen Section ──
  doc.setFillColor(...HUWA_BLUE);
  doc.rect(0, y - 1, W, 9, "F");
  doc.setFillColor(...HUWA_ACCENT);
  doc.rect(0, y - 1, 4, 9, "F");
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("Unsere Leistungen fuer Sie", 10, y + 5);
  y += 13;

  branche.leistungen.forEach((l, i) => {
    // Number badge
    doc.setFillColor(...HUWA_BLUE);
    doc.circle(14, y + 1.5, 3.2, "F");
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text(String(i + 1), 14, y + 3, { align: "center" });

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...HUWA_BLUE);
    doc.text(tx(l.title), 20, y + 2);

    doc.setFontSize(7.8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 70, 90);
    const descLines = doc.splitTextToSize(tx(l.desc), W - 28);
    doc.text(descLines, 20, y + 7);
    y += 7 + descLines.length * 4.2 + 3;
  });

  y += 4;

  // ── Vorteile ──
  doc.setFillColor(...HUWA_BLUE);
  doc.rect(0, y - 1, W, 9, "F");
  doc.setFillColor(...HUWA_ACCENT);
  doc.rect(0, y - 1, 4, 9, "F");
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("Ihre Vorteile auf einen Blick", 10, y + 5);
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
    doc.text(tx(v), bx + 5.5, by + 4.5);
  });

  y += Math.ceil(branche.vorteile.length / 2) * 10 + 8;

  // ── About Box ──
  doc.setFillColor(...HUWA_LIGHT);
  doc.setDrawColor(...HUWA_BLUE);
  doc.setLineWidth(0.4);
  doc.roundedRect(10, y, W - 20, 22, 2, 2, "FD");
  doc.setFillColor(...HUWA_ACCENT);
  doc.roundedRect(10, y, 3, 22, 1, 1, "F");

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...HUWA_BLUE);
  doc.text("Ueber Huwa Gebaeudereinigung & Hausmeisterdienste", 17, y + 7);
  doc.setFontSize(7.8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(50, 60, 80);
  const about = doc.splitTextToSize(
    "Ihr regionaler Partner aus Neuwied. Seit Jahren zuverlaessig, fair und professionell - fuer kleine Bueros und grosse Industriebetriebe gleichermassen. Sprechen Sie uns an - wir erstellen Ihnen gerne ein kostenloses Angebot!",
    W - 28
  );
  doc.text(about, 17, y + 13);

  drawHuwaFooter(doc, W, H, branche.cta);

  const filename = "Huwa_Flyer_" + branche.key + ".pdf";
  doc.save(filename);
}

// ── Component ─────────────────────────────────────────────
export default function BranchenFlyerGenerator() {
  const [loadingKey, setLoadingKey] = useState(null);

  const handleGenerate = (branche) => {
    setLoadingKey(branche.key);
    setTimeout(() => {
      try {
        generatePDF(branche);
        toast.success("Flyer fuer " + branche.labelRaw + " erstellt!");
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
                {branche.labelRaw}
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