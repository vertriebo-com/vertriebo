import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { jsPDF } from "jspdf";

export default function HuwaBroschuereGenerator() {
  const [loading, setLoading] = useState(false);

  const generatePDF = () => {
    setLoading(true);
    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const W = 210;
      const H = 297;

      // ── Header Banner ──
      doc.setFillColor(15, 76, 179); // primary blue
      doc.rect(0, 0, W, 45, "F");

      // Company Name
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text("HUWA", 15, 20);
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.text("Gebäudereinigung & Hausmeisterdienste", 15, 29);

      // Tagline
      doc.setFontSize(9);
      doc.setTextColor(180, 210, 255);
      doc.text("Ihr professioneller Partner für Sauberkeit & Service", 15, 38);

      // Contact top-right
      doc.setFontSize(8);
      doc.setTextColor(220, 235, 255);
      doc.text("02601 / 9131820", W - 15, 20, { align: "right" });
      doc.text("info@huwa-gebaeudedienste.de", W - 15, 27, { align: "right" });
      doc.text("www.huwa-gebaeudedienste.de", W - 15, 34, { align: "right" });

      // ── Intro Text ──
      let y = 58;
      doc.setTextColor(30, 40, 60);
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.text("Warum Huwa?", 15, y);
      y += 8;
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(70, 80, 100);
      const intro = doc.splitTextToSize(
        "Seit Jahren steht Huwa Gebäudereinigung & Hausmeisterdienste für zuverlässige, professionelle und faire Reinigungsdienstleistungen im Raum Neuwied und Umgebung. Wir reinigen alles – vom kleinen Büro bis zur großen Produktionshalle.",
        W - 30
      );
      doc.text(intro, 15, y);
      y += intro.length * 5 + 8;

      // ── Leistungen ──
      doc.setFillColor(240, 245, 255);
      doc.roundedRect(12, y - 4, W - 24, 98, 3, 3, "F");

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 76, 179);
      doc.text("Unsere Leistungen", 18, y + 5);
      y += 14;

      const leistungen = [
        { icon: "●", title: "Unterhaltsreinigung", desc: "Regelmäßige Reinigung von Büros, Praxen und Gewerberäumen – täglich, wöchentlich oder nach Bedarf." },
        { icon: "●", title: "Büro- & Praxisreinigung", desc: "Zuverlässige Reinigung aller Geschäftsräume inkl. Sanitäranlagen, Küchen und Böden." },
        { icon: "●", title: "Hallenreinigung", desc: "Professionelle Reinigung großer Produktions- und Lagerhallen – maschinell oder manuell." },
        { icon: "●", title: "Maschinelle Reinigung", desc: "Hochleistungsgeräte: Scheuersaugmaschinen, Hochdruckreiniger, Kehrmaschinen." },
        { icon: "●", title: "Grundreinigung & Sonderreinigung", desc: "Tiefenreinigung, Bauendreinigung, Fensterreinigung – einmalig oder als Jahresservice." },
      ];

      leistungen.forEach(l => {
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(15, 76, 179);
        doc.text(`${l.icon}  ${l.title}`, 20, y);
        y += 5;
        doc.setFont("helvetica", "normal");
        doc.setTextColor(70, 80, 100);
        const lines = doc.splitTextToSize(l.desc, W - 45);
        doc.text(lines, 28, y);
        y += lines.length * 4.5 + 3;
      });

      y += 8;

      // ── Vorteile Boxes ──
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 40, 60);
      doc.text("Ihre Vorteile auf einen Blick", 15, y);
      y += 8;

      const vorteile = [
        { emoji: "✓", text: "Faire & transparente Preise" },
        { emoji: "✓", text: "Flexible Arbeitszeiten" },
        { emoji: "✓", text: "Geschultes & zuverlässiges Personal" },
        { emoji: "✓", text: "Kostenloser Vor-Ort-Termin" },
        { emoji: "✓", text: "Individuelle Reinigungspläne" },
        { emoji: "✓", text: "Kurzfristig verfügbar" },
      ];

      const colW = (W - 30) / 2;
      vorteile.forEach((v, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const bx = 15 + col * (colW + 6);
        const by = y + row * 12;
        doc.setFillColor(230, 240, 255);
        doc.roundedRect(bx, by - 4, colW, 10, 2, 2, "F");
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(15, 76, 179);
        doc.text(v.emoji, bx + 3, by + 2);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(30, 40, 60);
        doc.text(v.text, bx + 9, by + 2);
      });

      y += Math.ceil(vorteile.length / 2) * 12 + 12;

      // ── Branchen ──
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 40, 60);
      doc.text("Wir reinigen für jede Branche", 15, y);
      y += 7;
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(70, 80, 100);
      const branchen = "Büros & Verwaltung  ·  Arzt- & Zahnarztpraxen  ·  Autohäuser & Werkstätten  ·  Produktions- & Lagerhallen  ·  Kanzleien & Architekturbüros  ·  Einzelhandel & Gastronomie";
      const branchenLines = doc.splitTextToSize(branchen, W - 30);
      doc.text(branchenLines, 15, y);
      y += branchenLines.length * 5 + 10;

      // ── CTA Banner ──
      doc.setFillColor(15, 76, 179);
      doc.rect(0, H - 40, W, 40, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.text("Jetzt kostenloses Angebot anfordern!", W / 2, H - 26, { align: "center" });
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(180, 210, 255);
      doc.text("📞 02601 / 9131820   ✉ info@huwa-gebaeudedienste.de   🌐 www.huwa-gebaeudedienste.de", W / 2, H - 16, { align: "center" });
      doc.setFontSize(8);
      doc.text("Mittelweg 24 · 56566 Neuwied", W / 2, H - 9, { align: "center" });

      doc.save("Huwa_Unternehmensbroschüre.pdf");
      toast.success("Broschüre erfolgreich erstellt!");
    } catch (e) {
      toast.error("Fehler beim Erstellen der Broschüre.");
      console.error(e);
    }
    setLoading(false);
  };

  return (
    <Button onClick={generatePDF} disabled={loading} className="gap-2">
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
      {loading ? "Erstelle PDF..." : "Broschüre generieren & herunterladen"}
    </Button>
  );
}