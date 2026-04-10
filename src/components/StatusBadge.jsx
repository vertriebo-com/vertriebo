import { cn } from "@/lib/utils";

const STATUS_STYLES = {
  "Neu": "bg-blue-50 text-blue-700 border-blue-200",
  "Kontakt": "bg-cyan-50 text-cyan-700 border-cyan-200",
  "Rückruf": "bg-amber-50 text-amber-700 border-amber-200",
  "Termin": "bg-purple-50 text-purple-700 border-purple-200",
  "Angebot": "bg-orange-50 text-orange-700 border-orange-200",
  "Gewonnen": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Verloren": "bg-red-50 text-red-700 border-red-200",
};

export default function StatusBadge({ status }) {
  return (
    <span className={cn(
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
      STATUS_STYLES[status] || "bg-muted text-muted-foreground border-border"
    )}>
      {status}
    </span>
  );
}