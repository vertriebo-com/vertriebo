import { Phone, Flame, Clock, AlertCircle, Calendar } from "lucide-react";

const FOCUS_CARDS = [
  { 
    id: "call_today", 
    label: "Heute anrufen", 
    value: "call_today",
    icon: Phone, 
    color: "from-emerald-500 to-green-600", 
    bg: "bg-emerald-50",
    textColor: "text-emerald-700"
  },
  { 
    id: "callback_open", 
    label: "Rückruf offen", 
    value: "callback_open",
    icon: Clock, 
    color: "from-amber-500 to-orange-600", 
    bg: "bg-amber-50",
    textColor: "text-amber-700"
  },
  { 
    id: "hot_leads", 
    label: "Heiße Leads", 
    value: "hot_leads",
    icon: Flame, 
    color: "from-orange-500 to-red-600", 
    bg: "bg-orange-50",
    textColor: "text-orange-700"
  },
  { 
    id: "no_task", 
    label: "Ohne nächste Aufgabe", 
    value: "no_task",
    icon: AlertCircle, 
    color: "from-gray-500 to-slate-600", 
    bg: "bg-gray-50",
    textColor: "text-gray-700"
  },
  { 
    id: "new_this_week", 
    label: "Neu diese Woche", 
    value: "new_this_week",
    icon: Calendar, 
    color: "from-blue-500 to-indigo-600", 
    bg: "bg-blue-50",
    textColor: "text-blue-700"
  },
];

export default function FocusCards({ companies, activeFocus, onFilterClick }) {
  const counts = {
    call_today: 0,
    callback_open: 0,
    hot_leads: 0,
    no_task: 0,
    new_this_week: 0,
  };

  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  companies.forEach(c => {
    // Heute anrufen: letzter Kontakt heute ODER Status Rückruf
    if (c.last_contact_date && c.last_contact_date.startsWith(today)) counts.call_today++;
    if (c.status === "Rückruf") counts.callback_open++;
    if (c.is_hot) counts.hot_leads++;
    if (!c.next_task) counts.no_task++;
    if (c.created_date && c.created_date >= weekAgo) counts.new_this_week++;
  });

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {FOCUS_CARDS.map(card => {
        const Icon = card.icon;
        const isActive = activeFocus === card.value;
        const count = counts[card.id] || 0;
        
        return (
          <button
            key={card.id}
            onClick={() => onFilterClick(isActive ? null : card.value)}
            className={`relative overflow-hidden rounded-2xl p-5 transition-all duration-300 ${
              isActive 
                ? "ring-2 ring-primary ring-offset-2 shadow-lg scale-[1.02]" 
                : "hover:shadow-md hover:scale-[1.01]"
            }`}
          >
            {/* Background Gradient */}
            <div className={`absolute inset-0 bg-gradient-to-br ${card.color} opacity-[0.08]`} />
            
            {/* Content */}
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center shadow-sm`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                {count > 0 && (
                  <span className={`text-2xl font-bold ${card.textColor}`}>
                    {count}
                  </span>
                )}
              </div>
              
              <div className="text-left">
                <p className="text-sm font-semibold text-foreground mb-0.5">
                  {card.label}
                </p>
                <p className="text-xs text-muted-foreground">
                  {count === 0 ? "Keine Einträge" : count === 1 ? "1 Eintrag" : `${count} Einträge`}
                </p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}