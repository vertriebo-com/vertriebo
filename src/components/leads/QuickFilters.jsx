import { Flame, Phone, Clock, Mail, Star, User, Sparkles } from "lucide-react";

const QUICK_FILTERS = [
  { id: "my_leads", label: "Meine Leads", icon: User, color: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100" },
  { id: "call_today", label: "Heute anrufen", icon: Phone, color: "bg-green-50 text-green-700 border-green-200 hover:bg-green-100" },
  { id: "callback_open", label: "Rückruf offen", icon: Clock, color: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100" },
  { id: "hot_leads", label: "Hot Leads", icon: Flame, color: "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100" },
  { id: "no_task", label: "Ohne Aufgabe", icon: AlertCircle, color: "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100" },
  { id: "no_contact", label: "Lange kein Kontakt", icon: Mail, color: "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100" },
  { id: "new_import", label: "Neu importiert", icon: Sparkles, color: "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100" },
];

import { AlertCircle } from "lucide-react";

export default function QuickFilters({ activeFilter, onFilterClick }) {
  return (
    <div className="flex flex-wrap gap-2">
      {QUICK_FILTERS.map(filter => {
        const Icon = filter.icon;
        const isActive = activeFilter === filter.id;
        return (
          <button
            key={filter.id}
            onClick={() => onFilterClick(isActive ? null : filter.id)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
              isActive
                ? "border-primary bg-primary/10 text-primary shadow-sm"
                : `${filter.color} border-current`
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {filter.label}
          </button>
        );
      })}
    </div>
  );
}