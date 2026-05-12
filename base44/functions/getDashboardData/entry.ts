import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Organisation ermitteln
    let org = null;
    const orgs = await base44.entities.Organization.filter({ owner_email: user.email });
    org = orgs?.[0] || null;

    if (!org) {
      const memberships = await base44.entities.OrganizationMember.filter({ user_email: user.email, status: "active" });
      if (memberships?.[0]?.organization_id) {
        const memberOrgs = await base44.entities.Organization.filter({ id: memberships[0].organization_id });
        org = memberOrgs?.[0] || null;
      }
    }

    if (!org) {
      return Response.json({ error: 'No organization found' }, { status: 404 });
    }

    const orgId = org.id;
    const isAdmin = user.role === "admin";

    // Blacklist laden für Filter
    const blacklist = await base44.entities.Blacklist.filter({ organization_id: orgId });
    const blacklistNames = blacklist.map(b => b.firmenname?.toLowerCase().trim());

    // Helper: Blacklist-Check
    const isBlacklisted = (companyName) => {
      if (!companyName) return false;
      const normalized = companyName.toLowerCase().trim();
      return blacklistNames.some(bl => normalized.includes(bl) || bl.includes(normalized));
    };

    // Companies laden (nur relevante Felder für Dashboard)
    const allCompanies = await base44.entities.Company.filter({ organization_id: orgId }, "-created_date", 500);
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

    const hotLeads = companies
      .filter(c => c.is_hot || c.priority_score > 70)
      .slice(0, 5);

    const recentActivities = companies.slice(0, 5);

    const newLeadsFromResearch = companies.filter(c => c.research_run_id);

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

    return Response.json({
      org,
      user: {
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        org,
      },
      stats: {
        pipelineStats,
        hotLeadsCount: hotLeads.length,
        todayTasksCount: todayTasks.length,
        overdueTasksCount: overdueTasks.length,
        contactsThisWeek,
        weeklyGoal: 20,
        newLeadsFromResearchCount: newLeadsFromResearch.length,
      },
      data: {
        hotLeads,
        todayTasks,
        overdueTasks,
        recentActivities,
        newLeadsFromResearch,
      },
      meta: {
        totalCompanies: companies.length,
        totalTasks: tasks.length,
        loadedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});