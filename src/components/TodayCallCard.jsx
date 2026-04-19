import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Phone, Shuffle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TodayCallCard({ companies }) {
  // Pool: Neu-Leads mit Telefonnummer, bevorzugt aus aktuellem Batch
  const pool = companies.filter(c => c.status === "Neu" && c.telefon);
  const [current, setCurrent] = useState(() => {
    if (pool.length === 0) return null;
    return pool[Math.floor(Math.random() * pool.length)];
  });

  const navigate = useNavigate();

  const shuffle = () => {
    if (pool.length === 0) return;
    let next;
    do {
      next = pool[Math.floor(Math.random() * pool.length)];
    } while (pool.length > 1 && next?.id === current?.id);
    setCurrent(next);
  };

  if (!current) {
    return (
      <div className="bg-card border border-border rounded-xl px-5 py-6 flex items-center gap-3 text-muted-foreground text-sm">
        <Phone className="w-4 h-4" />
        Keine neuen Leads mit Telefonnummer vorhanden.
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-xl px-5 py-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <Phone className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-sm font-semibold">Heute anrufen</span>
          <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">
            {pool.length} offen
          </span>
        </div>
        <button
          onClick={shuffle}
          className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded"
          title="Andere Firma"
        >
          <Shuffle className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-base truncate">{current.name}</p>
          <p className="text-sm text-muted-foreground truncate">{current.branche || "—"} · {current.ort || "—"}</p>
          <a
            href={`tel:${current.telefon}`}
            className="inline-flex items-center gap-1 text-primary font-medium text-sm mt-1 hover:underline"
          >
            <Phone className="w-3 h-3" />
            {current.telefon}
          </a>
        </div>
        <div className="flex flex-col gap-1.5 shrink-0">
          <Button size="sm" asChild className="gap-1.5">
            <a href={`tel:${current.telefon}`}>
              <Phone className="w-3.5 h-3.5" /> Anrufen
            </a>
          </Button>
          <Button size="sm" variant="outline" onClick={() => navigate(`/leads/${current.id}`)} className="gap-1.5">
            <ExternalLink className="w-3.5 h-3.5" /> Profil
          </Button>
        </div>
      </div>
    </div>
  );
}