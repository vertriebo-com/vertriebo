import { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Save, Loader2, Trash2, Eye, Code2, Send, RotateCcw } from "lucide-react";

// Verfügbare Platzhalter
const PLACEHOLDERS = [
  { label: "{{firmenname}}", desc: "Name des Prospects" },
  { label: "{{ansprechpartner}}", desc: "Ansprechpartner beim Prospect" },
  { label: "{{meine_firma}}", desc: "Ihr Firmenname" },
  { label: "{{dienstleistungen}}", desc: "Ihre Dienstleistungen" },
  { label: "{{region}}", desc: "Ihre Region/Ort" },
  { label: "{{signatur}}", desc: "Ihre E-Mail-Signatur" },
];

const TYP_OPTIONS = ["Erstansprache", "Nachfassen", "Termin", "Rückruf", "Sonstiges"];

function TemplatePreview({ betreff, body }) {
  const iframeRef = useRef(null);
  const htmlContent = body
    .replace(/\n/g, "<br/>")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

  const fullHtml = `<html><body style="margin:0;padding:16px;font-family:'Segoe UI',Arial,sans-serif;background:#fff;font-size:14px;line-height:1.6;color:#1a1a1a;">
    <div style="border-bottom:1px solid #e5e7eb;padding-bottom:10px;margin-bottom:14px;">
      <strong style="font-size:12px;color:#6b7280;">Betreff:</strong>
      <span style="font-size:13px;font-weight:600;margin-left:8px;">${betreff || "(kein Betreff)"}</span>
    </div>
    ${htmlContent}
  </body></html>`;

  return (
    <iframe
      ref={iframeRef}
      srcDoc={fullHtml}
      className="w-full border-0 rounded-b-lg"
      style={{ height: "280px" }}
      title="E-Mail Vorschau"
      sandbox="allow-same-origin"
    />
  );
}

export default function EmailTemplateEditor({ tpl, idx, onSave, onDelete, onCancel, orgId, sendingTest, onSendTest }) {
  const [name, setName] = useState(tpl.name || "");
  const [betreff, setBetreff] = useState(tpl.betreff || "");
  const [body, setBody] = useState(tpl.body || "");
  const [typ, setTyp] = useState(tpl.typ || "Sonstiges");
  const [mode, setMode] = useState("text"); // "text" | "html" | "preview"
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef(null);

  // Platzhalter in den Cursor einfügen
  const insertPlaceholder = (placeholder) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setBody(prev => prev + " " + placeholder);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newVal = body.substring(0, start) + placeholder + body.substring(end);
    setBody(newVal);
    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd = start + placeholder.length;
      textarea.focus();
    }, 0);
  };

  const handleSave = async () => {
    if (!name.trim() || !betreff.trim()) {
      toast.error("Name und Betreff sind Pflichtfelder.");
      return;
    }
    setSaving(true);
    await onSave({ ...tpl, name, betreff, body, typ });
    setSaving(false);
  };

  const handleReset = () => {
    setBody(tpl.body || "");
    setBetreff(tpl.betreff || "");
    toast.info("Vorlage zurückgesetzt.");
  };

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
      {/* Header */}
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <Input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Vorlagenname"
            className="w-44 h-7 text-sm font-medium"
          />
          <select
            value={typ}
            onChange={e => setTyp(e.target.value)}
            className="h-7 text-xs rounded-md border border-slate-200 bg-white px-2 text-slate-700 font-medium"
          >
            {TYP_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          {tpl._isNew && <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold shrink-0">Neu</span>}
        </div>
        <button onClick={() => onDelete(tpl)} className="text-slate-400 hover:text-destructive transition-colors shrink-0">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Betreff */}
      <div className="px-4 pt-3 pb-2">
        <Label className="text-xs font-bold mb-1.5 block text-slate-800">Betreff *</Label>
        <Input
          value={betreff}
          onChange={e => setBetreff(e.target.value)}
          placeholder="z.B. Professionelle Reinigung für {{firmenname}}"
          className="text-sm"
        />
      </div>

      {/* Platzhalter-Chips */}
      <div className="px-4 pb-2">
        <p className="text-[11px] text-slate-500 font-medium mb-1.5">Platzhalter einfügen (Klicken zum Einfügen an Cursorposition):</p>
        <div className="flex flex-wrap gap-1.5">
          {PLACEHOLDERS.map(p => (
            <button
              key={p.label}
              onClick={() => insertPlaceholder(p.label)}
              title={p.desc}
              className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Mode-Switcher */}
      <div className="px-4 pb-2">
        <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden text-xs">
          {[
            { id: "text", icon: <span className="font-bold">Aa</span>, label: "Text" },
            { id: "preview", icon: <Eye className="w-3 h-3" />, label: "Vorschau" },
            { id: "html", icon: <Code2 className="w-3 h-3" />, label: "HTML" },
          ].map(m => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`flex items-center gap-1 px-3 py-1.5 transition-colors ${mode === m.id ? "bg-primary text-white font-semibold" : "bg-white text-slate-500 hover:text-slate-900"}`}
            >
              {m.icon} {m.label}
            </button>
          ))}
        </div>
        {mode === "html" && (
          <span className="ml-2 text-[11px] text-amber-600 font-medium">Expertenmodus – Direkt-HTML</span>
        )}
      </div>

      {/* Editor / Vorschau */}
      <div className="mx-4 mb-3 border border-slate-200 rounded-lg overflow-hidden">
        {mode === "preview" ? (
          <TemplatePreview betreff={betreff} body={body} />
        ) : (
          <textarea
            ref={textareaRef}
            value={body}
            onChange={e => setBody(e.target.value)}
            rows={10}
            className={`w-full p-3 text-sm text-slate-900 border-0 outline-none resize-none ${mode === "html" ? "font-mono text-xs text-green-800 bg-slate-950 text-green-300" : "bg-white"}`}
            placeholder={mode === "html"
              ? "<p>HTML-Inhalt hier...</p>"
              : "E-Mail-Text hier eingeben.\n\nVerwenden Sie Platzhalter wie {{firmenname}} um Inhalte zu personalisieren.\n\nBeispiel:\nSehr geehrte Damen und Herren,\n\nals führendes Unternehmen im Bereich {{dienstleistungen}} möchten wir Ihnen gerne unsere Leistungen vorstellen..."}
          />
        )}
      </div>

      {/* Aktionsleiste */}
      <div className="px-4 pb-4 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          {!tpl._isNew && (
            <Button variant="ghost" size="sm" onClick={handleReset} className="gap-1.5 text-slate-500 hover:text-slate-900">
              <RotateCcw className="w-3 h-3" /> Zurücksetzen
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSendTest({ ...tpl, name, betreff, body, typ })}
            disabled={sendingTest || !betreff.trim()}
            className="gap-1.5"
          >
            {sendingTest ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
            Test-Mail senden
          </Button>
        </div>
        <div className="flex gap-2">
          {tpl._isNew && (
            <Button variant="outline" size="sm" onClick={() => onDelete(tpl)}>Abbrechen</Button>
          )}
          <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Speichern
          </Button>
        </div>
      </div>
    </div>
  );
}