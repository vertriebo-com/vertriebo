import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { jsPDF } from "jspdf";

function tx(str) {
  if (!str) return "";
  return String(str)
    .replace(/ä/g, "ae").replace(/Ä/g, "Ae")
    .replace(/ö/g, "oe").replace(/Ö/g, "Oe")
    .replace(/ü/g, "ue").replace(/Ü/g, "Ue")
    .replace(/ß/g, "ss")
    .replace(/–/g, "-").replace(/—/g, "-");
}

const HUWA_BLUE  = [15,  76, 179];
const HUWA_DARK  = [10,  30,  70];
const HUWA_LIGHT = [235, 242, 255];
const HUWA_GOLD  = [255, 185,   0];

export default function HuwaBroschuereGenerator() {
  const [loading, setLoading] = useState(false);

  const generatePDF = () => {
    setLoading(true);
    setTimeout(() => {
      try {
        const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
        const W = 210;
        const H = 297;

        // ── Top dark bar ──
        doc.setFillColor(...HUWA_DARK);
        doc.rect(0, 0, W, 14, "F");

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text("HUWA", 8, 9.5);

        doc.setFillColor(...HUWA_GOLD);
        doc.circle(30, 7, 1, "F");

        doc.setFontSize(6.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(180, 200, 230);
        doc.text("Gebaeudereinigung & Hausmeisterdienste", 34, 9.5);

        doc.setFontSize(6);
        doc.setTextColor(160, 185, 220);
        doc.text("02601/9131820  |  www.huwa-gebaeudedienste.de", W - 8, 9.5, { align: "right" });

        // ── Blue hero ──
        doc.setFillColor(...HUWA_BLUE);
        doc.rect(0, 14, W, 48, "F");

        doc.setFillColor(...HUWA_GOLD);
        doc.rect(0, 14, 4, 48, "F");

        doc.setFontSize(20);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(255, 255, 255);
        doc.text("Professionelle Gebaeudereinigung", 10, 32);
        doc.text("aus Neuwied", 10, 42);

        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(190, 215, 255);
        doc.text("Ihr zuverlaessiger Partner fuer Sauberkeit & Service seit Jahren", 10, 52);

        doc.setFontSize(7.5);
        doc.setTextColor(200, 220, 255);
        doc.text("Mittelweg 24  -  56566 Neuwied", W - 10, 46, { align: "right" });
        doc.text("info@huwa-gebaeudedienste.de", W - 10, 52, { align: "right" });

        // ── Intro ──
        let y = 72;
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...HUWA_DARK);
        doc.text("Warum Huwa?", 10, y);

        doc.setFillColor(...HUWA_GOLD);
        doc.rect(10, y + 2, 30, 1, "F");
        y += 10;

        doc.setFontSize(8.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(50, 60, 80);
        const intro = doc.splitTextToSize(
          "Seit Jahren steht Huwa Gebaeudereinigung & Hausmeisterdienste fuer zuverlaessige, professionelle und faire Reinigungsdienstleistungen im Raum Neuwied und Umgebung. Wir reinigen alles - vom kleinen Buero bis zur grossen Produktionshalle. Unser erfahrenes Team steht Ihnen mit modernsten Geraten und umweltfreundlichen Reinigungsmitteln zur Seite.",
          W - 20
        );
        doc.text(intro, 10, y);
        y += intro.length * 4.8 + 10;

        // ── Leistungen ──
        doc.setFillColor(...HUWA_BLUE);
        doc.rect(0, y - 1, W, 9, "F");
        doc.setFillColor(...HUWA_GOLD);
        doc.rect(0, y - 1, 4, 9, "F");
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(255, 255, 255);
        doc.text("Unsere Leistungen", 10, y + 5);
        y += 13;

        const leistungen = [
          { n: 1, title: "Unterhaltsreinigung", desc: "Regelmaessige Reinigung von Bueros, Praxen und Gewerberaeumen - taeglich, woechentlich oder nach Bedarf." },
          { n: 2, title: "Bueroreinigung", desc: "Zuverlaessige Reinigung aller Geschaeftsraeume inkl. Sanitaer, Kuechen und Boeden." },
          { n: 3, title: "Hallenreinigung", desc: "Professionelle Reinigung grosser Produktions- und Lagerhallen - maschinell oder manuell." },
          { n: 4, title: "Maschinelle Reinigung", desc: "Scheuersaugmaschinen, Hochdruckreiniger und Kehrmaschinen fuer maximale Effizienz." },
          { n: 5, title: "Grundreinigung & Sonderreinigung", desc: "Tiefenreinigung, Bauendreinigung, Fensterreinigung - einmalig oder als Jahresservice." },
          { n: 6, title: "Aussenanlagen", desc: "Reinigung von Einfahrten, Parkflaechen, Gehwegen und Fassaden." },
        ];

        leistungen.forEach(l => {
          doc.setFillColor(...HUWA_BLUE);
          doc.circle(14, y + 1.5, 3.2, "F");
          doc.setFontSize(7);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(255, 255, 255);
          doc.text(String(l.n), 14, y + 3, { align: "center" });

          doc.setFontSize(8.5);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(...HUWA_BLUE);
          doc.text(l.title, 20, y + 2);

          doc.setFontSize(7.8);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(60, 70, 90);
          const lines = doc.splitTextToSize(l.desc, W - 28);
          doc.text(lines, 20, y + 7);
          y += 7 + lines.length * 4.2 + 3;
        });

        y += 4;

        // ── Vorteile ──
        doc.setFillColor(...HUWA_BLUE);
        doc.rect(0, y - 1, W, 9, "F");
        doc.setFillColor(...HUWA_GOLD);
        doc.rect(0, y - 1, 4, 9, "F");
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(255, 255, 255);
        doc.text("Ihre Vorteile", 10, y + 5);
        y += 13;

        const vorteile = [
          "Faire & transparente Preise",
          "Flexible Arbeitszeiten",
          "Geschultes Personal",
          "Kostenloser Vor-Ort-Termin",
          "Individuelle Reinigungsplaene",
          "Kurzfristig verfuegbar",
        ];

        const colW = (W - 22) / 2;
        vorteile.forEach((v, i) => {
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
          doc.text(v, bx + 5.5, by + 4.5);
        });

        y += Math.ceil(vorteile.length / 2) * 10 + 8;

        // ── Branchen Box ──
        doc.setFillColor(...HUWA_LIGHT);
        doc.setDrawColor(...HUWA_BLUE);
        doc.setLineWidth(0.4);
        doc.roundedRect(10, y, W - 20, 20, 2, 2, "FD");
        doc.setFillColor(...HUWA_GOLD);
        doc.roundedRect(10, y, 3, 20, 1, 1, "F");
        doc.setFontSize(8.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...HUWA_BLUE);
        doc.text("Wir reinigen fuer jede Branche", 17, y + 7);
        doc.setFontSize(7.8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(50, 60, 80);
        doc.text(
          "Bueros  |  Arztpraxen  |  Autohaeuser  |  Produktionshallen  |  Kanzleien  |  Hotels  |  Schulen  |  Gastro",
          17, y + 14
        );

        // ── Footer ──
        doc.setFillColor(...HUWA_DARK);
        doc.rect(0, H - 30, W, 30, "F");
        doc.setFillColor(...HUWA_GOLD);
        doc.rect(0, H - 30, W, 1.5, "F");

        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(255, 255, 255);
        doc.text("Jetzt kostenloses Angebot anfordern!", W / 2, H - 19, { align: "center" });
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(160, 185, 220);
        doc.text("Tel: 02601 / 9131820   |   info@huwa-gebaeudedienste.de   |   www.huwa-gebaeudedienste.de", W / 2, H - 11, { align: "center" });
        doc.setFontSize(7);
        doc.text("Mittelweg 24  -  56566 Neuwied", W / 2, H - 5, { align: "center" });

        doc.save("Huwa_Unternehmensbroschüre.pdf");
        toast.success("Broschuere erfolgreich erstellt!");
      } catch (e) {
        toast.error("Fehler beim Erstellen.");
        console.error(e);
      }
      setLoading(false);
    }, 80);
  };

  return (
    <Button onClick={generatePDF} disabled={loading} className="gap-2">
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
      {loading ? "Erstelle PDF..." : "Unternehmensbroschüre"}
    </Button>
  );
}