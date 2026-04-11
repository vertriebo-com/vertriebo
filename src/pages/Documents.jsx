import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { FileText, Upload, Trash2, Download, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const KATEGORIEN = ["Preisliste", "Präsentation", "Vertrag", "Angebot", "Sonstiges"];

const KATEGORIE_COLORS = {
  "Preisliste": "bg-blue-50 text-blue-700 border-blue-200",
  "Präsentation": "bg-purple-50 text-purple-700 border-purple-200",
  "Vertrag": "bg-red-50 text-red-700 border-red-200",
  "Angebot": "bg-orange-50 text-orange-700 border-orange-200",
  "Sonstiges": "bg-slate-50 text-slate-600 border-slate-200",
};

export default function Documents() {
  const [documents, setDocuments] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [titel, setTitel] = useState("");
  const [beschreibung, setBeschreibung] = useState("");
  const [kategorie, setKategorie] = useState("Sonstiges");
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [me, docs] = await Promise.all([
      base44.auth.me(),
      base44.entities.Document.list("-created_date", 100),
    ]);
    setUser(me);
    setDocuments(docs);
    setLoading(false);
  };

  const isAdmin = user?.role === "admin";

  const handleUpload = async () => {
    if (!titel.trim()) { toast.error("Bitte einen Titel eingeben."); return; }
    if (!selectedFile) { toast.error("Bitte eine PDF-Datei auswählen."); return; }

    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file: selectedFile });
    await base44.entities.Document.create({
      titel: titel.trim(),
      beschreibung: beschreibung.trim(),
      kategorie,
      file_url,
      dateiname: selectedFile.name,
    });
    toast.success("Dokument erfolgreich hochgeladen!");
    setTitel(""); setBeschreibung(""); setKategorie("Sonstiges"); setSelectedFile(null);
    loadData();
    setUploading(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Dokument wirklich löschen?")) return;
    await base44.entities.Document.delete(id);
    setDocuments(prev => prev.filter(d => d.id !== id));
    toast.success("Dokument gelöscht.");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold">Dokumente</h1>
        <p className="text-sm text-muted-foreground">Wichtige Unterlagen für das Vertriebsteam</p>
      </div>

      {/* Upload (nur Admin) */}
      {isAdmin && (
        <div className="bg-card border border-border rounded-xl">
          <div className="px-5 py-4 border-b border-border flex items-center gap-2">
            <Upload className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">Dokument hochladen</h3>
          </div>
          <div className="px-5 py-4 space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <Input
                placeholder="Titel des Dokuments"
                value={titel}
                onChange={e => setTitel(e.target.value)}
              />
              <Select value={kategorie} onValueChange={setKategorie}>
                <SelectTrigger>
                  <SelectValue placeholder="Kategorie" />
                </SelectTrigger>
                <SelectContent>
                  {KATEGORIEN.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Input
              placeholder="Kurze Beschreibung (optional)"
              value={beschreibung}
              onChange={e => setBeschreibung(e.target.value)}
            />
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <label className="flex-1">
                <div className={`border-2 border-dashed rounded-lg px-4 py-3 text-center cursor-pointer transition-colors ${selectedFile ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}>
                  {selectedFile ? (
                    <p className="text-sm font-medium text-primary truncate">{selectedFile.name}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">PDF-Datei auswählen</p>
                  )}
                  <input
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={e => setSelectedFile(e.target.files[0] || null)}
                  />
                </div>
              </label>
              <Button onClick={handleUpload} disabled={uploading} className="gap-2 whitespace-nowrap">
                <Upload className="w-4 h-4" />
                {uploading ? "Lädt hoch..." : "Hochladen"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Dokumentenliste */}
      <div className="bg-card border border-border rounded-xl">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <FolderOpen className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">Alle Dokumente ({documents.length})</h3>
        </div>
        <div className="divide-y divide-border">
          {documents.map(doc => (
            <div key={doc.id} className="px-5 py-4 flex items-center gap-3">
              <div className="w-9 h-9 bg-red-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <FileText className="w-4 h-4 text-red-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{doc.titel}</p>
                {doc.beschreibung && (
                  <p className="text-xs text-muted-foreground truncate">{doc.beschreibung}</p>
                )}
                <p className="text-[11px] text-muted-foreground/60 mt-0.5">{doc.dateiname}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${KATEGORIE_COLORS[doc.kategorie] || KATEGORIE_COLORS["Sonstiges"]}`}>
                  {doc.kategorie}
                </span>
                <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                  <Button variant="ghost" size="icon" className="h-8 w-8" title="Herunterladen">
                    <Download className="w-4 h-4" />
                  </Button>
                </a>
                {isAdmin && (
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(doc.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
          {documents.length === 0 && (
            <div className="px-5 py-12 text-center text-sm text-muted-foreground">
              <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
              Noch keine Dokumente hochgeladen.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}