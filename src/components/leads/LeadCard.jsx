import { Link } from "react-router-dom";
import { Building2, Flame, Phone, MapPin, Clock, User, Calendar } from "lucide-react";
import StatusBadge from "../StatusBadge";
import PriorityBadge from "../PriorityBadge";
import LeadActions from "./LeadActions";
import moment from "moment";

export default function LeadCard({ company, isAdmin, onLogged }) {
  const priorityLabel = (company.priority_score || 0) >= 60 ? "Heiß" : (company.priority_score || 0) >= 30 ? "Warm" : "Kalt";
  const priorityColor = (company.priority_score || 0) >= 60 ? "text-orange-600" : (company.priority_score || 0) >= 30 ? "text-amber-600" : "text-gray-500";

  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${company.is_hot ? "bg-gradient-to-br from-orange-400/20 to-red-500/20 border border-orange-400/30" : "bg-gradient-to-br from-primary/10 to-blue-600/10 border border-primary/20"}`}>
            {company.is_hot ? <Flame className="w-6 h-6 text-orange-500" /> : <Building2 className="w-6 h-6 text-primary" />}
          </div>
          <div className="min-w-0 flex-1">
            <Link to={`/leads/${company.id}`} className="text-base font-bold text-foreground hover:text-primary transition-colors truncate block">
              {company.name}
            </Link>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="text-xs text-muted-foreground">{company.branche || "Keine Branche"}</span>
              {company.ort && (
                <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                  <MapPin className="w-3 h-3" /> {company.ort}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <StatusBadge status={company.status} />
          <PriorityBadge priority={priorityLabel} />
        </div>
      </div>

      {/* Contact Info */}
      <div className="flex items-center gap-3 mb-3">
        {company.telefon && (
          <a href={`tel:${company.telefon}`} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors">
            <Phone className="w-3.5 h-3.5" /> {company.telefon}
          </a>
        )}
        {company.website && (
          <a href={company.website.startsWith("http") ? company.website : `https://${company.website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors truncate">
            <Building2 className="w-3.5 h-3.5" /> Website
          </a>
        )}
      </div>

      {/* Next Step */}
      <div className="flex items-center gap-2 mb-3 p-2.5 bg-muted/50 rounded-lg">
        <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-foreground">Nächster Schritt: Anrufen</p>
          <p className="text-[10px] text-muted-foreground">Heute fällig</p>
        </div>
      </div>

      {/* Last Contact */}
      <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Letzter Kontakt: {company.last_contact_date ? moment(company.last_contact_date).format("DD.MM.YY") : "–"}
        </span>
        {company.assigned_to ? (
          <span className="flex items-center gap-1">
            <User className="w-3 h-3" />
            {company.assigned_to.split("@")[0]}
          </span>
        ) : (
          <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded">Nicht zugewiesen</span>
        )}
      </div>

      {/* Actions */}
      <LeadActions company={company} onLogged={onLogged} isAdmin={isAdmin} />
    </div>
  );
}