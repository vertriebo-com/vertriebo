import { Flame, TrendingUp } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

function buildExplanation(score, isHot) {
  const reasons = [];
  if (isHot) reasons.push("🔥 Als heißer Lead markiert");
  if (score >= 30) reasons.push("📍 Sehr nah am Standort (< 10 km)");
  else if (score >= 20) reasons.push("📍 Nahe am Standort (< 20 km)");
  if (score >= 15) reasons.push("📞 Aktive Kontakthistorie vorhanden");
  if (score >= 10) reasons.push("✅ Offene Aufgaben vorhanden");
  if (score >= 8) reasons.push("📊 Relevanter Status (Rückruf / Termin / Angebot)");
  if (reasons.length === 0) reasons.push("🆕 Neuer Lead ohne bisherige Aktivität");
  return reasons;
}

export default function LeadScoreBadge({ score, isHot }) {
  if (score === undefined || score === null) return null;

  const reasons = buildExplanation(score, isHot);

  let badge;
  if (isHot) {
    badge = (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-orange-100 text-orange-700 border border-orange-200">
        <Flame className="w-3 h-3" /> {score}
      </span>
    );
  } else if (score >= 8) {
    badge = (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
        <TrendingUp className="w-3 h-3" /> {score}
      </span>
    );
  } else {
    badge = (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-muted text-muted-foreground border border-border">
        {score}
      </span>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="cursor-help">{badge}</span>
        </TooltipTrigger>
        <TooltipContent side="left" className="max-w-[220px] space-y-1.5 p-3">
          <p className="text-xs font-semibold mb-1">Prioritäts-Score: {score}</p>
          {reasons.map((r, i) => (
            <p key={i} className="text-xs text-muted-foreground">{r}</p>
          ))}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}