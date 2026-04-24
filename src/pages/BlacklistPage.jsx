import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Ban, Plus, Trash2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function BlacklistPage() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ firmenname: "", grund: "", telefon: "", email: "" });
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    base44.auth.me().then(u => setIsAdmin(u?.role === "admin"));
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const data = await base44.entities.Blacklist.list("-created_date", 200);
    setEntries(data);
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!form.firmenname.trim()) { toast.error("Firmenname fehlt"); return; }
    await base44.entities.Blacklist.create(form);
    toast.success("Zur Blacklist hinzugefügt");
    setForm({ firmenname: "", grund: "", telefon: "", email: "" });
    setShowAdd(false);
    loadData();
  };

  const handleRemove = async (id) => {
    await base44.entities.Blacklist.delete(id);
    toast.success("Von Blacklist entfernt");
    loadData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Blacklist</h1>
          <p className="text-sm text-muted-foreground">{entries.length} Einträge</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowAdd(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Hinzufügen
          </Button>
        )}
      </div>

      {/* Auftraggeber-Banner */}
      {entries.some(e => e.grund?.includes("AUFTRAGGEBER")) && (
        <div className="bg-primary/10 border border-primary/30 rounded-xl p-3">
          <p className="text-xs font-semibold text-primary flex items-center gap-1.5 mb-1">
            <Star className="w-3.5 h-3.5 fill-primary text-primary" />
            AKTUELLE AUFTRAGGEBER – Niemals anrufen oder besuchen!
          </p>
          <p className="text-xs text-muted-foreground">Diese Firmen sind bestehende Kunden. Ein Anruf wäre extrem peinlich. Sie werden bei der Lead-Suche automatisch ausgeblendet.</p>
        </div>
      )}

      <div className="space-y-2">
        {entries.map(entry => {
          const isAuftraggeber = entry.grund?.includes("AUFTRAGGEBER");
          return (
            <div key={entry.id} className={`border rounded-xl p-4 flex items-center justify-between ${isAuftraggeber ? "bg-primary/5 border-primary/20" : "bg-card border-border"}`}>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  {isAuftraggeber && <Star className="w-3.5 h-3.5 fill-primary text-primary shrink-0" />}
                  <p className="text-sm font-medium">{entry.firmenname}</p>
                  {isAuftraggeber && <span className="text-[10px] font-bold bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full">AUFTRAGGEBER</span>}
                </div>
                {entry.grund && !isAuftraggeber && <p className="text-xs text-muted-foreground mt-0.5">Grund: {entry.grund}</p>}
                <div className="flex gap-4 mt-1">
                  {entry.telefon && <span className="text-xs text-muted-foreground">{entry.telefon}</span>}
                  {entry.email && <span className="text-xs text-muted-foreground">{entry.email}</span>}
                </div>
              </div>
              {isAdmin && (
                <Button variant="ghost" size="icon" onClick={() => handleRemove(entry.id)} className="text-destructive hover:text-destructive">
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          );
        })}
        {entries.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Ban className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Keine Einträge auf der Blacklist</p>
          </div>
        )}
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Zur Blacklist hinzufügen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Firmenname *</Label>
              <Input value={form.firmenname} onChange={e => setForm(p => ({ ...p, firmenname: e.target.value }))} />
            </div>
            <div>
              <Label>Grund</Label>
              <Input value={form.grund} onChange={e => setForm(p => ({ ...p, grund: e.target.value }))} placeholder="z.B. Kein Interesse" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Telefon</Label>
                <Input value={form.telefon} onChange={e => setForm(p => ({ ...p, telefon: e.target.value }))} />
              </div>
              <div>
                <Label>E-Mail</Label>
                <Input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAdd(false)}>Abbrechen</Button>
              <Button onClick={handleAdd}>Hinzufügen</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}