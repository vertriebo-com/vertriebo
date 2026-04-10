import { cn } from "@/lib/utils";

const PRIORITY_STYLES = {
  "Hoch": "bg-red-50 text-red-700 border-red-200",
  "Mittel": "bg-amber-50 text-amber-700 border-amber-200",
  "Niedrig": "bg-slate-50 text-slate-600 border-slate-200",
};

export default function PriorityBadge({ priority }) {
  return (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border",
      PRIORITY_STYLES[priority] || "bg-muted text-muted-foreground"
    )}>
      {priority}
    </span>
  );
}