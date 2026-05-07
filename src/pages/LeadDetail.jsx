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
  Flame,
  Target,
  Lightbulb,
  Calendar,
  FileText,
  TrendingUp,
  Star
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import StatusBadge from "../components/StatusBadge";
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
  const [showKiDialog, setShowKiDialog] = useState(false);

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
    const me = await base44.auth.me();
    let orgId = company.organization_id || null;
    if (!orgId) {
      const orgs = await base44.entities.Organization.filter({ owner_email: me.email });
      let org = orgs?.[0] || null;
      if (!org) {
        const memberships = await base44.entities.OrganizationMember.filter({ user_email: me.email, status: "active" });
        if (memberships?.[0]?.organization_id) {
          const memberOrgs = await base44.entities.Organization.filter({ id: memberships[0].organization_id });
          org = memberOrgs?.[0] || null;
        }
      }
      orgId = org?.id || null;
    }
    await base44.entities.Blacklist.create({ organization_id: orgId, firmenname: company.name, telefon: company.telefon, email: company.email, grund: "Manuell hinzugefügt" });
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

  // KI-Vorschlag generieren (einfach, regelbasiert)
  const getKiVorschlag = () => {
    if (!company) return null;
    const daysSinceLastContact = company.last_contact_date 
      ? moment().diff(moment(company.last_contact_date), "days")
      : null;

    if (company.status === "Neu" || !company.last_contact_date) {
      return {
        title: "Erstkontakt herstellen",
        description: "Rufen Sie heute an und stellen Sie Ihr Unternehmen vor. Nutzen Sie den Branchen-Einstieg.",
        action: "Anrufen",
        icon: PhoneCall,
        color: "text-blue-600 bg-blue-50 border-blue-200",
      };
    }
    if (company.status === "Rückruf" && daysSinceLastContact >= 1) {
      return {
        title: "Rückruf durchführen",
        description: "Letzter Kontakt war vor " + daysSinceLastContact + " Tagen. Jetzt zurückrufen.",
        action: "Anrufen",
        icon: Phone,
        color: "text-amber-600 bg-amber-50 border-amber-200",
      };
    }
    if (company.status === "Termin" && daysSinceLastContact >= 3) {
      return {
        title: "Termin nachfassen",
        description: "Nach dem Termin jetzt Angebot oder Unterlagen nachsenden.",
        action: "E-Mail senden",
        icon: Mail,
        color: "text-purple-600 bg-purple-50 border-purple-200",
      };
    }
    if (company.status === "Angebot" && daysSinceLastContact >= 5) {
      return {
        title: "Angebot nachfassen",
        description: "Das Angebot liegt seit " + daysSinceLastContact + " Tagen vor. Jetzt Rückmeldung einholen.",
        action: "Anrufen",
        icon: PhoneCall,
        color: "text-orange-600 bg-orange-50 border-orange-200",
      };
    }
    if (daysSinceLastContact && daysSinceLastContact >= 14 && company.status !== "Gewonnen" && company.status !== "Verloren") {
      return {
        title: "Kontakt pflegen",
        description: "Länger kein Kontakt gehabt. Kurze Nachfrage per E-Mail oder Anruf.",
        action: "Kontaktieren",
        icon: MessageSquare,
        color: "text-gray-600 bg-gray-50 border-gray-200",
      };
    }
    return {
      title: "Weiterhin beobachten",
      description: "Kein dringender Handlungsbedarf. Lead im Auge behalten.",
      action: null,
      icon: Star,
      color: "text-muted-foreground bg-muted border-border",
    };
  };

  const kiVorschlag = getKiVorschlag();

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
    <div className="space-y-5">

      {/* Header */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <div className={`h-1 w-full ${company.is_hot ? "bg-gradient-to-r from-orange-400 to-red-500" : "bg-gradient-to-r from-primary to-blue-400"}`} />
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
          <div className="flex items-center gap-2">
            <StatusBadge status={company.status} />
            <PriorityBadge priority={company.priority_score >= 60 ? "Hoch" : company.priority_score >= 30 ? "Mittel" : "Niedrig"} />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="px-5 pb-4 flex flex-wrap gap-2">
          {company.telefon && (
            <a href={`tel:${company.telefon}`} className="inline-flex items-center gap-1.5 h-9 text-sm font-medium bg-green-50 text-green-700 border border-green-200 px-3 rounded-lg hover:bg-green-100 transition-colors">
              <Phone className="w-4 h-4" /> Anrufen
            </a>
          )}
          <CallScriptDialog company={company} />
          <SendEmailDialog company={company} />
          <Button variant="outline" size="sm" onClick={() => setShowAddTask(true)} className="gap-1.5">
            <Calendar className="w-3.5 h-3.5" /> Aufgabe
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowAddLog(true)} className="gap-1.5">
            <MessageSquare className="w-3.5 h-3.5" /> Kontakt
          </Button>
          <button onClick={handleEnrich} disabled={enriching} className="inline-flex items-center gap-1.5 h-9 text-sm font-medium border border-border bg-background px-3 rounded-lg hover:bg-muted transition-colors disabled:opacity-50">
            {enriching ? <span className="w-4 h-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin inline-block" /> : <Sparkles className="w-3.5 h-3.5" />}
            Anreichern
          </button>
          <button onClick={() => setShowKiDialog(true)} className="inline-flex items-center gap-1.5 h-9 text-sm font-medium border border-primary/30 bg-primary/5 text-primary px-3 rounded-lg hover:bg-primary/10 transition-colors">
            <Lightbulb className="w-3.5 h-3.5" /> KI-Tipp
          </button>
          <button onClick={handleBlacklist} className="inline-flex items-center gap-1.5 h-9 text-sm font-medium border border-border bg-background px-3 rounded-lg hover:bg-muted transition-colors">
            <Ban className="w-3.5 h-3.5" /> Blacklist
          </button>
          <button onClick={handleDelete} className="inline-flex items-center gap-1.5 h-9 text-sm font-medium border border-destructive/30 bg-background text-destructive px-3 rounded-lg hover:bg-destructive/5 transition-colors">
            <Trash2 className="w-3.5 h-3.5" /> Löschen
          </button>
        </div>
      </div>

      {/* 3-Spalten-Layout */}
      <div className="grid lg:grid-cols-3 gap-5">

        {/* Linke Spalte: Firmendaten */}
        <div className="space-y-5">
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-4">
              <Building2 className="w-3.5 h-3.5" /> Firmendaten
            </h3>
            <div className="space-y-3">
              {company.ansprechpartner && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{company.ansprechpartner}</p>
                    <p className="text-xs text-muted-foreground">Ansprechpartner</p>
                  </div>
                </div>
              )}
              {company.adresse && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm">{company.adresse}</p>
                    <p className="text-xs text-muted-foreground">{company.plz} {company.ort}</p>
                    {company.entfernung_km && <p className="text-xs text-muted-foreground">{company.entfernung_km} km entfernt</p>}
                  </div>
                </div>
              )}
              {company.telefon && (
                <a href={`tel:${company.telefon}`} className="flex items-center gap-3 group">
                  <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                    <Phone className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-green-700 group-hover:underline">{company.telefon}</p>
                    <p className="text-xs text-muted-foreground">Telefon</p>
                  </div>
                </a>
              )}
              {company.email && (
                <a href={`mailto:${company.email}`} className="flex items-center gap-3 group">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-blue-700 group-hover:underline truncate">{company.email}</p>
                    <p className="text-xs text-muted-foreground">E-Mail</p>
                  </div>
                </a>
              )}
              {company.website && (
                <a href={company.website.startsWith("http") ? company.website : `https://${company.website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 group">
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                    <Globe className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-primary group-hover:underline truncate">{company.website}</p>
                    <p className="text-xs text-muted-foreground">Website</p>
                  </div>
                </a>
              )}
              {company.assigned_to && (
                <div className="flex items-center gap-3 pt-3 border-t border-border">
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{company.assigned_to}</p>
                    <p className="text-xs text-muted-foreground">Zuständiger Vertriebler</p>
                  </div>
                </div>
              )}
            </div>
            {company.aktueller_dienstleister && (
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Aktueller Dienstleister</p>
                <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  <span className="text-sm font-medium text-amber-800">🏢 {company.aktueller_dienstleister}</span>
                </div>
              </div>
            )}
          </div>

          {/* Notizen */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-3">
              <MessageSquare className="w-3.5 h-3.5" /> Notizen
            </h3>
            <textarea
              value={notizen}
              onChange={e => setNotizen(e.target.value)}
              rows={6}
              placeholder="Notizen hier eingeben..."
              className="w-full rounded-lg border border-input bg-muted/30 px-3 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
            />
            {notizen !== (company.notizen || "") && (
              <Button size="sm" onClick={handleSaveNotizen} disabled={notizenSaving} className="w-full mt-2">
                {notizenSaving ? "Speichert..." : "Speichern"}
              </Button>
            )}
          </div>
        </div>

        {/* Mittlere Spalte: Timeline */}
        <div className="lg:col-span-2 space-y-5">
          
          {/* Nächste Aktionen + KI-Vorschlag */}
          <div className="grid sm:grid-cols-2 gap-5">
            {/* Nächste Aktionen */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-4">
                <Target className="w-3.5 h-3.5" /> Nächste Aktionen
              </h3>
              <div className="space-y-3">
                {openTasks.length > 0 ? (
                  openTasks.slice(0, 3).map(task => {
                    const isOverdue = task.faellig_am && moment(task.faellig_am).isBefore(moment());
                    return (
                      <div key={task.id} className={`flex items-center gap-3 p-3 rounded-lg border ${isOverdue ? "bg-red-50 border-red-200" : "bg-muted/50 border-border"}`}>
                        <button onClick={() => toggleTask(task)} className="flex-shrink-0">
                          {task.erledigt
                            ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                            : <Circle className={`w-5 h-5 ${isOverdue ? "text-red-500" : "text-muted-foreground"}`} />
                          }
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${isOverdue ? "text-red-900" : ""}`}>{task.titel}</p>
                          {task.faellig_am && (
                            <p className={`text-xs ${isOverdue ? "text-red-600 font-medium" : "text-muted-foreground"}`}>
                              {isOverdue ? "Überfällig: " : ""}{moment(task.faellig_am).format("DD.MM.")}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-6">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                    <p className="text-sm font-medium text-foreground">Alle Aufgaben erledigt!</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Keine offenen Aufgaben</p>
                  </div>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowAddTask(true)} className="w-full mt-3 gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Neue Aufgabe
              </Button>
            </div>

            {/* KI-Vorschlag */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-4">
                <Lightbulb className="w-3.5 h-3.5" /> KI-Empfehlung
              </h3>
              {kiVorschlag && (
                <div className={`flex flex-col gap-3 p-4 rounded-lg border ${kiVorschlag.color}`}>
                  <div className="flex items-center gap-2">
                    <kiVorschlag.icon className="w-5 h-5" />
                    <span className="text-sm font-bold">{kiVorschlag.title}</span>
                  </div>
                  <p className="text-xs leading-relaxed">{kiVorschlag.description}</p>
                  {kiVorschlag.action && (
                    <div className="flex gap-2">
                      {kiVorschlag.action === "Anrufen" && company.telefon && (
                        <a href={`tel:${company.telefon}`} className="flex-1 text-center text-xs font-medium bg-white border border-current px-3 py-1.5 rounded hover:bg-muted/50 transition-colors">
                          📞 Anrufen
                        </a>
                      )}
                      {kiVorschlag.action === "E-Mail senden" && (
                        <button onClick={() => setShowKiDialog(true)} className="flex-1 text-center text-xs font-medium bg-white border border-current px-3 py-1.5 rounded hover:bg-muted/50 transition-colors">
                          ✉️ E-Mail
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
              <Button variant="outline" size="sm" onClick={() => setShowKiDialog(true)} className="w-full mt-3 gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Alle KI-Tipps
              </Button>
            </div>
          </div>

          {/* Kontakthistorie */}
          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
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
        </div>
      </div>

      {/* Dialogs */}
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

      <Dialog open={showKiDialog} onOpenChange={setShowKiDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-primary" /> KI-Empfehlungen
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className={`p-4 rounded-lg border ${kiVorschlag?.color || "bg-muted border-border"}`}>
              <div className="flex items-center gap-2 mb-2">
                {kiVorschlag && <kiVorschlag.icon className="w-5 h-5" />}
                <span className="text-sm font-bold">{kiVorschlag?.title || "Keine Empfehlung"}</span>
              </div>
              <p className="text-xs leading-relaxed">{kiVorschlag?.description || "Für diesen Lead gibt es aktuell keine dringende Empfehlung."}</p>
            </div>
            
            <div className="bg-muted/50 border border-border rounded-lg p-3">
              <p className="text-xs font-semibold mb-2">Gesprächseinstieg:</p>
              <p className="text-xs text-muted-foreground italic">
                "Guten Tag, hier ist [Ihr Name] von Vertriebo. Wir unterstützen lokale Dienstleister dabei, mehr Kunden zu gewinnen. Haben Sie gerade kurz Zeit?"
              </p>
            </div>

            <div className="bg-muted/50 border border-border rounded-lg p-3">
              <p className="text-xs font-semibold mb-2">Follow-up-Vorschlag:</p>
              <p className="text-xs text-muted-foreground">
                {company.status === "Neu" 
                  ? "Nach Erstkontakt: E-Mail mit Unterlagen senden und Termin vereinbaren."
                  : company.status === "Rückruf"
                  ? "Rückruf durchführen und Bedarf klären."
                  : company.status === "Angebot"
                  ? "Angebot nachfassen und Entscheidung einholen."
                  : "Regelmäßigen Kontakt halten und Beziehung pflegen."
                }
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AddContactLogDialog open={showAddLog} onClose={() => setShowAddLog(false)} companyId={id} companyName={company.name} onCreated={loadData} />
      <AddTaskDialog open={showAddTask} onClose={() => setShowAddTask(false)} companyId={id} companyName={company.name} onCreated={loadData} />
    </div>
  );
}