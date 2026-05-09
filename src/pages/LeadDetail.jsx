import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Building2, Phone, Mail, Globe, MapPin, User, Plus, History, ListTodo, Trash2, Ban,
  Sparkles, MessageSquare, CheckCircle2, Circle, Clock, ChevronRight, PhoneCall, Flame, Target,
  Lightbulb, Calendar, FileText, TrendingUp, Star
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import StatusBadge from "../components/StatusBadge";
import PriorityBadge from "../components/PriorityBadge";
import CallScriptDialog from "../components/CallScriptDialog";
import AddContactLogDialog from "../components/AddContactLogDialog";
import AddTaskDialog from "../components/AddTaskDialog";
import SendEmailDialog from "../components/SendEmailDialog";
import { toast } from "sonner";
import moment from "moment";

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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showBlacklistConfirm, setShowBlacklistConfirm] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [orgId, setOrgId] = useState(null);

  useEffect(() => { loadData(); }, [id]);

  const loadData = async () => {
    try {
      const me = await base44.auth.me();
      if (!me) { toast.error("Nicht angemeldet"); navigate("/"); return; }

      // Org-ID ermitteln (Mandantentrennung)
      let orgId = null;
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

      if (!orgId) { toast.error("Keine Organisation gefunden"); navigate("/"); return; }

      setCurrentUser(me);
      setOrgId(orgId);

      // Company mit Mandanten-Check laden
      const [comp, logs, allTasks] = await Promise.all([
        base44.entities.Company.filter({ id, organization_id: orgId }),
        base44.entities.ContactLog.filter({ company_id: id, organization_id: orgId }),
        base44.entities.Task.filter({ company_id: id, organization_id: orgId }),
      ]);

      if (!comp || comp.length === 0) {
        toast.error("Lead nicht gefunden oder kein Zugriff");
        navigate("/leads");
        return;
      }

      // sales_rep darf nur zugewiesene Leads sehen
      const loadedCompany = comp[0];
      if (me.role !== "admin" && me.role !== "organization_admin") {
        if (loadedCompany.assigned_to && loadedCompany.assigned_to !== me.email) {
          toast.error("Dieses Lead ist einem anderen Vertriebler zugewiesen");
          navigate("/leads");
          return;
        }
      }

      setCompany(loadedCompany);
      setNotizen(loadedCompany.notizen || "");
      setContactLogs(logs.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
      setTasks(allTasks.sort((a, b) => new Date(a.faellig_am || 0) - new Date(b.faellig_am || 0)));
      setLoading(false);
    } catch (error) {
      console.error("Fehler beim Laden:", error);
      toast.error("Fehler beim Laden der Daten");
      navigate("/leads");
    }
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
    await base44.entities.ContactLog.create({
      organization_id: orgId, company_id: id, typ: "Sonstiges", ergebnis: "Abgeschlossen",
      notiz: sonstigesNotiz, naechster_schritt: "Kunde meldet sich selbst", user_email: me.email,
    });
    await base44.entities.Company.update(id, { last_contact_date: new Date().toISOString() });
    toast.success("Notiz gespeichert"); setSonstigesSaving(false); setShowSonstigesDialog(false); setSonstigesNotiz(""); loadData();
  };

  const handleBlacklist = async () => {
    const currentOrgId = company.organization_id || orgId;
    await base44.entities.Blacklist.create({ organization_id: currentOrgId, firmenname: company.name, telefon: company.telefon, email: company.email, grund: "Manuell hinzugefügt" });
    await base44.entities.Company.update(id, { is_blacklisted: true, status: "Verloren" });
    toast.success("Firma auf Blacklist gesetzt");
    setShowBlacklistConfirm(false);
    navigate("/leads");
  };

  const handleDelete = async () => {
    await base44.entities.Company.delete(id);
    toast.success("Firma gelöscht");
    setShowDeleteConfirm(false);
    navigate("/leads");
  };

  const isAdmin = currentUser?.role === "admin" || currentUser?.role === "organization_admin";

  const handleEnrich = async () => {
    setEnriching(true);
    try {
      const currentOrgId = company.organization_id || orgId;
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout nach 30 Sekunden")), 30000));
      const res = await Promise.race([
        base44.functions.invoke("enrichCompany", { companyId: id, organization_id: currentOrgId }),
        timeoutPromise,
      ]);
      const data = res.data;
      if (data?.success === false) {
        toast.error("Anreichern fehlgeschlagen: " + (data?.error || "Unbekannter Fehler"));
      } else {
        const found = data?.found || 0;
        if (found > 0) {
          const enriched = [
            data?.telefon_added && "Telefon ergänzt",
            data?.website_added && "Website ergänzt",
            data?.adresse_added && "Adresse ergänzt",
            data?.ansprechpartner_added && "Ansprechpartner gefunden",
            data?.branche_added && "Branche erkannt",
          ].filter(Boolean);
          toast.success(enriched.length > 0 ? enriched.join(", ") : `${found} Felder automatisch ergänzt`);
          loadData();
        } else {
          toast.info("Keine zusätzlichen Daten gefunden.");
        }
      }
    } catch (e) {
      toast.error("Anreichern fehlgeschlagen: " + (e?.message || "Unbekannter Fehler"));
    } finally {
      setEnriching(false);
    }
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

  const openTasks = tasks.filter(t => !t.erledigt);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
    </div>
  );

  if (!company) return (
    <div className="text-center py-16">
      <p className="text-slate-600">Firma nicht gefunden</p>
      <Link to="/leads"><Button variant="outline" className="mt-4 bg-white border border-[#E2E8F0]">Zurück</Button></Link>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
        <div className={`h-1 w-full ${company.is_hot ? "bg-gradient-to-r from-orange-400 to-red-500" : "bg-gradient-to-r from-blue-500 to-blue-400"}`} />
        <div className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link to="/leads">
              <button className="p-2 rounded-lg hover:bg-slate-50 transition-colors">
                <ArrowLeft className="w-4 h-4 text-slate-600" />
              </button>
            </Link>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${company.is_hot ? "bg-orange-50 border-2 border-orange-200" : "bg-blue-50 border-2 border-blue-200"}`}>
              {company.is_hot ? <Flame className="w-6 h-6 text-orange-600" /> : <Building2 className="w-6 h-6 text-blue-600" />}
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 leading-tight">{company.name}</h1>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="text-sm font-medium text-slate-700">{company.branche || "Keine Branche"}</span>
                {company.ort && <span className="text-xs text-slate-500">· {company.ort}</span>}
                {company.last_contact_date && (
                  <span className="text-xs text-slate-500">· Letzter Kontakt: {moment(company.last_contact_date).fromNow()}</span>
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
            <a href={`tel:${company.telefon}`} className="inline-flex items-center gap-1.5 h-9 text-sm font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 rounded-lg hover:bg-emerald-100 transition-colors">
              <Phone className="w-4 h-4" /> Anrufen
            </a>
          )}
          <CallScriptDialog company={company} />
          <SendEmailDialog company={company} />
          <Button variant="outline" size="sm" onClick={() => setShowAddTask(true)} className="gap-1.5 bg-white border border-[#E2E8F0]">
            <Calendar className="w-3.5 h-3.5" /> Aufgabe
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowAddLog(true)} className="gap-1.5 bg-white border border-[#E2E8F0]">
            <MessageSquare className="w-3.5 h-3.5" /> Kontakt
          </Button>
          <button onClick={handleEnrich} disabled={enriching} className="inline-flex items-center gap-1.5 h-9 text-sm font-semibold border border-slate-200 px-3 rounded-lg transition-colors disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed enabled:bg-white enabled:hover:bg-slate-50">
            {enriching ? <span className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin inline-block" /> : <Sparkles className="w-3.5 h-3.5" />}
            Anreichern
          </button>
          <button onClick={() => setShowKiDialog(true)} className="inline-flex items-center gap-1.5 h-9 text-sm font-semibold border border-blue-200 bg-blue-50 text-blue-700 px-3 rounded-lg hover:bg-blue-100 transition-colors">
            <Lightbulb className="w-3.5 h-3.5" /> KI-Tipp
          </button>
          {isAdmin && (
            <>
              <button onClick={() => setShowBlacklistConfirm(true)} className="inline-flex items-center gap-1.5 h-9 text-sm font-semibold border border-[#E2E8F0] bg-white px-3 rounded-lg hover:bg-slate-50 transition-colors">
                <Ban className="w-3.5 h-3.5" /> Blacklist
              </button>
              <button onClick={() => setShowDeleteConfirm(true)} className="inline-flex items-center gap-1.5 h-9 text-sm font-semibold border border-red-200 bg-white text-red-600 px-3 rounded-lg hover:bg-red-50 transition-colors">
                <Trash2 className="w-3.5 h-3.5" /> Löschen
              </button>
            </>
          )}
        </div>
      </div>

      {/* 3-Spalten-Layout */}
      <div className="grid lg:grid-cols-3 gap-5">
        {/* Linke Spalte: Firmendaten */}
        <div className="space-y-5">
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-600 flex items-center gap-2 mb-4">
              <Building2 className="w-3.5 h-3.5" /> Firmendaten
            </h3>
            <div className="space-y-3">
              {company.ansprechpartner && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{company.ansprechpartner}</p>
                    <p className="text-xs text-slate-500">Ansprechpartner</p>
                  </div>
                </div>
              )}
              {company.adresse && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <MapPin className="w-4 h-4 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-900">{company.adresse}</p>
                    <p className="text-xs text-slate-500">{company.plz} {company.ort}</p>
                    {company.entfernung_km && <p className="text-xs text-slate-500">{company.entfernung_km} km entfernt</p>}
                  </div>
                </div>
              )}
              {company.telefon && (
                <a href={`tel:${company.telefon}`} className="flex items-center gap-3 group">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                    <Phone className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-emerald-700 group-hover:underline">{company.telefon}</p>
                    <p className="text-xs text-slate-500">Telefon</p>
                  </div>
                </a>
              )}
              {company.email && (
                <a href={`mailto:${company.email}`} className="flex items-center gap-3 group">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-blue-700 group-hover:underline truncate">{company.email}</p>
                    <p className="text-xs text-slate-500">E-Mail</p>
                  </div>
                </a>
              )}
              {company.website && (
                <a href={company.website.startsWith("http") ? company.website : `https://${company.website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 group">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <Globe className="w-4 h-4 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-blue-600 group-hover:underline truncate">{company.website}</p>
                    <p className="text-xs text-slate-500">Website</p>
                  </div>
                </a>
              )}
              {company.assigned_to && (
                <div className="flex items-center gap-3 pt-3 border-t border-[#E2E8F0]">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{company.assigned_to}</p>
                    <p className="text-xs text-slate-500">Zuständiger Vertriebler</p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Status & Priority */}
            <div className="mt-4 pt-4 border-t border-[#E2E8F0] flex items-center gap-2">
              <StatusBadge status={company.status} />
              <PriorityBadge priority={company.priority_score >= 60 ? "Hoch" : company.priority_score >= 30 ? "Mittel" : "Niedrig"} />
            </div>
            
            {company.aktueller_dienstleister && (
              <div className="mt-4 pt-4 border-t border-[#E2E8F0]">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-2">Aktueller Dienstleister</p>
                <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  <span className="text-sm font-semibold text-amber-800">🏢 {company.aktueller_dienstleister}</span>
                </div>
              </div>
            )}
          </div>

          {/* Notizen */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-600 flex items-center gap-2 mb-3">
              <MessageSquare className="w-3.5 h-3.5" /> Notizen
            </h3>
            <textarea
              value={notizen}
              onChange={e => setNotizen(e.target.value)}
              rows={5}
              placeholder="Notizen hier eingeben..."
              className="w-full rounded-lg border border-[#E2E8F0] bg-slate-50 px-3 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 resize-none"
            />
            {notizen !== (company.notizen || "") && (
              <Button size="sm" onClick={handleSaveNotizen} disabled={notizenSaving} className="w-full mt-2">
                {notizenSaving ? "Speichert..." : "Speichern"}
              </Button>
            )}
          </div>
        </div>

        {/* Mittlere + Rechte Spalte: Timeline + Aktionen */}
        <div className="lg:col-span-2 space-y-5">
          {/* Nächste Aktionen + KI */}
          <div className="grid sm:grid-cols-2 gap-5">
            {/* Aufgaben */}
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-600 flex items-center gap-2 mb-4">
                <Target className="w-3.5 h-3.5" /> Nächste Aktionen
              </h3>
              <div className="space-y-3">
                {openTasks.length > 0 ? (
                  openTasks.slice(0, 3).map(task => {
                    const isOverdue = task.faellig_am && moment(task.faellig_am).isBefore(moment());
                    return (
                      <div key={task.id} className={`flex items-center gap-3 p-3 rounded-lg border ${isOverdue ? "bg-red-50 border-red-200" : "bg-slate-50 border-[#E2E8F0]"}`}>
                        <button onClick={() => toggleTask(task)} className="flex-shrink-0">
                          {task.erledigt ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <Circle className={`w-5 h-5 ${isOverdue ? "text-red-500" : "text-slate-400"}`} />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold ${isOverdue ? "text-red-900" : "text-slate-900"}`}>{task.titel}</p>
                          {task.faellig_am && (
                            <p className={`text-xs ${isOverdue ? "text-red-600 font-bold" : "text-slate-500"}`}>
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
                    <p className="text-sm font-semibold text-slate-900">Alle Aufgaben erledigt!</p>
                    <p className="text-xs text-slate-500 mt-0.5">Keine offenen Aufgaben</p>
                  </div>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowAddTask(true)} className="w-full mt-3 gap-1.5 bg-white border border-[#E2E8F0]">
                <Plus className="w-3.5 h-3.5" /> Neue Aufgabe
              </Button>
            </div>

            {/* KI-Empfehlung */}
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-600 flex items-center gap-2 mb-4">
                <Lightbulb className="w-3.5 h-3.5" /> KI-Empfehlung
              </h3>
              <div className={`flex flex-col gap-3 p-4 rounded-lg border ${company.status === "Neu" ? "text-blue-700 bg-blue-50 border-blue-200" : "text-slate-700 bg-slate-50 border-slate-200"}`}>
                <div className="flex items-center gap-2">
                  {company.status === "Neu" ? <PhoneCall className="w-5 h-5" /> : <Lightbulb className="w-5 h-5" />}
                  <span className="text-sm font-bold">
                    {company.status === "Neu" ? "Erstkontakt herstellen" : "Weiterhin beobachten"}
                  </span>
                </div>
                <p className="text-xs leading-relaxed">
                  {company.status === "Neu" 
                    ? "Rufen Sie heute an und stellen Sie Ihr Unternehmen vor."
                    : "Kein dringender Handlungsbedarf. Lead im Auge behalten."}
                </p>
                {company.status === "Neu" && company.telefon && (
                  <a href={`tel:${company.telefon}`} className="text-center text-xs font-bold bg-white border border-current px-3 py-1.5 rounded hover:bg-slate-50 transition-colors">
                    📞 Anrufen
                  </a>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowKiDialog(true)} className="w-full mt-3 gap-1.5 bg-white border border-[#E2E8F0]">
                <Sparkles className="w-3.5 h-3.5" /> Alle KI-Tipps
              </Button>
            </div>
          </div>

          {/* Kontakthistorie */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Kontakthistorie</h3>
                {contactLogs.length > 0 && (
                  <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{contactLogs.length}</span>
                )}
              </div>
              <Button size="sm" variant="outline" className="text-xs gap-1.5 h-8 bg-white border border-[#E2E8F0]" onClick={() => setShowAddLog(true)}>
                <Plus className="w-3 h-3" /> Kontakt
              </Button>
            </div>

            <div className="divide-y divide-[#E2E8F0]">
              {contactLogs.map((log) => (
                <div key={log.id} className="px-5 py-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 text-base">
                      {log.typ === "Anruf" ? "📞" : log.typ === "E-Mail" ? "✉️" : log.typ === "Besuch" ? "🚶" : log.typ === "Termin" ? "📅" : log.typ === "Angebot" ? "📄" : "💬"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-slate-900">{log.typ}</span>
                          {log.ergebnis && (
                            <span className={`text-[10px] font-bold border px-2 py-0.5 rounded-full ${
                              log.ergebnis === "Erreicht" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                              log.ergebnis === "Nicht erreicht" ? "bg-red-50 text-red-600 border-red-200" :
                              log.ergebnis === "Rückruf vereinbart" ? "bg-amber-50 text-amber-700 border-amber-200" :
                              log.ergebnis === "Termin vereinbart" ? "bg-purple-50 text-purple-700 border-purple-200" :
                              log.ergebnis === "Angebot gesendet" ? "bg-blue-50 text-blue-700 border-blue-200" :
                              "bg-slate-100 text-slate-600 border-slate-200"
                            }`}>
                              {log.ergebnis}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-slate-500 flex-shrink-0">{moment(log.created_date).format("DD.MM.YY HH:mm")}</span>
                      </div>
                      {log.notiz && <p className="text-sm text-slate-900 mt-1.5 leading-relaxed">{log.notiz}</p>}
                      {log.naechster_schritt && (
                        <p className="text-xs font-semibold text-slate-700 mt-1 flex items-center gap-1">
                          <ChevronRight className="w-3 h-3" /> {log.naechster_schritt}
                        </p>
                      )}
                      {log.user_email && <p className="text-[10px] text-slate-500 mt-1.5">{log.user_email}</p>}
                    </div>
                  </div>
                </div>
              ))}
              {contactLogs.length === 0 && (
                <div className="px-5 py-10 text-center">
                  <PhoneCall className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="text-sm text-slate-600">Noch kein Kontakt dokumentiert</p>
                  <button onClick={() => setShowAddLog(true)} className="mt-2 text-xs font-semibold text-blue-600 hover:underline">Kontakt hinzufügen</button>
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
              <MessageSquare className="w-4 h-4 text-blue-600" /> Sonstiges – Notiz erfassen
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600 -mt-1">{company?.name}</p>
          <div className="space-y-3 pt-1">
            <div>
              <Label className="text-xs font-semibold mb-1 block">Was kam beim Anruf raus?</Label>
              <textarea
                value={sonstigesNotiz}
                onChange={e => setSonstigesNotiz(e.target.value)}
                placeholder="z.B. Möchten nur eine E-Mail mit Kontaktdaten..."
                rows={4} autoFocus
                className="w-full rounded-md border border-[#E2E8F0] bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 resize-none"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowSonstigesDialog(false)} className="text-sm px-3 py-1.5 rounded-md border border-[#E2E8F0] bg-white hover:bg-slate-50 transition-colors">Abbrechen</button>
              <button onClick={handleSonstigesSubmit} disabled={sonstigesSaving || !sonstigesNotiz.trim()} className="text-sm px-4 py-1.5 rounded-md bg-blue-600 text-white font-semibold disabled:opacity-50 transition-colors">
                {sonstigesSaving ? "Speichert..." : "Speichern"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showKiDialog} onOpenChange={setShowKiDialog}>
        <DialogContent className="max-w-md bg-white border border-slate-200 shadow-xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <Lightbulb className="w-4 h-4 text-blue-600" /> KI-Empfehlungen
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className={`p-4 rounded-lg border ${company.status === "Neu" ? "text-blue-700 bg-blue-50 border-blue-200" : "text-slate-700 bg-slate-50 border-slate-200"}`}>
              <div className="flex items-center gap-2 mb-2">
                {company.status === "Neu" ? <PhoneCall className="w-5 h-5" /> : <Lightbulb className="w-5 h-5" />}
                <span className="text-sm font-bold">{company.status === "Neu" ? "Erstkontakt herstellen" : "Weiterhin beobachten"}</span>
              </div>
              <p className="text-xs leading-relaxed">
                {company.status === "Neu" 
                  ? "Rufen Sie heute an und stellen Sie Ihr Unternehmen vor. Nutzen Sie den Branchen-Einstieg."
                  : "Für diesen Lead gibt es aktuell keine dringende Empfehlung."}
              </p>
            </div>
            
            <div className="bg-slate-50 border border-[#E2E8F0] rounded-lg p-3">
              <p className="text-xs font-bold mb-2">Gesprächseinstieg:</p>
              <p className="text-xs text-slate-600 italic">
                "Guten Tag, hier ist [Ihr Name] von Vertriebo. Wir unterstützen lokale Dienstleister dabei, mehr Kunden zu gewinnen. Haben Sie gerade kurz Zeit?"
              </p>
            </div>

            <div className="bg-slate-50 border border-[#E2E8F0] rounded-lg p-3">
              <p className="text-xs font-bold mb-2">Follow-up-Vorschlag:</p>
              <p className="text-xs text-slate-600">
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

      {/* Blacklist Confirm */}
      <Dialog open={showBlacklistConfirm} onOpenChange={setShowBlacklistConfirm}>
        <DialogContent className="max-w-sm bg-white border border-slate-200 shadow-xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <Ban className="w-4 h-4 text-amber-600" /> Auf Blacklist setzen?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            <strong className="text-slate-900">{company?.name}</strong> wird auf die Blacklist gesetzt und als „Verloren" markiert. Diese Aktion kann manuell rückgängig gemacht werden.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowBlacklistConfirm(false)} className="bg-white text-slate-700 border-slate-300">Abbrechen</Button>
            <Button onClick={handleBlacklist} className="bg-amber-600 hover:bg-amber-700 text-white">Blacklist setzen</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-sm bg-white border border-slate-200 shadow-xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <Trash2 className="w-4 h-4 text-red-600" /> Firma löschen?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            <strong className="text-slate-900">{company?.name}</strong> wird dauerhaft gelöscht. Alle zugehörigen Aufgaben und Kontaktlogs bleiben erhalten.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)} className="bg-white text-slate-700 border-slate-300">Abbrechen</Button>
            <Button onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white">Endgültig löschen</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}