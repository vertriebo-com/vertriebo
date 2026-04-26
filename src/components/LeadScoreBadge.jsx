import { Flame, TrendingUp, Minus } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Extrahiert KI-Begründung aus Notizen-Feld
function extractAiReason(notizen) {
  if (!notizen) return null;
  const match = notizen.match(/\[\[AI:(.*?)\]\]/s);
  return match ? match[1].trim() : null;
}

function getScoreTier(score, isHot) {
  if (isHot || score >= 75) return "hot";
  if (score >= 50) return "warm";
  if (score >= 25) return "cool";
  return "cold";
}

function FlameIcon({ tier }) {
  if (tier === "hot") return (
    <span className="flex items-center gap-0.5">
      <Flame className="w-3 h-3 text-orange-500" />
      <Flame className="w-3 h-3 text-orange-400" />
      <Flame className="w-3 h-3 text-orange-300" />
    </span>
  );
  if (tier === "warm") return (
    <span className="flex items-center gap-0.5">
      <Flame className="w-3 h-3 text-amber-500" />
      <Flame className="w-3 h-3 text-amber-300" />
    </span>
  );
  if (tier === "cool") return <TrendingUp className="w-3 h-3 text-blue-400" />;
  return <Minus className="w-3 h-3 text-muted-foreground" />;
}

const TIER_STYLES = {
  hot:  "bg-orange-100 text-orange-700 border-orange-300",
  warm: "bg-amber-50  text-amber-700  border-amber-200",
  cool: "bg-blue-50   text-blue-600   border-blue-200",
  cold: "bg-muted     text-muted-foreground border-border",
};

const TIER_LABELS = {
  hot:  "Heißer Lead",
  warm: "Vielversprechend",
  cool: "Interessant",
  cold: "Gering priorisiert",
};

export default function LeadScoreBadge({ score, isHot, notizen }) {
  if (score === undefined || score === null) return null;

  const tier = getScoreTier(score, isHot);
  const aiReason = extractAiReason(notizen);

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={`cursor-help inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${TIER_STYLES[tier]}`}>
            <FlameIcon tier={tier} />
            {score}
          </span>
        </TooltipTrigger>
        <TooltipContent side="left" className="max-w-[240px] p-3 space-y-2">
          <div className="flex items-center gap-2">
            <FlameIcon tier={tier} />
            <p className="text-xs font-bold">{TIER_LABELS[tier]} · Score {score}/100</p>
          </div>
          {aiReason && (
            <div className="bg-primary/5 rounded-md px-2 py-1.5">
              <p className="text-[10px] font-semibold text-primary mb-0.5">🤖 KI-Analyse</p>
              <p className="text-xs text-foreground leading-snug">{aiReason}</p>
            </div>
          )}
          <div className="border-t border-border pt-2 space-y-1">
            {tier === "hot"  && <p className="text-xs text-muted-foreground">Sofort kontaktieren – sehr hohes Abschlusspotenzial.</p>}
            {tier === "warm" && <p className="text-xs text-muted-foreground">Bald nachfassen – gute Signale vorhanden.</p>}
            {tier === "cool" && <p className="text-xs text-muted-foreground">Potenzial erkannt – weiter beobachten.</p>}
            {tier === "cold" && <p className="text-xs text-muted-foreground">Noch kein starkes Signal – niedrige Priorität.</p>}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}