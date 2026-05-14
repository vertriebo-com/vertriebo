/**
 * analyzeLeadEngine – Backend Engine Persistierung
 * 
 * SOURCE OF TRUTH (Temp): Keep in sync with src/utils/analyzeLeadTemperature.js
 * 
 * Funktion: Analysiert Leads mit der Vertriebo Engine und speichert Ergebnisse.
 * 
 * Mandantenregeln (CRITICAL):
 * - Jede Company: id + organization_id laden
 * - ContactLogs: company_id + organization_id filtern
 * - Tasks: company_id + organization_id filtern
 * - Company update: nur der Organisation gehörend
 * - Kein Cross-Tenant
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ═══════════════════════════════════════════════════════════════════════════════
// ENGINE CORE (kopiert von Frontend, TODO: langfristig in gemeinsame Lib auslagern)
// ═══════════════════════════════════════════════════════════════════════════════

function buildLeadContext(company, contactLogs, tasks) {
  const now = new Date();
  const today = now.toISOString().split('T')[0];

  const logs = (contactLogs || [])
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
  const lastLog = logs[0] || null;
  const firstLog = logs[logs.length - 1] || null;

  const allTasks = (tasks || []);
  const openTasks = allTasks.filter(t => !t.erledigt);
  const todayTasks = openTasks.filter(t => t.faellig_am && t.faellig_am.startsWith(today));
  const callbackTasks = openTasks.filter(t => t.typ === "Rückruf");
  const appointmentTasks = openTasks.filter(t => t.typ === "Termin");
  const overdueTasks = openTasks.filter(t => {
    const dueDate = new Date(t.faellig_am);
    return t.faellig_am && dueDate < now && !t.faellig_am.startsWith(today);
  });

  const contactResultCounts = {
    reached: logs.filter(l => l.ergebnis === "Erreicht").length,
    notReached: logs.filter(l => l.ergebnis === "Nicht erreicht").length,
    callbackScheduled: logs.filter(l => l.ergebnis === "Rückruf vereinbart").length,
    appointmentScheduled: logs.filter(l => l.ergebnis === "Termin vereinbart").length,
    offerSent: logs.filter(l => l.ergebnis === "Angebot gesendet").length,
  };

  const daysSinceLastContact = lastLog 
    ? Math.floor((now - new Date(lastLog.created_date)) / (1000 * 60 * 60 * 24))
    : null;

  return {
    companyId: company.id,
    organizationId: company.organization_id,
    name: company.name,
    branche: company.branche,
    ort: company.ort,
    status: company.status,
    hasPhone: Boolean(company.telefon),
    hasEmail: Boolean(company.email),
    hasWebsite: Boolean(company.website),
    hasContactPerson: Boolean(company.ansprechpartner),
    matchedTargetCustomerType: company.matched_target_customer_type,
    relevanceScore: company.priority_score || 0,
    relevanceReason: company.relevance_reason,
    logs,
    lastLog,
    firstLog,
    contactResultCounts,
    daysSinceLastContact,
    hasAnyContact: logs.length > 0,
    hasSuccessfulContact: contactResultCounts.reached > 0 || contactResultCounts.callbackScheduled > 0 || contactResultCounts.appointmentScheduled > 0 || contactResultCounts.offerSent > 0,
    hasOnlyFailedContact: logs.length > 0 && contactResultCounts.notReached > 0 && contactResultCounts.reached === 0,
    todayTasks,
    callbackTasks,
    appointmentTasks,
    overdueTasks,
    now,
    today,
  };
}

function detectBuyingSignals(context) {
  const signals = [];
  
  if (context.status === "Angebot") {
    signals.push({
      type: "offer_requested",
      label: "Angebot angefragt",
      weight: 30,
      evidence: "Status: Angebot",
    });
  }
  if (context.status === "Termin") {
    signals.push({
      type: "appointment_scheduled",
      label: "Termin vereinbart",
      weight: 35,
      evidence: "Status: Termin",
    });
  }
  
  if (context.todayTasks.length > 0) {
    signals.push({
      type: "callback_due_today",
      label: "Rückruf heute",
      weight: 20,
      evidence: `${context.todayTasks.length} Aufgabe(n) heute fällig`,
    });
  }
  
  if (context.appointmentTasks.length > 0) {
    signals.push({
      type: "appointment_scheduled",
      label: "Termin vereinbart",
      weight: 35,
      evidence: `${context.appointmentTasks.length} Termin(e) gebucht`,
    });
  }
  
  if (context.lastLog?.ergebnis === "Termin vereinbart") {
    signals.push({
      type: "appointment_scheduled",
      label: "Termin vereinbart",
      weight: 35,
      evidence: "Letzter Kontakt: Termin vereinbart",
    });
  }
  if (context.lastLog?.ergebnis === "Angebot gesendet") {
    signals.push({
      type: "offer_sent",
      label: "Angebot versendet",
      weight: 25,
      evidence: "Angebot versendet",
    });
  }
  if (context.lastLog?.ergebnis === "Rückruf vereinbart") {
    signals.push({
      type: "callback_scheduled",
      label: "Rückruf geplant",
      weight: 18,
      evidence: "Rückruf vereinbart",
    });
  }
  if (context.lastLog?.ergebnis === "Erreicht" && context.lastLog.notiz) {
    signals.push({
      type: "successful_contact",
      label: "Erfolgreich kontaktiert",
      weight: 22,
      evidence: `Erfolgreich kontaktiert${context.daysSinceLastContact <= 7 ? " (kürzlich)" : ""}`,
    });
  }
  
  if (context.matchedTargetCustomerType) {
    signals.push({
      type: "matched_target_customer",
      label: "Passende Branche",
      weight: 14,
      evidence: `Passt zu Zielgruppe${context.branche ? ` (${context.branche})` : ""}`,
    });
  }
  
  if (context.hasContactPerson) {
    signals.push({
      type: "contact_person_known",
      label: "Ansprechpartner bekannt",
      weight: 12,
      evidence: "Ansprechpartner bekannt",
    });
  }
  
  if (context.hasPhone) {
    signals.push({
      type: "phone_available",
      label: "Telefonnummer vorhanden",
      weight: 8,
      evidence: "Telefonnummer vorhanden",
    });
  }
  
  if (context.hasEmail) {
    signals.push({
      type: "email_available",
      label: "E-Mail vorhanden",
      weight: 6,
      evidence: "E-Mail vorhanden",
    });
  }
  
  if (context.hasWebsite) {
    signals.push({
      type: "website_available",
      label: "Website vorhanden",
      weight: 5,
      evidence: "Website vorhanden",
    });
  }
  
  return signals;
}

function detectRiskSignals(context) {
  const risks = [];
  
  if (context.status === "Verloren") {
    risks.push({
      type: "status_lost",
      label: "Status: Verloren",
      weight: -50,
      evidence: "Lead wurde als Verloren markiert",
    });
  }
  
  if (!context.hasAnyContact) {
    risks.push({
      type: "no_contact_logs",
      label: "Kein Kontakt dokumentiert",
      weight: -8,
      evidence: "Noch kein Kontakt dokumentiert",
    });
  } else if (context.hasOnlyFailedContact) {
    risks.push({
      type: "not_reached_only",
      label: "Nur nicht erreicht",
      weight: -10,
      evidence: `${context.contactResultCounts.notReached}x nicht erreicht`,
    });
  }
  
  if (!context.hasPhone) {
    risks.push({
      type: "missing_phone",
      label: "Telefonnummer fehlt",
      weight: -20,
      evidence: "Telefonnummer fehlt",
    });
  }
  
  if (!context.hasEmail) {
    risks.push({
      type: "missing_email",
      label: "E-Mail fehlt",
      weight: -6,
      evidence: "E-Mail fehlt",
    });
  }
  
  if (!context.hasContactPerson) {
    risks.push({
      type: "unknown_decision_maker",
      label: "Entscheider unbekannt",
      weight: -10,
      evidence: "Ansprechpartner/Entscheider unbekannt",
    });
  }
  
  if (!context.matchedTargetCustomerType) {
    risks.push({
      type: "unclear_fit",
      label: "Zielgruppen-Match unklar",
      weight: -16,
      evidence: "Zielgruppen-Match noch nicht bestätigt",
    });
  }
  
  if (context.overdueTasks.length > 0) {
    risks.push({
      type: "overdue_tasks",
      label: "Überfällige Aufgaben",
      weight: -12,
      evidence: `${context.overdueTasks.length} überfällige Aufgabe(n)`,
    });
  }
  
  if (context.daysSinceLastContact && context.daysSinceLastContact > 60) {
    risks.push({
      type: "very_old_no_activity",
      label: "Sehr alter Kontakt, keine Aktivität",
      weight: -15,
      evidence: `Letzter Kontakt vor ${context.daysSinceLastContact} Tagen`,
    });
  }
  
  return risks;
}

function detectMissingData(context) {
  const missing = [];
  if (!context.hasContactPerson) missing.push("Ansprechpartner");
  if (!context.hasPhone) missing.push("Telefonnummer");
  if (!context.hasEmail) missing.push("E-Mail");
  if (!context.hasWebsite) missing.push("Website");
  if (!context.matchedTargetCustomerType) missing.push("Zielgruppen-Bestätigung");
  if (!context.logs.some(l => l.notiz && l.notiz.toLowerCase().includes("bedarf"))) {
    missing.push("Konkreter Bedarf");
  }
  if (!context.logs.some(l => l.notiz && l.notiz.toLowerCase().includes("entscheid"))) {
    missing.push("Entscheiderrolle");
  }
  return missing;
}

function calculateTemperatureScore(context, buyingSignals, riskSignals, missingData) {
  let score = 50;
  buyingSignals.forEach(s => { score += s.weight; });
  riskSignals.forEach(r => { score += r.weight; });
  score -= missingData.length * 3;
  if (context.todayTasks.some(t => t.typ === "Rückruf")) {
    score += 5;
  }
  return Math.max(0, Math.min(100, score));
}

function classifyTemperature(score, context, buyingSignals, riskSignals) {
  const hasNegativeStatus = context.status === "Verloren";
  const hasNotInterested = context.lastLog?.ergebnis === "Kein Interesse";
  const isWrongTargetGroup = !context.matchedTargetCustomerType && context.relevanceScore < 20;

  if (hasNegativeStatus || hasNotInterested || isWrongTargetGroup) {
    return "Cold";
  }

  const hasRealBuyingSignal = buyingSignals.some(s => 
    ["offer_requested", "appointment_scheduled", "offer_sent", "callback_scheduled"].includes(s.type)
  );

  if (score >= 70 && hasRealBuyingSignal) {
    return "Hot";
  }

  if (score >= 70 && !hasRealBuyingSignal) {
    return "Warm";
  }

  if (score >= 50) {
    return "Warm";
  }

  return "Cold";
}

function buildFirstContactSummary(contactLogs) {
  if (!contactLogs || contactLogs.length === 0) {
    return "Noch kein qualifizierter Erstkontakt dokumentiert.";
  }

  const logs = contactLogs
    .sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
  const firstLog = logs[0];

  if (firstLog.ergebnis === "Nicht erreicht") {
    return "Bisheriger Kontaktversuch: nicht erreicht. Es wurde noch kein Bedarf oder Ansprechpartner bestätigt.";
  }

  if (firstLog.notiz) {
    const shortNote = firstLog.notiz.split('\n')[0].substring(0, 80);
    return `${firstLog.typ}: ${firstLog.ergebnis}. "${shortNote}${firstLog.notiz.length > 80 ? '…' : ''}"`;
  }

  return `${firstLog.typ}: ${firstLog.ergebnis}`;
}

function buildLastContactSummary(contactLogs) {
  if (!contactLogs || contactLogs.length === 0) {
    return null;
  }

  const logs = contactLogs
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
  const lastLog = logs[0];

  if (lastLog.notiz) {
    const shortNote = lastLog.notiz.split('\n')[0].substring(0, 80);
    return `${lastLog.typ}: ${lastLog.ergebnis}. "${shortNote}${lastLog.notiz.length > 80 ? '…' : ''}"`;
  }

  return `${lastLog.typ}: ${lastLog.ergebnis}`;
}

function buildTemperatureReason(context, temperature, buyingSignals, riskSignals, score) {
  if (temperature === "Hot") {
    if (context.status === "Angebot") {
      return "Angebot wurde angefragt. Jetzt zeitnah nachfassen und Entscheidungsprozess voranbringen.";
    }
    if (context.status === "Termin") {
      return "Termin ist vereinbart. Vorbereitung durchführen und Abschluss vorbereiten.";
    }
    if (buyingSignals.length > 0) {
      const signal = buyingSignals[0];
      return `${signal.evidence}. Das ist ein echtes Kaufsignal – aktiv bearbeiten und nächsten Schritt festlegen.`;
    }
    return "Starke Kaufsignale vorhanden – Lead aktiv verfolgen.";
  }

  if (temperature === "Warm") {
    if (context.todayTasks.length > 0) {
      return `${context.todayTasks.length} Aufgabe(n) heute fällig. Diese heute bearbeiten und klären, ob Lead weiter qualifiziert wird.`;
    }
    if (context.matchedTargetCustomerType && context.hasSuccessfulContact) {
      const daysSince = context.daysSinceLastContact;
      const recency = daysSince <= 7 ? "kürzlich erreicht" : `vor ${daysSince} Tagen erreicht`;
      return `Passende Branche und ${recency}. Bedarf und Entscheider dokumentieren – dann nächste Aktivität planen.`;
    }
    if (context.matchedTargetCustomerType && context.hasOnlyFailedContact) {
      return `Passende Branche, aber bisher nur nicht erreicht. Erneut anrufen oder E-Mail schreiben – Bedarf und Entscheider klären.`;
    }
    if (context.matchedTargetCustomerType && !context.hasAnyContact) {
      return `Passende Branche (${context.branche}) und gute Kontaktdaten vorhanden. Erstkontakt herstellen und Zielgruppen-Match sowie Bedarf bestätigen.`;
    }
    if (context.hasAnyContact && !context.hasSuccessfulContact && context.hasPhone) {
      return `Bisher nicht erreicht, aber Telefonnummer vorhanden. Erneut anrufen – Bedarf und Entscheider klären.`;
    }
    if (context.matchedTargetCustomerType) {
      return `Passende Branche vorhanden. Kontaktdaten ${context.hasPhone ? "und Telefon" : ""} bekannt – Erstkontakt herstellen und Bedarf qualifizieren.`;
    }
    if (context.hasPhone || context.hasEmail) {
      return `Kontaktdaten vorhanden (${[context.hasPhone && "Telefon", context.hasEmail && "E-Mail"].filter(Boolean).join(", ")}), aber Zielgruppen-Match noch unklar. Erstkontakt herstellen und Passung klären.`;
    }
    return `Teilweise Kontaktdaten vorhanden. Fehlende Informationen anreichern, dann Erstkontakt herstellen und Bedarf klären.`;
  }

  if (context.status === "Verloren") {
    return "Lead wurde als Verloren markiert. Nur wieder kontaktieren bei Bedarf- oder Ansprechpartner-Wechsel.";
  }
  if (!context.hasAnyContact) {
    const via = context.hasPhone ? "Telefon" : context.hasEmail ? "E-Mail" : "verfügbarer Kontaktweg";
    return `Noch kein Kontakt dokumentiert. Erstkontakt herstellen via ${via} und Bedarf sowie Ansprechpartner klären.`;
  }
  if (context.hasOnlyFailedContact) {
    return `${context.contactResultCounts.notReached}x nicht erreicht. Mit anderem Kontaktweg erneut versuchen oder Lead zurückstellen.`;
  }
  if (riskSignals.length > 3) {
    const topRisks = riskSignals.slice(0, 2).map(r => r.label).join(", ");
    return `Mehrere Risiken (${topRisks}). Datenlage verbessern oder Lead neu bewerten.`;
  }

  return `Aktuell fehlen belastbare Kaufsignale. Erst Datenlage verbessern oder Lead zurückstellen, bis Bedarf oder Ansprechpartner klarer sind.`;
}

function buildNextBestAction(context, buyingSignals, riskSignals) {
  if (context.overdueTasks.length > 0) {
    return `Überfällige Aufgabe abarbeiten: ${context.overdueTasks[0].titel}`;
  }

  if (context.todayTasks.length > 0) {
    return `Heute durchführen: ${context.todayTasks[0].titel}`;
  }

  if (context.status === "Angebot") {
    return "Angebot nachfassen – Feedback einholen und nächsten Entscheidungsschritt sichern.";
  }
  if (context.status === "Termin") {
    return "Termin vorbereiten – Unterlagen zusammenstellen und Agenda klären.";
  }

  if (context.appointmentTasks.length > 0) {
    const date = context.appointmentTasks[0].faellig_am;
    return `Termin vorbereiten (${new Date(date).toLocaleDateString('de-DE')}) – Unterlagen zusammenstellen.`;
  }
  if (context.callbackTasks.length > 0) {
    return "Zum geplanten Rückruf anrufen – Bedarf und Entscheider klären.";
  }

  if (context.lastLog?.ergebnis === "Angebot gesendet") {
    return "Angebot nachfassen – Rückfragen beantworten und nächsten Schritt festlegen.";
  }
  if (context.lastLog?.ergebnis === "Termin vereinbart") {
    return "Termin vorbereiten – alle offenen Fragen vorab recherchieren.";
  }
  if (context.lastLog?.ergebnis === "Erreicht") {
    return `Nächsten Kontakt gemäß letzter Notiz durchführen.`;
  }
  if (context.lastLog?.ergebnis === "Nicht erreicht") {
    if (context.hasEmail && !context.hasPhone) {
      return "E-Mail schreiben – Erstkontakt mit Referenz zum Bedarf herstellen.";
    }
    return "Erneut anrufen – Bedarf und Entscheider klären.";
  }

  if (!context.hasAnyContact) {
    if (context.matchedTargetCustomerType) {
      return "Erstkontakt herstellen und klären, wer über externe Dienstleister entscheidet.";
    }
    if (!context.hasPhone && !context.hasEmail) {
      return "Kontaktdaten anreichern – dann Erstkontakt vorbereiten.";
    }
    return `Erstkontakt herstellen via ${context.hasPhone ? "Telefon" : "E-Mail"}.`;
  }

  const missing = detectMissingData(context);
  if (missing.length > 0) {
    return `${missing[0]} recherchieren – dann erneut kontaktieren.`;
  }

  return "Lead neu bewerten – Bedarf und Passung unklar.";
}

async function analyzeLeadSingle(base44, organizationId, companyId) {
  try {
    // Mandanten-Check: Company laden mit organization_id
    const companies = await base44.entities.Company.filter({
      id: companyId,
      organization_id: organizationId
    });
    
    if (!companies || companies.length === 0) {
      throw new Error(`Company ${companyId} nicht gefunden oder gehört nicht zu Organisation ${organizationId}`);
    }
    
    const company = companies[0];
    
    // ContactLogs nur mit organization_id + company_id
    const contactLogs = await base44.entities.ContactLog.filter({
      company_id: companyId,
      organization_id: organizationId
    });
    
    // Tasks nur mit organization_id + company_id
    const tasks = await base44.entities.Task.filter({
      company_id: companyId,
      organization_id: organizationId
    });
    
    // Engine berechnen
    const context = buildLeadContext(company, contactLogs, tasks);
    const buyingSignals = detectBuyingSignals(context).sort((a, b) => b.weight - a.weight);
    const riskSignals = detectRiskSignals(context).sort((a, b) => b.weight - a.weight);
    const missingData = detectMissingData(context);
    
    const score = calculateTemperatureScore(context, buyingSignals, riskSignals, missingData);
    const temperature = classifyTemperature(score, context, buyingSignals, riskSignals);
    const reason = buildTemperatureReason(context, temperature, buyingSignals, riskSignals, score);
    const nextBestAction = buildNextBestAction(context, buyingSignals, riskSignals);
    const firstContactSummary = buildFirstContactSummary(contactLogs);
    const lastContactSummary = buildLastContactSummary(contactLogs);
    const confidence = Math.min(0.95, 0.5 + (buyingSignals.length + Math.abs(riskSignals.length)) * 0.1);
    
    const result = {
      temperature,
      score: Math.round(score),
      reason,
      nextBestAction,
      firstContactSummary,
      lastContactSummary,
      confidence,
      signals: {
        buying: buyingSignals.map(s => ({ label: s.label, evidence: s.evidence, weight: s.weight })),
        risks: riskSignals.map(r => ({ label: r.label, evidence: r.evidence, weight: r.weight })),
        missing: missingData,
      },
      engine_version: "vertriebo-engine-v1-signal-based",
    };
    
    // Auf Company speichern
    const now = new Date().toISOString();
    await base44.entities.Company.update(companyId, {
      lead_temperature: temperature.toLowerCase(),
      lead_temperature_score: score,
      lead_temperature_reason: reason,
      next_best_action: nextBestAction,
      first_contact_summary: firstContactSummary,
      last_contact_summary: lastContactSummary,
      buying_signals: JSON.stringify(result.signals.buying),
      risk_signals: JSON.stringify(result.signals.risks),
      missing_data: JSON.stringify(missingData),
      last_engine_analyzed_at: now,
      last_ai_analyzed_at: now,
      engine_version: result.engine_version,
      engine_confidence: confidence,
      is_hot: temperature === "Hot"
    });
    
    return {
      success: true,
      company_id: companyId,
      result
    };
  } catch (error) {
    console.error(`[analyzeLeadEngine] Single error for ${companyId}:`, error);
    throw error;
  }
}

async function analyzeLatestLeads(base44, organizationId, limit = 10) {
  try {
    const maxLimit = Math.min(limit, 25);
    
    // Nur Companies der Organisation, neueste zuerst
    const companies = await base44.entities.Company.filter({
      organization_id: organizationId
    });
    
    if (!companies || companies.length === 0) {
      return { success: true, analyzed_count: 0, results: [] };
    }
    
    // Sortiere nach created_date (neueste zuerst) und nimm maxLimit
    const sorted = companies
      .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
      .slice(0, maxLimit);
    
    const results = [];
    let analyzedCount = 0;
    
    for (const company of sorted) {
      try {
        const contactLogs = await base44.entities.ContactLog.filter({
          company_id: company.id,
          organization_id: organizationId
        });
        
        const tasks = await base44.entities.Task.filter({
          company_id: company.id,
          organization_id: organizationId
        });
        
        const context = buildLeadContext(company, contactLogs, tasks);
        const buyingSignals = detectBuyingSignals(context).sort((a, b) => b.weight - a.weight);
        const riskSignals = detectRiskSignals(context).sort((a, b) => b.weight - a.weight);
        const missingData = detectMissingData(context);
        
        const score = calculateTemperatureScore(context, buyingSignals, riskSignals, missingData);
        const temperature = classifyTemperature(score, context, buyingSignals, riskSignals);
        const reason = buildTemperatureReason(context, temperature, buyingSignals, riskSignals, score);
        const nextBestAction = buildNextBestAction(context, buyingSignals, riskSignals);
        const firstContactSummary = buildFirstContactSummary(contactLogs);
        const lastContactSummary = buildLastContactSummary(contactLogs);
        const confidence = Math.min(0.95, 0.5 + (buyingSignals.length + Math.abs(riskSignals.length)) * 0.1);
        
        const result = {
          temperature,
          score: Math.round(score),
          reason,
          nextBestAction,
          firstContactSummary,
          lastContactSummary,
          confidence,
          signals: {
            buying: buyingSignals.map(s => ({ label: s.label, evidence: s.evidence, weight: s.weight })),
            risks: riskSignals.map(r => ({ label: r.label, evidence: r.evidence, weight: r.weight })),
            missing: missingData,
          },
          engine_version: "vertriebo-engine-v1-signal-based",
        };
        
        // Auf Company speichern
        const now = new Date().toISOString();
        await base44.entities.Company.update(company.id, {
          lead_temperature: temperature.toLowerCase(),
          lead_temperature_score: score,
          lead_temperature_reason: reason,
          next_best_action: nextBestAction,
          first_contact_summary: firstContactSummary,
          last_contact_summary: lastContactSummary,
          buying_signals: JSON.stringify(result.signals.buying),
          risk_signals: JSON.stringify(result.signals.risks),
          missing_data: JSON.stringify(missingData),
          last_engine_analyzed_at: now,
          last_ai_analyzed_at: now,
          engine_version: result.engine_version,
          engine_confidence: confidence,
          is_hot: temperature === "Hot"
        });
        
        results.push({
          company_id: company.id,
          result
        });
        analyzedCount++;
      } catch (err) {
        console.warn(`[analyzeLeadEngine] Skipping company ${company.id}:`, err.message);
      }
    }
    
    return { success: true, analyzed_count: analyzedCount, results };
  } catch (error) {
    console.error(`[analyzeLeadEngine] Latest error:`, error);
    throw error;
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Organisation des Users ermitteln
    let organizationId = null;
    const memberOrgs = await base44.entities.OrganizationMember.filter({
      user_email: user.email,
      status: "active"
    });
    if (memberOrgs && memberOrgs.length > 0) {
      organizationId = memberOrgs[0].organization_id;
    } else {
      const ownerOrgs = await base44.entities.Organization.filter({
        owner_email: user.email
      });
      if (ownerOrgs && ownerOrgs.length > 0) {
        organizationId = ownerOrgs[0].id;
      }
    }
    
    if (!organizationId) {
      return Response.json({ error: 'Keine Organisation zugeordnet' }, { status: 403 });
    }
    
    const body = await req.json();
    const { mode = "single", company_id, limit = 10 } = body;
    
    if (mode === "single") {
      if (!company_id) {
        return Response.json({ error: 'company_id erforderlich für mode=single' }, { status: 400 });
      }
      const result = await analyzeLeadSingle(base44, organizationId, company_id);
      return Response.json(result);
    }
    
    if (mode === "latest") {
      const result = await analyzeLatestLeads(base44, organizationId, limit);
      return Response.json(result);
    }
    
    return Response.json({ error: 'Unbekannter mode. Verwende "single" oder "latest"' }, { status: 400 });
  } catch (error) {
    console.error('[analyzeLeadEngine] Error:', error);
    return Response.json({ error: error.message || 'Analysefehler' }, { status: 500 });
  }
});