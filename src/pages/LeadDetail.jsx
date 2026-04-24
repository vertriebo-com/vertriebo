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
  Ban,
  Sparkles,
  MessageSquare,
  CheckCircle2,
  Circle,
  Clock,
  ChevronRight,
  PhoneCall,
  Flame
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import MobileSelect from "@/components/MobileSelect";
import StatusBadge from "../components/StatusBadge";
import EmailTemplates from "../components/EmailTemplates";
import CallScriptDialog from "../components/CallScriptDialog";
import AddContactLogDialog from "../components/AddContactLogDialog";
import AddTaskDialog from "../components/AddTaskDialog";
import PriorityBadge from "../components/PriorityBadge";
import SendEmailDialog from "../components/SendEmailDialog";
import { toast } from "sonner";
import moment from "moment";

const STATUSES = ["Neu", "Kontakt", "Rückruf", "Termin", "Angebot", "Gewonnen", "Verloren"];

const ERGEBNIS_STYLES = {
  "Erreicht": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Nicht erreicht": "bg-red-50 text-red-600 border-red-200",
  "Rückruf vereinbart": "bg-amber-50 text-amber-700 border-amber-200",
  "Termin vereinbart": "bg-purple-50 text-purple-700 border-purple-200",
  "Angebot gesendet": "bg-blue-50 text-blue-700 border-blue-200",
  "Abgeschlossen": "bg-gray-50 text-gray-600 border-gray-200",
  "Kein Interesse": "bg-red-50 text-red-500 border-red-200",
};

const TYP_ICONS = {
  "Anruf": "📞",
  "E-Mail": "✉️",
  "Besuch": "🚶",
  "Termin": "📅",
  "Angebot": "📄",
  "Sonstiges": "💬",
};

export default function LeadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [company, setCompany] = useState(null);
  const [contactLogs, setContactLogs] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddLog, setShowAddLog] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [notizen, setNotizen] = useState("");
  const [notizenSaving, setNotizenSaving] = useState(false);
  const [showSonstigesDialog, setShowSonstigesDialog] = useState(false);
  const [sonstigesNotiz, setSonstigesNotiz] = useState("");
  const [sonstigesSaving, setSonstigesSaving] = useState(false);

  useEffect(() => { loadData(); }, [id]);

  const loadData = async () => {
    const [comp, logs, allTasks] = await Promise.all([
      base44.entities.Company.filter({ id }),
      base44.entities.ContactLog.filter({ company_id: id }),
      base44.entities.Task.filter({ company_id: id }),
    ]);
    setCompany(comp[0] || null);
    setNotizen(comp[0]?.notizen || "");
    setContactLogs(logs.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
    setTasks(allTasks.sort((a, b) => new Date(a.faellig_am || 0) - new Date(b.faellig_am || 0)));
    setLoading(false);
  };

  const handleStatusChange = async (newStatus) => {
    if (newStatus === "__sonstiges__") { setSonstigesNotiz(""); setShowSonstigesDialog(true); return; }
    await base44.entities.Company.update(id, { status: newStatus });
    setCompany(prev => ({ ...prev, status: newStatus }));
    toast.success(`Status auf "${newStatus}" geändert`);
  };

  const handleSonstigesSubmit = async () => {
    setSonstigesSaving(true);
    const me = await base44.auth.me();
    await base44.entities.ContactLog.create({
      company_id: id, typ: "Sonstiges", ergebnis: "Abgeschlossen",
      notiz: sonstigesNotiz, naechster_schritt: "Kunde meldet sich selbst", user_email: me.email,
    });
    await base44.entities.Company.update(id, { last_contact_date: new Date().toISOString() });
    toast.success("Notiz gespeichert");
    setSonstigesSaving(false); setShowSonstigesDialog(false); setSonstigesNotiz(""); loadData();
  };

  const handleBlacklist = async () => {
    await base44.entities.Blacklist.create({ firmenname: company.name, telefon: company.telefon, email: company.email, grund: "Manuell hinzugefügt" });
    await base44.entities.Company.update(id, { is_blacklisted: true, status: "Verloren" });
    toast.success("Firma auf Blacklist gesetzt"); navigate("/leads");
  };

  const handleDelete = async () => {
    if (!window.confirm("Firma wirklich löschen?")) return;
    await base44.entities.Company.delete(id);
    toast.success("Firma gelöscht"); navigate("/leads");
  };

  const handleEnrich = async () => {
    setEnriching(true);
    const res = await base44.functions.invoke("enrichCompany", { companyId: id });
    const { found } = res.data;
    found > 0 ? toast.success(`${found} Felder automatisch ergänzt!`) : toast.info("Keine neuen Daten gefunden.");
    setEnriching(false); if (found > 0) loadData();
  };

  const handleSaveNotizen = async () => {
    setNotizenSaving(true);
    await base44.entities.Company.update(id, { notizen });
    setCompany(prev => ({ ...prev, notizen }));
    toast.success("Notizen gespeichert"); setNotizenSaving(false);
  };

  const toggleTask = async (task) => {
    const nowDone = !task.erledigt;
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, erledigt: nowDone } : t));
    await base44.entities.Task.update(task.id, { erledigt: nowDone });
    toast.success(nowDone ? "Aufgabe erledigt ✓" : "Aufgabe wieder geöffnet");
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  if (!company) return (
    <div className="text-center py-16">
      <p className="text-muted-foreground">Firma nicht gefunden</p>
      <Link to="/leads"><Button variant="ghost" className="mt-4">Zurück</Button></Link>
    </div>
  );

  const openTasks = tasks.filter(t => !t.erledigt);
  const doneTasks = tasks.filter(t => t.erledigt);

  return (
    <div className="space-y-5 max-w-4xl">

      {/* ── Hero Header ── */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {/* Colored top stripe */}
        <div className={`h-1.5 w-full ${company.is_hot ? "bg-gradient-to-r from-orange-400 to-red-500" : "bg-gradient-to-r from-primary to-blue-400"}`} />
        <div className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link to="/leads">
              <button className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
                <ArrowLeft className="w-4 h-4" />
              </button>
            </Link>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${company.is_hot ? "bg-orange-100" : "bg-primary/10"}`}>
              {company.is_hot ? <Flame className="w-6 h-6 text-orange-500" /> : <Building2 className="w-6 h-6 text-primary" />}
            </div>
            <div>
              <h1 className="text-xl font-bold leading-tight">{company.name}</h1>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="text-sm text-muted-foreground">{company.branche || "Keine Branche"}</span>
                {company.ort && <span className="text-xs text-muted-foreground">· {company.ort}</span>}
                {company.last_contact_date && (
                  <span className="text-xs text-muted-foreground">· Letzter Kontakt: {moment(company.last_contact_date).fromNow()}</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 pl-10 sm:pl-0">
            <StatusBadge status={company.status} />
            <MobileSelect
              value={company.status}
              onValueChange={handleStatusChange}
              options={[
                ...STATUSES.map(s => ({ value: s, label: s })),
                { value: "__sonstiges__", label: "📝 Sonstiges (Notiz)" },
              ]}
              placeholder="Status"
              triggerClassName="w-36 h-8 text-xs"
            />
          </div>
        </div>

        {/* Quick action bar */}
        <div className="px-5 pb-4 flex flex-wrap gap-2">
          {company.telefon && (
            <a href={`tel:${company.telefon}`} className="inline-flex items-center gap-1.5 text-xs font-medium bg-green-50 text-green-700 border border-green-200 px-3 py-1.5 rounded-lg hover:bg-green-100 transition-colors">
              <Phone className="w-3.5 h-3.5" /> {company.telefon}
            </a>
          )}
          {company.email && (
            <a href={`mailto:${company.email}`} className="inline-flex items-center gap-1.5 text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors">
              <Mail className="w-3.5 h-3.5" /> E-Mail senden
            </a>
          )}
          <CallScriptDialog company={company} />
          <SendEmailDialog company={company} />
          <EmailTemplates company={company} />
          <Button variant="outline" size="sm" className="text-xs gap-1.5 h-8 text-purple-700 border-purple-200 hover:bg-purple-50" onClick={handleEnrich} disabled={enriching}>
            {enriching ? <span className="w-3 h-3 border-2 border-purple-400 border-t-transparent rounded-full animate-spin inline-block" /> : <Sparkles className="w-3 h-3" />}
            Anreichern
          </Button>
          <Button variant="outline" size="sm" className="text-xs gap-1.5 h-8" onClick={handleBlacklist}>
            <Ban className="w-3 h-3" /> Blacklist
          </Button>
          <Button variant="outline" size="sm" className="text-xs gap-1.5 h-8 text-destructive hover:text-destructive" onClick={handleDelete}>
            <Trash2 className="w-3 h-3" /> Löschen
          </Button>
        </div>
      </div>

      {/* ── Two-column grid ── */}
      <div className="grid md:grid-cols-2 gap-5">

        {/* Firmendaten */}
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Building2 className="w-3.5 h-3.5" /> Firmendaten
          </h3>
          <div className="space-y-3">
            {company.ansprechpartner && (
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  <User className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
                <span className="text-sm">{company.ansprechpartner}</span>
              </div>
            )}
            {company.adresse && (
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm">{company.adresse}</p>
                  <p className="text-sm text-muted-foreground">{company.plz} {company.ort}</p>
                  {company.entfernung_km && <p className="text-xs text-muted-foreground">{company.entfernung_km} km entfernt</p>}
                </div>
              </div>
            )}
            {company.telefon && (
              <a href={`tel:${company.telefon}`} className="flex items-center gap-3 group">
                <div className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                  <Phone className="w-3.5 h-3.5 text-green-600" />
                </div>
                <span className="text-sm text-green-700 group-hover:underline">{company.telefon}</span>
              </a>
            )}
            {company.email && (
              <a href={`mailto:${company.email}`} className="flex items-center gap-3 group">
                <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-3.5 h-3.5 text-blue-600" />
                </div>
                <span className="text-sm text-blue-700 group-hover:underline truncate">{company.email}</span>
              </a>
            )}
            {company.website && (
              <a href={company.website.startsWith("http") ? company.website : `https://${company.website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 group">
                <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  <Globe className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
                <span className="text-sm text-primary group-hover:underline truncate">{company.website}</span>
              </a>
            )}
          </div>
          {company.aktueller_dienstleister && (
            <div className="mt-2 pt-4 border-t border-border">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Aktueller Dienstleister</p>
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                <span className="text-sm font-medium text-amber-800">🏢 {company.aktueller_dienstleister}</span>
              </div>
            </div>
          )}
        </div>

        {/* Notizen */}
        <div className="bg-card border border-border rounded-2xl p-5 space-y-3 flex flex-col">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <MessageSquare className="w-3.5 h-3.5" /> Notizen
          </h3>
          <textarea
            value={notizen}
            onChange={e => setNotizen(e.target.value)}
            rows={6}
            placeholder="Notizen hier eingeben..."
            className="flex-1 w-full rounded-xl border border-input bg-muted/30 px-3 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
          />
          {notizen !== (company.notizen || "") && (
            <Button size="sm" onClick={handleSaveNotizen} disabled={notizenSaving} className="self-end text-xs h-8">
              {notizenSaving ? "Speichert..." : "Speichern"}
            </Button>
          )}
        </div>
      </div>

      {/* ── Aufgaben ── */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ListTodo className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">Aufgaben</h3>
            {openTasks.length > 0 && (
              <span className="bg-primary/10 text-primary text-[10px] font-bold px-1.5 py-0.5 rounded-full">{openTasks.length} offen</span>
            )}
          </div>
          <Button size="sm" variant="outline" className="text-xs gap-1.5 h-8" onClick={() => setShowAddTask(true)}>
            <Plus className="w-3 h-3" /> Aufgabe
          </Button>
        </div>
        <div className="divide-y divide-border">
          {tasks.map(task => {
            const isOverdue = !task.erledigt && task.faellig_am && moment(task.faellig_am).isBefore(moment());
            return (
              <div key={task.id} className={`px-5 py-3.5 flex items-center gap-3 transition-colors ${task.erledigt ? "opacity-50" : "hover:bg-muted/20"}`}>
                <button onClick={() => toggleTask(task)} className="flex-shrink-0">
                  {task.erledigt
                    ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    : <Circle className="w-5 h-5 text-muted-foreground hover:text-primary transition-colors" />
                  }
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${task.erledigt ? "line-through text-muted-foreground" : ""}`}>{task.titel}</p>
                  {task.faellig_am && (
                    <div className={`flex items-center gap-1 mt-0.5 text-xs ${isOverdue ? "text-red-500 font-medium" : "text-muted-foreground"}`}>
                      <Clock className="w-3 h-3" />
                      {isOverdue ? "Überfällig – " : ""}{moment(task.faellig_am).format("DD.MM.YYYY HH:mm")}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] bg-muted px-2 py-0.5 rounded font-medium text-muted-foreground">{task.typ}</span>
                  <PriorityBadge priority={task.prioritaet} />
                </div>
              </div>
            );
          })}
          {tasks.length === 0 && (
            <div className="px-5 py-10 text-center">
              <ListTodo className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Keine Aufgaben vorhanden</p>
              <button onClick={() => setShowAddTask(true)} className="mt-2 text-xs text-primary hover:underline">Aufgabe erstellen</button>
            </div>
          )}
        </div>
      </div>

      {/* ── Kontakthistorie ── */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">Kontakthistorie</h3>
            {contactLogs.length > 0 && (
              <span className="bg-muted text-muted-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full">{contactLogs.length}</span>
            )}
          </div>
          <Button size="sm" variant="outline" className="text-xs gap-1.5 h-8" onClick={() => setShowAddLog(true)}>
            <Plus className="w-3 h-3" /> Kontakt
          </Button>
        </div>

        {/* Timeline */}
        <div className="divide-y divide-border">
          {contactLogs.map((log, idx) => (
            <div key={log.id} className="px-5 py-4 hover:bg-muted/10 transition-colors">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 text-base">
                  {TYP_ICONS[log.typ] || "💬"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold">{log.typ}</span>
                      {log.ergebnis && (
                        <span className={`text-[10px] font-medium border px-2 py-0.5 rounded-full ${ERGEBNIS_STYLES[log.ergebnis] || "bg-muted text-muted-foreground border-border"}`}>
                          {log.ergebnis}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground flex-shrink-0">{moment(log.created_date).format("DD.MM.YY HH:mm")}</span>
                  </div>
                  {log.notiz && <p className="text-sm text-foreground mt-1.5 leading-relaxed">{log.notiz}</p>}
                  {log.naechster_schritt && (
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <ChevronRight className="w-3 h-3" /> {log.naechster_schritt}
                    </p>
                  )}
                  {log.user_email && <p className="text-[10px] text-muted-foreground mt-1.5">{log.user_email}</p>}
                  {log.ergebnis === "Nicht erreicht" && company?.email && (
                    <div className="mt-2"><SendEmailDialog company={company} /></div>
                  )}
                </div>
              </div>
            </div>
          ))}
          {contactLogs.length === 0 && (
            <div className="px-5 py-10 text-center">
              <PhoneCall className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Noch kein Kontakt dokumentiert</p>
              <button onClick={() => setShowAddLog(true)} className="mt-2 text-xs text-primary hover:underline">Kontakt hinzufügen</button>
            </div>
          )}
        </div>
      </div>

      {/* Sonstiges Dialog */}
      <Dialog open={showSonstigesDialog} onOpenChange={setShowSonstigesDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" /> Sonstiges – Notiz erfassen
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground -mt-1">{company?.name}</p>
          <div className="space-y-3 pt-1">
            <div>
              <Label className="text-xs mb-1 block">Was kam beim Anruf raus?</Label>
              <textarea
                value={sonstigesNotiz}
                onChange={e => setSonstigesNotiz(e.target.value)}
                placeholder="z.B. Möchten nur eine E-Mail mit Kontaktdaten..."
                rows={4} autoFocus
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowSonstigesDialog(false)} className="text-sm px-3 py-1.5 rounded-md border border-border hover:bg-muted transition-colors">Abbrechen</button>
              <button onClick={handleSonstigesSubmit} disabled={sonstigesSaving || !sonstigesNotiz.trim()} className="text-sm px-4 py-1.5 rounded-md bg-primary text-primary-foreground font-medium disabled:opacity-40 transition-colors">
                {sonstigesSaving ? "Speichert..." : "Speichern"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AddContactLogDialog open={showAddLog} onClose={() => setShowAddLog(false)} companyId={id} companyName={company.name} onCreated={loadData} />
      <AddTaskDialog open={showAddTask} onClose={() => setShowAddTask(false)} companyId={id} companyName={company.name} onCreated={loadData} />
    </div>
  );
}