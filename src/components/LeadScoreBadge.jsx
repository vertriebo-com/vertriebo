import { Flame, TrendingUp, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export default function LeadScoreBadge({ score, isHot }) {
  if (score === undefined || score === null) return null;

  if (isHot) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-orange-100 text-orange-700 border border-orange-200">
        <Flame className="w-3 h-3" /> {score}
      </span>
    );
  }
  if (score >= 8) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
        <TrendingUp className="w-3 h-3" /> {score}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-muted text-muted-foreground border border-border">
      <Minus className="w-3 h-3" /> {score}
    </span>
  );
}