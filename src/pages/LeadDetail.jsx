import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  Phone,
  Mail,
  Globe,
  MapPin,
  User,
  Plus,
  History,
  ListTodo,
  Trash2,
  Ban
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import StatusBadge from "../components/StatusBadge";
import AddContactLogDialog from "../components/AddContactLogDialog";
import AddTaskDialog from "../components/AddTaskDialog";
import PriorityBadge from "../components/PriorityBadge";
import { toast } from "sonner";
import moment from "moment";

const STATUSES = ["Neu", "Kontakt", "Rückruf", "Termin", "Angebot", "Gewonnen", "Verloren"];

export default function LeadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [company, setCompany] = useState(null);
  const [contactLogs, setContactLogs] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddLog, setShowAddLog] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    const [comp, logs, allTasks] = await Promise.all([
      base44.entities.Company.filter({ id }),
      base44.entities.ContactLog.filter({ company_id: id }),
      base44.entities.Task.filter({ company_id: id }),
    ]);
    setCompany(comp[0] || null);
    setContactLogs(logs.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
    setTasks(allTasks.sort((a, b) => new Date(a.faellig_am || 0) - new Date(b.faellig_am || 0)));
    setLoading(false);
  };

  const handleStatusChange = async (newStatus) => {
    await base44.entities.Company.update(id, { status: newStatus });
    setCompany(prev => ({ ...prev, status: newStatus }));
    toast.success(`Status auf "${newStatus}" geändert`);
  };

  const handleBlacklist = async () => {
    await base44.entities.Blacklist.create({
      firmenname: company.name,
      telefon: company.telefon,
      email: company.email,
      grund: "Manuell hinzugefügt",
    });
    await base44.entities.Company.update(id, { is_blacklisted: true, status: "Verloren" });
    toast.success("Firma auf Blacklist gesetzt");
    navigate("/leads");
  };

  const handleDelete = async () => {
    await base44.entities.Company.delete(id);
    toast.success("Firma gelöscht");
    navigate("/leads");
  };

  const toggleTask = async (task) => {
    await base44.entities.Task.update(task.id, { erledigt: !task.erledigt });
    loadData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Firma nicht gefunden</p>
        <Link to="/leads"><Button variant="ghost" className="mt-4">Zurück</Button></Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Link to="/leads">
            <Button variant="ghost" size="icon" className="mt-0.5">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold">{company.name}</h1>
            <p className="text-sm text-muted-foreground">{company.branche || "Keine Branche"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={company.status} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map(s => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" /> Firmendaten
          </h3>
          <div className="space-y-2.5 text-sm">
            {company.ansprechpartner && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="w-3.5 h-3.5" /> {company.ansprechpartner}
              </div>
            )}
            {company.adresse && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="w-3.5 h-3.5" /> {company.adresse}, {company.plz} {company.ort}
              </div>
            )}
            {company.telefon && (
              <a href={`tel:${company.telefon}`} className="flex items-center gap-2 text-primary hover:underline">
                <Phone className="w-3.5 h-3.5" /> {company.telefon}
              </a>
            )}
            {company.email && (
              <a href={`mailto:${company.email}`} className="flex items-center gap-2 text-primary hover:underline">
                <Mail className="w-3.5 h-3.5" /> {company.email}
              </a>
            )}
            {company.website && (
              <a href={company.website.startsWith("http") ? company.website : `https://${company.website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary hover:underline">
                <Globe className="w-3.5 h-3.5" /> {company.website}
              </a>
            )}
            {company.entfernung_km && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="w-3.5 h-3.5" /> {company.entfernung_km} km Entfernung
              </div>
            )}
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-semibold">Notizen</h3>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {company.notizen || "Keine Notizen"}
          </p>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" size="sm" className="text-xs gap-1" onClick={handleBlacklist}>
              <Ban className="w-3 h-3" /> Blacklist
            </Button>
            <Button variant="outline" size="sm" className="text-xs gap-1 text-destructive hover:text-destructive" onClick={handleDelete}>
              <Trash2 className="w-3 h-3" /> Löschen
            </Button>
          </div>
        </div>
      </div>

      {/* Tasks */}
      <div className="bg-card border border-border rounded-xl">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <ListTodo className="w-4 h-4 text-primary" /> Aufgaben
          </h3>
          <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => setShowAddTask(true)}>
            <Plus className="w-3 h-3" /> Aufgabe
          </Button>
        </div>
        <div className="divide-y divide-border">
          {tasks.map(task => (
            <div key={task.id} className="px-5 py-3 flex items-center gap-3">
              <input
                type="checkbox"
                checked={task.erledigt}
                onChange={() => toggleTask(task)}
                className="w-4 h-4 rounded border-border"
              />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${task.erledigt ? "line-through text-muted-foreground" : ""}`}>
                  {task.titel}
                </p>
                {task.faellig_am && (
                  <p className="text-xs text-muted-foreground">
                    {moment(task.faellig_am).format("DD.MM.YYYY HH:mm")}
                  </p>
                )}
              </div>
              <PriorityBadge priority={task.prioritaet} />
            </div>
          ))}
          {tasks.length === 0 && (
            <div className="px-5 py-6 text-center text-sm text-muted-foreground">
              Keine Aufgaben
            </div>
          )}
        </div>
      </div>

      {/* Contact History */}
      <div className="bg-card border border-border rounded-xl">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <History className="w-4 h-4 text-primary" /> Kontakthistorie
          </h3>
          <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => setShowAddLog(true)}>
            <Plus className="w-3 h-3" /> Kontakt
          </Button>
        </div>
        <div className="divide-y divide-border">
          {contactLogs.map(log => (
            <div key={log.id} className="px-5 py-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium bg-muted px-2 py-0.5 rounded">{log.typ}</span>
                <span className="text-xs text-muted-foreground">{moment(log.created_date).format("DD.MM.YYYY HH:mm")}</span>
              </div>
              {log.ergebnis && (
                <p className="text-xs text-muted-foreground mt-1">Ergebnis: {log.ergebnis}</p>
              )}
              {log.notiz && (
                <p className="text-sm mt-1.5">{log.notiz}</p>
              )}
              {log.user_email && (
                <p className="text-xs text-muted-foreground mt-1">Von: {log.user_email}</p>
              )}
            </div>
          ))}
          {contactLogs.length === 0 && (
            <div className="px-5 py-6 text-center text-sm text-muted-foreground">
              Keine Kontakte dokumentiert
            </div>
          )}
        </div>
      </div>

      <AddContactLogDialog
        open={showAddLog}
        onClose={() => setShowAddLog(false)}
        companyId={id}
        companyName={company.name}
        onCreated={loadData}
      />
      <AddTaskDialog
        open={showAddTask}
        onClose={() => setShowAddTask(false)}
        companyId={id}
        companyName={company.name}
        onCreated={loadData}
      />
    </div>
  );
}