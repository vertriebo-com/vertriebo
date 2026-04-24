import { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Phone, PhoneOff, CheckCircle2, PhoneCall } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import moment from "moment";

export default function TagesplanCard({ companies, tasks, user }) {
  const queryClient = useQueryClient();
  const [done, setDone] = useState(new Set());

  // Top 5 Rückruf/Termin/Angebot Firmen für heute
  const callList = companies
    .filter(c => ["Rückruf", "Termin", "Kontakt", "Neu"].includes(c.status) && c.telefon)
    .slice(0, 5);

  const handleCalled = async (company) => {
    setDone(prev => new Set([...prev, company.id]));
    const me = await base44.auth.me();
    await base44.entities.ContactLog.create({
      company_id: company.id,
      typ: "Anruf",
      ergebnis: "Nicht erreicht",
      notiz: "",
      naechster_schritt: "Erneut anrufen",
      user_email: me.email,
    });
    await base44.entities.Company.update(company.id, {
      status: "Rückruf",
      last_contact_date: new Date().toISOString(),
    });
    queryClient.invalidateQueries({ queryKey: ["companies"] });
    toast.success(`${company.name} – Nicht erreicht gespeichert`);
  };

  const totalItems = callList.length + tasks.length;
  if (totalItems === 0) return null;

  return (
    <div className="bg-card border border-border rounded-xl">
      <div className="px-5 py-4 border-b border-border flex items-center gap-2">
        <PhoneCall className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-semibold">Dein Tagesplan</h2>
        <span className="bg-primary/10 text-primary text-[10px] font-bold px-1.5 py-0.5 rounded-full">
          {totalItems} Punkte
        </span>
      </div>

      <div className="divide-y divide-border">
        {/* Aufgaben */}
        {tasks.slice(0, 3).map(task => (
          <div key={task.id} className="px-5 py-3 flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
              task.faellig_am && moment(task.faellig_am).isBefore(moment()) ? "bg-red-500" : "bg-amber-500"
            }`} />
            <Link to={`/leads/${task.company_id}`} className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{task.titel}</p>
              <p className="text-xs text-muted-foreground">{task.company_name}</p>
            </Link>
            <span className="text-[10px] bg-muted px-2 py-0.5 rounded font-medium text-muted-foreground">{task.typ}</span>
          </div>
        ))}

        {/* Anrufliste */}
        {callList.map(company => (
          <div key={company.id} className={`px-5 py-3 flex items-center gap-3 transition-opacity ${done.has(company.id) ? "opacity-40" : ""}`}>
            <Phone className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
            <Link to={`/leads/${company.id}`} className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{company.name}</p>
              <p className="text-xs text-muted-foreground">{company.telefon}</p>
            </Link>
            <div className="flex items-center gap-1.5 shrink-0">
              <a
                href={`tel:${company.telefon}`}
                onClick={() => setTimeout(() => handleCalled(company), 3000)}
                className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                title="Anrufen"
              >
                <Phone className="w-3.5 h-3.5" />
              </a>
              <button
                onClick={() => handleCalled(company)}
                className="p-1.5 rounded-lg bg-muted text-muted-foreground hover:bg-amber-50 hover:text-amber-600 transition-colors"
                title="Nicht erreicht"
              >
                <PhoneOff className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}