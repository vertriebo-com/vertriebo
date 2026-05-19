import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ── Rollenauflösung ────────────────────────────────────────────────────
    const isPlatformAdmin = ["admin", "platform_owner", "platform_admin", "support_agent", "readonly_support"].includes(user.role);

    // org_id aus Request-Body lesen (vom Frontend explizit übergeben)
    let requestedOrgId = null;
    try {
      const body = await req.json();
      requestedOrgId = body?.org_id || null;
    } catch {}

    // Organisation ermitteln + Zugehörigkeit validieren
    let org = null;
    let memberRecord = null;

    const [ownerOrgs, memberships] = await Promise.all([
      base44.entities.Organization.filter({ owner_email: user.email }),
      base44.entities.OrganizationMember.filter({ user_email: user.email, status: "active" }),
    ]);

    if (requestedOrgId) {
      // Explizite org_id: Sicherheitscheck – User muss Owner, Member oder PlatformAdmin sein
      const isOwner = ownerOrgs.some(o => o.id === requestedOrgId);
      const memberEntry = memberships.find(m => m.organization_id === requestedOrgId);
      if (isOwner || memberEntry || isPlatformAdmin) {
        const targetOrgs = await base44.asServiceRole.entities.Organization.filter({ id: requestedOrgId });
        org = targetOrgs?.[0] || null;
        memberRecord = memberEntry || null;
      } else {
        return Response.json({ error: 'Forbidden: no access to this organization' }, { status: 403 });
      }
    } else {
      // Fallback: automatische Org-Auflösung (identisch zu useLeadsFilter)
      org = ownerOrgs?.[0] || null;

      if (!org && memberships?.[0]?.organization_id) {
        const memberOrgs = await base44.entities.Organization.filter({ id: memberships[0].organization_id });
        org = memberOrgs?.[0] || null;
        memberRecord = memberships[0];
      }

      // Platform-Admin ohne eigene Org: erste Org (Support-Ansicht)
      if (!org && isPlatformAdmin) {
        const anyOrg = await base44.asServiceRole.entities.Organization.list("-created_date", 1);
        org = anyOrg?.[0] || null;
      }
    }

    if (!org) {
      return Response.json({ error: 'No organization found' }, { status: 404 });
    }

    const orgId = org.id;
    const isOrgOwner = org.owner_email === user.email;
    const memberRole = memberRecord?.role || null; // 'organization_admin' | 'sales_rep' | null
    const isOrgAdmin = isPlatformAdmin || isOrgOwner || memberRole === 'organization_admin';
    const isSalesRep = !isOrgAdmin && memberRole === 'sales_rep';
    // Legacy-kompatibel: isAdmin = org-weiter Zugriff
    const isAdmin = isOrgAdmin;

    // Blacklist laden für Filter
    const blacklist = await base44.entities.Blacklist.filter({ organization_id: orgId });
    const blacklistNames = blacklist.map(b => b.firmenname?.toLowerCase().trim());

    // Helper: Blacklist-Check
    const isBlacklisted = (companyName) => {
      if (!companyName) return false;
      const normalized = companyName.toLowerCase().trim();
      return blacklistNames.some(bl => normalized.includes(bl) || bl.includes(normalized));
    };

    // Companies laden - alle aktiven (kein 500er-Limit damit Zähler mit Leads-Page übereinstimmen)
    const allCompanies = await base44.entities.Company.filter({ organization_id: orgId }, "-created_date", 2000);
    const companies = allCompanies.filter(c => !isBlacklisted(c.name));

    // Tasks laden
    const allTasks = await base44.entities.Task.filter({ organization_id: orgId }, "-faellig_am", 100);
    const tasks = isAdmin ? allTasks : allTasks.filter(t => t.assigned_to === user.email);

    // Dashboard-Statistiken serverseitig aggregieren
    const openTasks = tasks.filter(t => !t.erledigt);
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const todayTasks = openTasks.filter(t => {
      if (!t.faellig_am) return false;
      const dueDate = new Date(t.faellig_am);
      return dueDate >= todayStart && dueDate < todayEnd;
    });

    const overdueTasks = openTasks.filter(t => {
      if (!t.faellig_am) return false;
      return new Date(t.faellig_am) < todayStart;
    });

    // KANONISCHE LOGIK – identisch zu utils/leadTemperature.js getLeadTemperature():
    // 1. Primär: lead_temperature ('hot' | 'warm' | 'cold')
    // 2. Fallback: lead_temperature_score >= 60 ODER priority_score >= 60
    // 3. Legacy-Fallback: is_hot === true
    const getLeadTemperatureCanonical = (c) => {
      const temp = c.lead_temperature;
      if (temp && ['hot', 'warm', 'cold'].includes(temp)) return temp;
      const score = (c.lead_temperature_score != null ? c.lead_temperature_score : 0) || (c.priority_score || 0);
      if (score >= 60) return 'hot';
      if (score >= 30) return 'warm';
      if (c.is_hot === true) return 'hot';
      return 'unknown';
    };

    const hotLeads = companies
      .filter(c => getLeadTemperatureCanonical(c) === 'hot')
      .sort((a, b) => {
        const scoreA = a.lead_temperature_score || a.priority_score || 0;
        const scoreB = b.lead_temperature_score || b.priority_score || 0;
        return scoreB - scoreA;
      })
      .slice(0, 5);

    const recentActivities = companies.slice(0, 5);

    // Nur wirklich neue Leads aus den letzten 24h für den Banner
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const newLeadsFromResearch = companies.filter(c => c.research_run_id && c.created_date >= last24h);

    // ── Actionable Leads für "Heute wichtig" ────────────────────────────────
    // WHY: Dashboard soll konkrete tagesaktuelle Handlungen zeigen, nicht nur Zahlen.
    // LOGIC: Priorisierung: 1. Tasks (überfällig/heute) → 2. heiße Leads → 3. warme + next_best_action
    //        → 4. Neue ohne Aufgabe → 5. Leads mit hohem Score ohne Kontakt
    // EVIDENCE: engine_analysis_json, lead_temperature, lead_temperature_score, status, tasks, telefon/email

    // Task-Lookup: Welche Companies haben offene Tasks?
    const tasksByCompanyId = {};
    for (const t of openTasks) {
      if (t.company_id && !t.erledigt) {
        if (!tasksByCompanyId[t.company_id]) tasksByCompanyId[t.company_id] = [];
        tasksByCompanyId[t.company_id].push(t);
      }
    }

    // Überfällige/Heute-Tasks → als Aktionen
    const overdueActionItems = overdueTasks.slice(0, 3).map(t => ({
      type: 'task_overdue',
      company_id: t.company_id || null,
      company_name: t.company_name || t.titel,
      action: t.typ || 'Aufgabe',
      reason: `Überfällig seit ${t.faellig_am ? new Date(t.faellig_am).toLocaleDateString('de-DE', { day:'2-digit', month:'2-digit' }) : '?'}`,
      priority: 0,
      task_id: t.id,
    }));

    const todayActionItems = todayTasks.slice(0, 3).map(t => ({
      type: 'task_today',
      company_id: t.company_id || null,
      company_name: t.company_name || t.titel,
      action: t.typ || 'Aufgabe',
      reason: 'Heute fällig',
      priority: 1,
      task_id: t.id,
    }));

    // Company-basierte Aktionen (ohne Task-Duplikate)
    const companiesWithTasks = new Set(Object.keys(tasksByCompanyId));

    const companyActionItems = [];
    const activeStatuses = ['Neu', 'Kontakt', 'Rückruf', 'Termin', 'Angebot'];

    for (const company of companies) {
      if (!activeStatuses.includes(company.status)) continue;
      if (company.is_blacklisted) continue;
      if (companyActionItems.length >= 8) break;

      // Engine-Daten parsen + next_best_action normalisieren
      // next_best_action kann sein: string (legacy) | { title, reason, type } (engine v2)
      let engineData = null;
      try {
        if (company.engine_analysis_json) engineData = JSON.parse(company.engine_analysis_json);
      } catch {}

      const rawNba = engineData?.next_best_action || company.next_best_action || null;
      let nbaTitle = null, nbaReason = null, nbaType = null;
      if (rawNba) {
        if (typeof rawNba === 'string') {
          nbaTitle = rawNba;
        } else if (typeof rawNba === 'object') {
          nbaTitle = rawNba.title || rawNba.action || null;
          nbaReason = rawNba.reason || null;
          nbaType = rawNba.type || null;
        }
      }

      const leadTemp = getLeadTemperatureCanonical(company); // kanonisch aufgelöst
      const hasContact = !!(company.telefon || company.email);

      // Heiße Leads ohne Task - KANONISCHE LOGIK (identisch zu getLeadTemperatureCanonical oben)
      const isHot = getLeadTemperatureCanonical(company) === 'hot';
      if (isHot && !companiesWithTasks.has(company.id)) {
        const action = nbaTitle || (company.telefon ? 'Anrufen' : company.email ? 'E-Mail senden' : 'Recherchieren');
        companyActionItems.push({
          type: 'hot_lead',
          company_id: company.id,
          company_name: company.name,
          action,
          reason: nbaReason || 'Heißer Lead',
          action_type: nbaType || null,
          priority: 2,
          lead_temperature: leadTemp,
          has_contact: hasContact,
        });
        continue;
      }

      // Warme Leads mit next_best_action
      if (leadTemp === 'warm' && nbaTitle && !companiesWithTasks.has(company.id)) {
        companyActionItems.push({
          type: 'warm_lead_action',
          company_id: company.id,
          company_name: company.name,
          action: nbaTitle,
          reason: nbaReason || 'Warmer Lead mit Empfehlung',
          action_type: nbaType || null,
          priority: 3,
          lead_temperature: leadTemp,
          has_contact: hasContact,
        });
        continue;
      }

      // Rückruf-Status ohne offene Task → Nachfassen
      if (company.status === 'Rückruf' && !companiesWithTasks.has(company.id)) {
        companyActionItems.push({
          type: 'callback_pending',
          company_id: company.id,
          company_name: company.name,
          action: 'Rückruf durchführen',
          reason: 'Rückruf ausstehend',
          priority: 3,
          lead_temperature: leadTemp,
          has_contact: hasContact,
        });
        continue;
      }

      // Neue Leads mit gutem Score, kontaktierbar, keine Task
      if (company.status === 'Neu' && hasContact && (company.relevance_score || 0) >= 65 && !companiesWithTasks.has(company.id)) {
        const action = company.telefon ? 'Erstgespräch führen' : 'E-Mail vorbereiten';
        companyActionItems.push({
          type: 'new_contactable',
          company_id: company.id,
          company_name: company.name,
          action,
          reason: `Neuer Lead · ${company.branche || 'Dienstleister'}`,
          priority: 4,
          lead_temperature: leadTemp,
          has_contact: hasContact,
        });
      }
    }

    // Alle Action Items zusammenführen, sortieren und auf 6 begrenzen
    const allActionItems = [
      ...overdueActionItems,
      ...todayActionItems,
      ...companyActionItems.sort((a, b) => a.priority - b.priority),
    ].slice(0, 6);

    // Pipeline-Statistiken
    const pipelineStats = {
      neu: companies.filter(c => c.status === "Neu").length,
      kontakt: companies.filter(c => c.status === "Kontakt").length,
      rueckruf: companies.filter(c => c.status === "Rückruf").length,
      termin: companies.filter(c => c.status === "Termin").length,
      angebot: companies.filter(c => c.status === "Angebot").length,
      gewonnen: companies.filter(c => c.status === "Gewonnen").length,
    };

    // Weekly progress
    const contactsThisWeek = companies.filter(c => {
      if (!c.last_contact_date) return false;
      return new Date(c.last_contact_date) >= weekStart;
    }).length;

    // Weekly goal aus OrganizationSettings laden
    const allSettings = await base44.entities.OrganizationSettings.filter({ organization_id: orgId });
    const settingsMap = {};
    allSettings.forEach(s => { settingsMap[s.key] = s.value; });
    const weeklyGoal = parseInt(settingsMap['weekly_contact_goal'] || '20', 10);

    // Current month usage log laden für Usage-Banner
    // KANONISCH: Kalendermonat Europe/Berlin (YYYY-MM) – identisch zu processResearchRun.getPeriodMonth()
    // NICHT UTC-basiert (now.getUTCMonth), da UsageLog-Writes auch Europe/Berlin nutzen.
    const periodMonth = new Intl.DateTimeFormat('de-DE', {
      timeZone: 'Europe/Berlin',
      year: 'numeric',
      month: '2-digit',
    }).format(now).split('.').reverse().join('-');
    const usageLogs = await base44.entities.UsageLog.filter({ organization_id: orgId, period_month: periodMonth });
    const usageLog = usageLogs?.[0] || {};

    // Plan laden für max_leads_per_month
    const plan = org.plan_id ? (await base44.entities.Plan.filter({ id: org.plan_id }))?.[0] : null;

    return Response.json({
      org,
      user: {
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        org_role: isOrgAdmin ? 'organization_admin' : (isSalesRep ? 'sales_rep' : null),
        is_platform_admin: isPlatformAdmin,
        is_org_admin: isOrgAdmin,
        org,
      },
      stats: {
        pipelineStats,
        hotLeadsCount: hotLeads.length,
        todayTasksCount: todayTasks.length,
        overdueTasksCount: overdueTasks.length,
        contactsThisWeek,
        weeklyGoal,
        newLeadsFromResearchCount: newLeadsFromResearch.length,
      },
      data: {
        hotLeads,
        todayTasks,
        overdueTasks,
        recentActivities,
        newLeadsFromResearch,
        actionableLeads: allActionItems,
      },
      meta: {
        totalCompanies: allCompanies.length, // Ohne Blacklist-Filter = echte Gesamtzahl wie in Leads Page
        totalTasks: tasks.length,
        loadedAt: new Date().toISOString(),
        currentUsage: {
          leads_created: usageLog.leads_created || 0,
        },
        maxContacts: plan?.max_leads_per_month || 300,
        planName: plan?.name || null,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});