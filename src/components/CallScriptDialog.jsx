import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PhoneCall, Loader2, RefreshCw, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";

export default function CallScriptDialog({ company }) {
  const [open, setOpen] = useState(false);
  const [script, setScript] = useState("");
  const [loading, setLoading] = useState(false);
  const [contactLogs, setContactLogs] = useState([]);

  const generateScript = async () => {
    setLoading(true);
    setScript("");
    const logs = await base44.entities.ContactLog.filter({ company_id: company.id });
    const recentLogs = logs
      .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
      .slice(0, 3);
    setContactLogs(recentLogs);
    const logContext = recentLogs.length > 0
      ? recentLogs.map(l => `- ${l.typ} (${new Date(l.created_date).toLocaleDateString('de-DE')}): ${l.ergebnis}${l.notiz ? ' – ' + l.notiz : ''}`).join('\n')
      : 'Kein bisheriger Kontakt';
    const result = await base44.integrations.Core.InvokeLLM({
      model: "claude_sonnet_4_6",
      prompt: `Du bist ein erfahrener Vertriebsprofi für Huwa Gebäudereinigung & Hausmeisterdienste – ein professionelles Reinigungsunternehmen aus Neuwied (Mittelweg 24, 56566 Neuwied, Tel: 02601/9131820, www.huwa-gebaeudedienste.de).

Huwa bietet folgende Leistungen an:
- Unterhaltsreinigung (regelmäßige Reinigung von Büros, Praxen, Gewerberäumen)
- Büroreinigung (tägliche/wöchentliche Reinigung inkl. Sanitär, Küchen, Böden)
- Hallenreinigung (große Produktions- und Lagerhallen, maschinell oder manuell)
- Maschinelle Reinigung (Scheuersaugmaschinen, Hochdruckreinigung, Kehrmaschinen)
- Sonderreinigungen (Grundreinigung, Fensterreinigung, Bauendreinigung)
- Wir machen ALLES – von kleinen Büros bis zu großen Industriehallen

Erstelle einen kurzen, natürlichen Gesprächsleitfaden für einen Kaltakquise-Anruf bei folgender Firma:

Firma: ${company.name}
Branche: ${company.branche || "Unbekannt"}
Ort: ${company.ort || ""}
Status: ${company.status}
Aktueller Dienstleister: ${company.aktueller_dienstleister || "Unbekannt"}
Ansprechpartner: ${company.ansprechpartner || "Unbekannt"}
Notizen: ${company.notizen || "Keine"}
Bisherige Kontakte:
${logContext}

Wichtig: Passe den Leitfaden an die Branche an! Wenn es bereits Kontakte gab, passe den Einstieg entsprechend an (z.B. bei "Nicht erreicht" mehrfach: andere Ansprache wählen, bei "Rückruf vereinbart": darauf Bezug nehmen).
- IT/Büro → Büroreinigung, Sanitärreinigung, tägliche Unterhaltsreinigung
- Produktion/Lager/Halle → maschinelle Hallenreinigung, Hochdruck, Industriereinigung
- Arzt/Zahnarzt → hygienische Unterhaltsreinigung, Desinfektion, Sanitär
- Autohaus/Werkstatt → Hallenreinigung, Werkstattreinigung, Hochdruck
- Allgemein → Unterhaltsreinigung, flexible Zeiten, faire Preise

Strukturiere den Leitfaden mit:
1. **Einstieg** (Begrüßung & Vorstellung als Huwa Gebäudedienste, 2 Sätze)
2. **Aufhänger** (warum rufst du genau diese Firma an – branchenbezogen, 1-2 Sätze)
3. **Unser Angebot** (welche Huwa-Leistungen passen konkret zu dieser Firma, 2-3 Punkte)
4. **Einwand-Antworten** (2 typische Einwände z.B. "Haben schon jemanden" oder "Zu teuer" mit kurzer Huwa-Antwort)
5. **Abschluss** (Terminvereinbarung für ein kostenloses Angebot vor Ort, 1-2 Sätze)

Halte es praxisnah, locker und überzeugend. Auf Deutsch.`,
    });
    setScript(typeof result === "string" ? result : result?.text || JSON.stringify(result));
    setLoading(false);
  };

  const handleOpen = () => {
    setOpen(true);
    if (!script) generateScript();
  };

  return (
    <>
      <Button variant="outline" size="sm" className="text-xs gap-1.5 text-purple-700 border-purple-200 hover:bg-purple-50" onClick={handleOpen}>
        <Sparkles className="w-3 h-3" /> KI-Gesprächsleitfaden
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <PhoneCall className="w-4 h-4 text-purple-600" />
              Gesprächsleitfaden — {company.name}
            </DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
              <p className="text-sm">KI erstellt deinen Gesprächsleitfaden...</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="prose prose-sm max-w-none text-sm leading-relaxed">
                <ReactMarkdown>{script}</ReactMarkdown>
              </div>
              <div className="flex justify-end pt-2 border-t border-border">
                <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={generateScript}>
                  <RefreshCw className="w-3 h-3" /> Neu generieren
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}