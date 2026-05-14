/**
 * analyzeLeadEngine Phase 1 – Erweiterte Vertriebo Engine
 * 
 * SOURCE OF TRUTH: Diese Datei ist die zentrale Engine-Implementierung
 * Später: Langfristig könnte in Frontend-Lib ausgelagert werden
 * 
 * Mandantenregeln (CRITICAL):
 * - Jede Company: id + organization_id laden + validieren
 * - ContactLogs: company_id + organization_id filtern
 * - Tasks: company_id + organization_id filtern
 * - Company update: nur der Organisation gehörend
 * - Kein Cross-Tenant
 * 
 * Phase 1 Garantien:
 * ✅ Keine automatischen Tasks, Status-Änderungen oder E-Mails
 * ✅ Nur Analyse berechnen + speichern
 * ✅ Evidenzbasierte Texte (keine generischen Aussagen)
 * ✅ Strukturierte Signal-Gruppen
 * ✅ Multi-dimensionales Scoring
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ═══════════════════════════════════════════════════════════════════════════════
// CONTEXT BUILDER
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

  const daysSinceCreation = Math.floor((now - new Date(company.created_date)) / (1000 * 60 * 60 * 24));

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
    priorityScore: company.priority_score || 0,
    logs,
    lastLog,
    firstLog,
    contactResultCounts,
    daysSinceLastContact,
    daysSinceCreation,
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

// ═══════════════════════════════════════════════════════════════════════════════
// SIGNAL DETECTION (strukturiert nach Gruppen)
// ═══════════════════════════════════════════════════════════════════════════════

function detectFitSignals(context) {
  const signals = [];

  if (context.matchedTargetCustomerType) {
    signals.push({
      signal: "industry_match",
      present: true,
      confidence: 95,
      reason: `Branche '${context.branche}' passt zu Zielkunden`
    });
  } else if (context.branche) {
    signals.push({
      signal: "industry_match",
      present: false,
      confidence: 60,
      reason: `Branche '${context.branche}' – Match unklar`
    });
  }

  if (context.hasWebsite) {
    signals.push({
      signal: "website_available",
      present: true,
      confidence: 80,
      reason: "Website vorhanden"
    });
  }

  return signals;
}

function detectContactabilitySignals(context) {
  const signals = [];

  if (context.hasPhone) {
    signals.push({
      signal: "phone_available",
      present: true,
      quality: "complete",
      reason: "Telefonnummer vorhanden"
    });
  } else {
    signals.push({
      signal: "phone_available",
      present: false,
      quality: null,
      reason: "Telefonnummer fehlt"
    });
  }

  if (context.hasEmail) {
    signals.push({
      signal: "email_available",
      present: true,
      quality: "complete",
      reason: "E-Mail vorhanden"
    });
  } else {
    signals.push({
      signal: "email_available",
      present: false,
      quality: null,
      reason: "E-Mail fehlt"
    });
  }

  if (context.hasContactPerson) {
    signals.push({
      signal: "contact_person_available",
      present: true,
      quality: "complete",
      reason: "Ansprechpartner bekannt"
    });
  } else {
    signals.push({
      signal: "contact_person_available",
      present: false,
      quality: null,
      reason: "Ansprechpartner fehlt"
    });
  }

  return signals;
}

function detectEngagementSignals(context) {
  const signals = [];

  if (context.hasAnyContact) {
    signals.push({
      signal: "contact_log_exists",
      present: true,
      count: context.logs.length,
      lastAt: context.lastLog?.created_date,
      reason: `${context.logs.length} Kontakt(e) dokumentiert`
    });
  }

  if (context.status === "Angebot") {
    signals.push({
      signal: "offer_requested",
      present: true,
      reason: "Status: Angebot angefragt"
    });
  }

  if (context.status === "Termin") {
    signals.push({
      signal: "appointment_scheduled",
      present: true,
      reason: "Status: Termin vereinbart"
    });
  }

  if (context.contactResultCounts.appointmentScheduled > 0) {
    signals.push({
      signal: "callback_scheduled",
      present: true,
      count: context.contactResultCounts.appointmentScheduled,
      reason: `${context.contactResultCounts.appointmentScheduled}x Termin vereinbart`
    });
  }

  if (context.contactResultCounts.offerSent > 0) {
    signals.push({
      signal: "offer_sent",
      present: true,
      count: context.contactResultCounts.offerSent,
      reason: `${context.contactResultCounts.offerSent}x Angebot versendet`
    });
  }

  return signals;
}

function detectTimingSignals(context) {
  const signals = [];

  if (context.daysSinceCreation <= 7) {
    signals.push({
      signal: "new_lead",
      present: true,
      daysSince: context.daysSinceCreation,
      reason: `Neuer Lead (vor ${context.daysSinceCreation} Tagen hinzugefügt)`
    });
  }

  if (context.lastLog && context.daysSinceLastContact <= 7) {
    signals.push({
      signal: "recent_contact",
      present: true,
      daysSince: context.daysSinceLastContact,
      reason: `Letzter Kontakt vor ${context.daysSinceLastContact} Tagen`
    });
  }

  if (context.todayTasks.length > 0) {
    signals.push({
      signal: "task_due_today",
      present: true,
      count: context.todayTasks.length,
      reason: `${context.todayTasks.length} Aufgabe(n) heute fällig`
    });
  }

  if (context.overdueTasks.length > 0) {
    signals.push({
      signal: "task_overdue",
      present: true,
      count: context.overdueTasks.length,
      daysOverdue: Math.ceil((context.now - new Date(context.overdueTasks[0].faellig_am)) / (1000 * 60 * 60 * 24)),
      reason: `${context.overdueTasks.length} Aufgabe(n) überfällig`
    });
  }

  if (context.daysSinceLastContact && context.daysSinceLastContact > 60) {
    signals.push({
      signal: "long_time_no_contact",
      present: true,
      daysSince: context.daysSinceLastContact,
      reason: `Sehr lange nicht kontaktiert (${context.daysSinceLastContact} Tage)`
    });
  }

  return signals;
}

function detectRiskSignals(context) {
  const risks = [];

  if (context.status === "Verloren") {
    risks.push({
      signal: "lost_status",
      severity: "high",
      reason: "Status 'Verloren' – Low-Priorität"
    });
  }

  if (!context.hasPhone && !context.hasEmail) {
    risks.push({
      signal: "no_contact_data",
      severity: "high",
      reason: "Weder Telefon noch E-Mail vorhanden"
    });
  }

  if (!context.hasContactPerson && context.hasAnyContact) {
    risks.push({
      signal: "unknown_decision_maker",
      severity: "medium",
      reason: "Ansprechpartner unbekannt – unklar wer entscheidet"
    });
  }

  if (context.hasOnlyFailedContact) {
    risks.push({
      signal: "no_response",
      severity: "medium",
      reason: `${context.contactResultCounts.notReached}x nicht erreicht`
    });
  }

  if (!context.matchedTargetCustomerType && context.priorityScore < 30) {
    risks.push({
      signal: "poor_fit",
      severity: "medium",
      reason: "Zielgruppenpassung unklar"
    });
  }

  if (context.hasAnyContact && !context.hasSuccessfulContact && !context.logs.some(l => l.notiz)) {
    risks.push({
      signal: "poor_data_quality",
      severity: "low",
      reason: "Kontakte dokumentiert, aber keine Notizen – Qualität unklar"
    });
  }

  return risks;
}

function detectMissingData(context) {
  const missing = [];

  if (!context.hasContactPerson) {
    missing.push({ field: "contact_person", priority: "high", impact: "Entscheidungsträger unbekannt" });
  }
  if (!context.hasPhone) {
    missing.push({ field: "phone", priority: "high", impact: "Direkte Ansprache nicht möglich" });
  }
  if (!context.hasEmail) {
    missing.push({ field: "email", priority: "high", impact: "E-Mail-Kontakt nicht möglich" });
  }
  if (!context.hasWebsite) {
    missing.push({ field: "website", priority: "medium", impact: "Firmeninformationen begrenzt" });
  }
  if (!context.matchedTargetCustomerType) {
    missing.push({ field: "target_customer_confirmation", priority: "high", impact: "Zielgruppen-Match noch nicht bestätigt" });
  }
  if (!context.logs.some(l => l.notiz && l.notiz.toLowerCase().includes("bedarf"))) {
    missing.push({ field: "concrete_need", priority: "high", impact: "Konkreter Bedarf unklar" });
  }

  return missing;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCORING-DIMENSIONEN (Multi-dimensional)
// ═══════════════════════════════════════════════════════════════════════════════

function calculateFitScore(context, fitSignals) {
  let score = 30;
  
  if (context.matchedTargetCustomerType) score += 50;
  if (context.hasWebsite) score += 15;
  if (context.branche) score += 5;

  return Math.min(100, Math.max(0, score));
}

function calculateContactabilityScore(context) {
  let score = 0;
  
  if (context.hasPhone) score += 35;
  if (context.hasEmail) score += 25;
  if (context.hasWebsite) score += 15;
  if (context.hasContactPerson) score += 25;

  return Math.min(100, score);
}

function calculateEngagementScore(context) {
  let score = 0;
  
  if (context.status === "Angebot") score += 40;
  if (context.status === "Termin") score += 35;
  if (context.contactResultCounts.appointmentScheduled > 0) score += 30;
  if (context.contactResultCounts.offerSent > 0) score += 25;
  if (context.hasSuccessfulContact) score += 20;
  if (context.hasAnyContact && !context.hasSuccessfulContact) score += 5;

  return Math.min(100, score);
}

function calculateTimingScore(context) {
  let score = 40;
  
  if (context.daysSinceCreation <= 7) score += 25;
  else if (context.daysSinceCreation <= 30) score += 15;
  
  if (context.overdueTasks.length > 0) score += 40;
  if (context.todayTasks.length > 0) score += 25;
  
  if (context.daysSinceLastContact && context.daysSinceLastContact <= 7) score += 15;
  else if (context.daysSinceLastContact && context.daysSinceLastContact > 60) score -= 20;

  return Math.min(100, Math.max(0, score));
}

function calculateUrgencyScore(context) {
  let score = 30;
  
  if (context.overdueTasks.length > 0) score += 50;
  if (context.todayTasks.length > 0) score += 30;
  if (context.status === "Termin") score += 25;
  if (context.status === "Angebot") score += 20;

  return Math.min(100, Math.max(0, score));
}

function calculateConfidenceScore(context, riskSignals) {
  let score = 50;
  
  if (context.hasPhone && context.hasEmail && context.hasContactPerson) score += 30;
  if (context.logs.length >= 2) score += 15;
  if (context.logs.some(l => l.notiz && l.notiz.length > 50)) score += 10;
  if (riskSignals.filter(r => r.severity === "high").length > 0) score -= 20;

  return Math.min(100, Math.max(0, score));
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEMPERATURE + RECOMMENDATIONS (Evidenzbasiert)
// ═══════════════════════════════════════════════════════════════════════════════

function classifyTemperature(vertrieboScore, urgencyScore, fitScore, engagementScore, contactabilityScore, context) {
  // Hard Rules (Blockers)
  if (context.status === "Verloren") return "cold";
  if (context.logs.some(l => l.ergebnis === "Kein Interesse")) return "cold";
  
  // Positive Rules
  if (urgencyScore >= 70 && (fitScore >= 60 || engagementScore >= 50)) return "hot";
  if (engagementScore >= 60) return "hot";
  
  if (fitScore >= 70 && engagementScore >= 40) return "warm";
  if (fitScore >= 70 && contactabilityScore >= 60) return "warm";
  if (engagementScore >= 40) return "warm";
  
  if (fitScore >= 40) return "cold";
  
  return "open";
}

function buildSummary(temperature, context, fitScore, contactabilityScore, urgencyScore, missingData) {
  if (temperature === "hot") {
    if (context.overdueTasks.length > 0) {
      return `Hot Lead: ${context.overdueTasks.length} Aufgabe(n) überfällig – sofort bearbeiten.`;
    }
    if (context.status === "Angebot") {
      return `Hot Lead: Angebot angefordert – zügig nachfassen und Entscheidung herbeiführen.`;
    }
    if (context.status === "Termin") {
      return `Hot Lead: Termin vereinbart – Vorbereitung durchführen und Abschluss vorbereiten.`;
    }
    return `Hot Lead: Kaufsignale vorhanden – aktiv bearbeiten.`;
  }

  if (temperature === "warm") {
    const reasons = [];
    if (fitScore >= 70) reasons.push("Branche passt");
    if (contactabilityScore >= 60) reasons.push("Kontaktdaten vorhanden");
    if (context.hasSuccessfulContact) reasons.push("bereits kontaktiert");
    
    const reason = reasons.length > 0 ? reasons.join(", ") : "gute Ausgangslage";
    const missing = missingData.length > 0 ? ` Fehlt: ${missingData[0].field}.` : "";
    return `Warm Lead: ${reason}.${missing}`;
  }

  if (temperature === "cold") {
    if (context.status === "Verloren") {
      return `Kalt: Status 'Verloren' – nur bei Situation-Wechsel reaktivieren.`;
    }
    if (!context.hasAnyContact && contactabilityScore < 40) {
      return `Kalt: Kontaktdaten unvollständig – erst Daten anreichern.`;
    }
    if (!context.hasSuccessfulContact && context.hasAnyContact) {
      return `Kalt: Bisherige Kontakte erfolglos – anderer Ansatz nötig.`;
    }
    return `Kalt: Noch keine Kaufsignale – Datenlage verbessern oder warten.`;
  }

  return "Offen: Nicht ausreichend Informationen zur Klassifizierung.";
}

function buildReason(temperature, context, fitScore, contactabilityScore, engagementScore, missingData, riskSignals) {
  const reasons = [];

  // Fit-Gründe
  if (context.matchedTargetCustomerType) {
    reasons.push(`Branche '${context.branche}' passt zu Zielkunden`);
  }
  
  // Contactability-Gründe
  const contactChannels = [];
  if (context.hasPhone) contactChannels.push("Telefon");
  if (context.hasEmail) contactChannels.push("E-Mail");
  if (context.hasWebsite) contactChannels.push("Website");
  if (contactChannels.length > 0) {
    reasons.push(`Kontaktierbar via ${contactChannels.join(", ")}`);
  } else {
    reasons.push("Kontaktdaten unvollständig");
  }

  // Engagement-Gründe
  if (context.status === "Angebot") {
    reasons.push("Angebot angefordert");
  } else if (context.status === "Termin") {
    reasons.push("Termin vereinbart");
  } else if (context.hasSuccessfulContact) {
    reasons.push(`Bereits erreicht (${context.logs.length} Kontakt(e))`);
  } else if (context.hasAnyContact) {
    reasons.push(`Kontaktversuche dokumentiert, aber erfolglos`);
  } else {
    reasons.push("Noch kein Erstkontakt");
  }

  // Missing-Gründe
  if (missingData.length > 0) {
    reasons.push(`Fehlt: ${missingData.map(m => m.field).join(", ")}`);
  }

  // Risk-Gründe
  if (riskSignals.length > 0) {
    const highRisks = riskSignals.filter(r => r.severity === "high");
    if (highRisks.length > 0) {
      reasons.push(`Risiken: ${highRisks.map(r => r.signal).join(", ")}`);
    }
  }

  return reasons.join(". ") + ".";
}

function buildNextBestAction(context, temperature, urgencyScore, contactabilityScore, missingData) {
  // Priority 1: Overdue Tasks
  if (context.overdueTasks.length > 0) {
    const task = context.overdueTasks[0];
    return {
      type: "task",
      title: `Überfällige Aufgabe: "${task.titel}"`,
      reason: `${Math.ceil((context.now - new Date(task.faellig_am)) / (1000 * 60 * 60 * 24))} Tage überfällig`,
      due: "today"
    };
  }

  // Priority 2: Today Tasks
  if (context.todayTasks.length > 0) {
    const task = context.todayTasks[0];
    return {
      type: "task",
      title: `Aufgabe heute: "${task.titel}"`,
      reason: "Aufgabe fällig heute",
      due: "today"
    };
  }

  // Priority 3: Offer Follow-Up
  if (context.status === "Angebot") {
    return {
      type: "call",
      title: "Angebot nachfassen",
      reason: "Angebot wurde angefordert – Feedback einholen und nächsten Schritt sichern",
      due: "tomorrow"
    };
  }

  // Priority 4: Appointment Prep
  if (context.status === "Termin") {
    return {
      type: "research",
      title: "Termin vorbereiten",
      reason: "Termin vereinbart – Unterlagen zusammenstellen und Agenda klären",
      due: "tomorrow"
    };
  }

  // Priority 5: First Contact (when contactable)
  if (!context.hasAnyContact && contactabilityScore >= 60) {
    const via = context.hasPhone ? "Anruf" : "E-Mail";
    return {
      type: "call",
      title: `Erstkontakt herstellen (${via})`,
      reason: `Kontaktdaten vorhanden, aber noch kein Kontakt dokumentiert. ${context.matchedTargetCustomerType ? "Branche passt." : "Bedarf und Zielgruppe noch unklar."}`,
      due: "this_week"
    };
  }

  // Priority 6: Enrich Missing Data
  if (missingData.length > 0 && missingData[0].priority === "high") {
    return {
      type: "enrich",
      title: `Fehldaten recherchieren: ${missingData[0].field}`,
      reason: `${missingData[0].impact} – dann kontaktieren`,
      due: "tomorrow"
    };
  }

  // Priority 7: Retry Failed Contact
  if (context.hasOnlyFailedContact) {
    return {
      type: "call",
      title: "Erneut anrufen",
      reason: `${context.contactResultCounts.notReached}x nicht erreicht – mit anderem Kanal versuchen`,
      due: "this_week"
    };
  }

  // Fallback
  return {
    type: "wait",
    title: "Vorerst nicht priorisieren",
    reason: "Nicht ausreichend Informationen für nächsten Schritt",
    due: null
  };
}

function buildOutreachAngle(context, temperature, fitSignals, engagementSignals) {
  // Leverage existing engagement
  if (context.logs.length > 0 && context.hasSuccessfulContact) {
    const days = context.daysSinceLastContact || 1;
    return `Folge-up nach existierendem Kontakt (${days} Tage). Referenziere das letzte Gespräch und bringe neue Information.`;
  }

  // Cold outreach with fit
  if (!context.hasAnyContact && context.matchedTargetCustomerType) {
    return `Kompetenz-basierter Ansatz: "Wir arbeiten speziell mit ${context.branche}-Unternehmen in der Region ${context.ort}."`;
  }

  // Generic approach
  return `Direkter Ansatz: Klare Wertproposition + Bedarf-Frage. Kurz halten.`;
}

function buildSuggestedOpening(context, outreachAngle) {
  if (context.logs.length > 0 && context.hasSuccessfulContact) {
    return `Hallo ${context.ansprechpartner || context.name}, wir hatten vor ${context.daysSinceLastContact} Wochen kurz miteinander geredet. Ich wollte dir nur schnell zeigen, wie wir anderen ${context.branche}-Unternehmen gerade helfen…`;
  }

  if (context.matchedTargetCustomerType && context.hasPhone) {
    return `Guten Morgen, ich bin [Ihr Name] von [Ihr Unternehmen]. Wir arbeiten speziell mit ${context.branche}-Unternehmen in Ihrer Region. Ich hätte eine schnelle Frage…`;
  }

  return `Hallo ${context.ansprechpartner || "zusammen"}, kurze Frage: Wie gehen Sie aktuell mit dem Thema [Thema] um?`;
}

function buildQualificationQuestions(context, missingData) {
  const questions = [];

  if (!context.hasContactPerson) {
    questions.push("Wer ist Ansprechpartner/Entscheider für externe Dienstleistungen?");
  }

  if (!context.logs.some(l => l.notiz && l.notiz.toLowerCase().includes("bedarf"))) {
    questions.push(`Welche Herausforderungen hat Ihr Unternehmen aktuell beim Thema [Service]?`);
  }

  if (!context.logs.some(l => l.notiz && l.notiz.toLowerCase().includes("entscheid"))) {
    questions.push("Wie läuft der Entscheidungsprozess ab? Wer ist beteiligt?");
  }

  questions.push("Welches Budget steht für diese Initiative zur Verfügung?");

  return questions;
}

function buildObjectionsToExpect(context) {
  const objections = [];

  if (!context.matchedTargetCustomerType) {
    objections.push("Das passt nicht zu unseren Prozessen");
  }

  if (!context.hasSuccessfulContact) {
    objections.push("Wir sind zufrieden mit unserem aktuellen Anbieter");
  }

  if (context.hasOnlyFailedContact) {
    objections.push("Das haben wir bereits versucht");
  }

  objections.push("Das ist für uns gerade nicht relevant");
  objections.push("Wir haben kein Budget");

  return objections;
}

function buildRecommendedStatus(temperature, urgencyScore, context) {
  if (context.status === "Verloren") return "Nicht priorisieren";
  
  if (urgencyScore >= 80) return "Kontaktieren";
  if (temperature === "hot") return "Kontaktieren";
  if (temperature === "warm") return "Qualifizieren";
  if (temperature === "cold") return "Warten";
  
  return "Neu";
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN ANALYSIS FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

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
    
    // ═══ CONTEXT ═══
    const context = buildLeadContext(company, contactLogs, tasks);
    
    // ═══ SIGNALS ═══
    const fitSignals = detectFitSignals(context);
    const contactabilitySignals = detectContactabilitySignals(context);
    const engagementSignals = detectEngagementSignals(context);
    const timingSignals = detectTimingSignals(context);
    const riskSignals = detectRiskSignals(context);
    const missingData = detectMissingData(context);
    
    // ═══ SCORES ═══
    const fitScore = calculateFitScore(context, fitSignals);
    const contactabilityScore = calculateContactabilityScore(context);
    const engagementScore = calculateEngagementScore(context);
    const timingScore = calculateTimingScore(context);
    const urgencyScore = calculateUrgencyScore(context);
    const confidenceScore = calculateConfidenceScore(context, riskSignals);
    const vertrieboScore = Math.round(fitScore * 0.3 + contactabilityScore * 0.25 + engagementScore * 0.25 + timingScore * 0.2);
    
    // ═══ CLASSIFICATION ═══
    const temperature = classifyTemperature(vertrieboScore, urgencyScore, fitScore, engagementScore, contactabilityScore, context);
    const summary = buildSummary(temperature, context, fitScore, contactabilityScore, urgencyScore, missingData);
    const reason = buildReason(temperature, context, fitScore, contactabilityScore, engagementScore, missingData, riskSignals);
    
    // ═══ RECOMMENDATIONS ═══
    const nextBestAction = buildNextBestAction(context, temperature, urgencyScore, contactabilityScore, missingData);
    const outreachAngle = buildOutreachAngle(context, temperature, fitSignals, engagementSignals);
    const suggestedOpening = buildSuggestedOpening(context, outreachAngle);
    const qualificationQuestions = buildQualificationQuestions(context, missingData);
    const objectionsToExpect = buildObjectionsToExpect(context);
    const recommendedStatus = buildRecommendedStatus(temperature, urgencyScore, context);
    
    // ═══ RESULT ═══
    const result = {
      temperature,
      vertriebo_score: vertrieboScore,
      urgency_score: Math.round(urgencyScore),
      fit_score: Math.round(fitScore),
      contactability_score: Math.round(contactabilityScore),
      timing_score: Math.round(timingScore),
      confidence_score: Math.round(confidenceScore),
      
      summary,
      reason,
      top_signals: [
        ...fitSignals.filter(s => s.present),
        ...contactabilitySignals.filter(s => s.present),
        ...engagementSignals.filter(s => s.present),
        ...timingSignals.filter(s => s.present)
      ].slice(0, 5),
      
      risk_signals: riskSignals,
      missing_data: missingData,
      
      next_best_action: nextBestAction,
      outreach_angle: outreachAngle,
      suggested_opening: suggestedOpening,
      qualification_questions: qualificationQuestions,
      objections_to_expect: objectionsToExpect,
      recommended_status: recommendedStatus,
      
      engine_version: "vertriebo-engine-phase1"
    };
    
    // ═══ PERSISTENCE ═══
    const now = new Date().toISOString();
    const engineAnalysis = {
      version: "phase1",
      temperature,
      vertriebo_score: vertrieboScore,
      urgency_score: Math.round(urgencyScore),
      fit_score: Math.round(fitScore),
      contactability_score: Math.round(contactabilityScore),
      timing_score: Math.round(timingScore),
      confidence_score: Math.round(confidenceScore),
      summary,
      reason,
      signals: {
        fit: fitSignals,
        contactability: contactabilitySignals,
        engagement: engagementSignals,
        timing: timingSignals,
        risk: riskSignals,
        missing_data: missingData
      },
      next_best_action: nextBestAction,
      outreach_angle: outreachAngle,
      suggested_opening: suggestedOpening,
      qualification_questions: qualificationQuestions,
      objections_to_expect: objectionsToExpect,
      recommended_status: recommendedStatus
    };
    
    await base44.entities.Company.update(companyId, {
      // Legacy Fields (Compat)
      lead_temperature: temperature.toLowerCase(),
      lead_temperature_score: vertrieboScore,
      lead_temperature_reason: reason,
      
      // New Engine Bundle (Safe + Versioned)
      engine_analysis_json: JSON.stringify(engineAnalysis),
      engine_version: result.engine_version,
      engine_last_analyzed_at: now,
      
      // Legacy Compat
      is_hot: temperature === "hot"
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
    
    // Nur Companies der Organisation
    const companies = await base44.entities.Company.filter({
      organization_id: organizationId
    });
    
    if (!companies || companies.length === 0) {
      return { success: true, analyzed_count: 0, results: [] };
    }
    
    // Sortiere nach created_date (neueste zuerst)
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
        
        // (Identical analysis logic as above – abbreviated here for clarity)
        const context = buildLeadContext(company, contactLogs, tasks);
        const fitSignals = detectFitSignals(context);
        const contactabilitySignals = detectContactabilitySignals(context);
        const engagementSignals = detectEngagementSignals(context);
        const timingSignals = detectTimingSignals(context);
        const riskSignals = detectRiskSignals(context);
        const missingData = detectMissingData(context);
        
        const fitScore = calculateFitScore(context, fitSignals);
        const contactabilityScore = calculateContactabilityScore(context);
        const engagementScore = calculateEngagementScore(context);
        const timingScore = calculateTimingScore(context);
        const urgencyScore = calculateUrgencyScore(context);
        const confidenceScore = calculateConfidenceScore(context, riskSignals);
        const vertrieboScore = Math.round(fitScore * 0.3 + contactabilityScore * 0.25 + engagementScore * 0.25 + timingScore * 0.2);
        
        const temperature = classifyTemperature(vertrieboScore, urgencyScore, fitScore, engagementScore, contactabilityScore, context);
        const summary = buildSummary(temperature, context, fitScore, contactabilityScore, urgencyScore, missingData);
        const reason = buildReason(temperature, context, fitScore, contactabilityScore, engagementScore, missingData, riskSignals);
        const nextBestAction = buildNextBestAction(context, temperature, urgencyScore, contactabilityScore, missingData);
        const outreachAngle = buildOutreachAngle(context, temperature, fitSignals, engagementSignals);
        const suggestedOpening = buildSuggestedOpening(context, outreachAngle);
        const qualificationQuestions = buildQualificationQuestions(context, missingData);
        const objectionsToExpect = buildObjectionsToExpect(context);
        const recommendedStatus = buildRecommendedStatus(temperature, urgencyScore, context);
        
        const result = {
          temperature,
          vertriebo_score: vertrieboScore,
          urgency_score: Math.round(urgencyScore),
          fit_score: Math.round(fitScore),
          contactability_score: Math.round(contactabilityScore),
          timing_score: Math.round(timingScore),
          confidence_score: Math.round(confidenceScore),
          summary,
          reason,
          next_best_action: nextBestAction,
          engine_version: "vertriebo-engine-phase1"
        };
        
        // Persistence
        const now = new Date().toISOString();
        const engineAnalysis = {
          version: "phase1",
          temperature,
          vertriebo_score: vertrieboScore,
          urgency_score: Math.round(urgencyScore),
          fit_score: Math.round(fitScore),
          contactability_score: Math.round(contactabilityScore),
          timing_score: Math.round(timingScore),
          confidence_score: Math.round(confidenceScore),
          summary,
          reason,
          signals: {
            fit: fitSignals,
            contactability: contactabilitySignals,
            engagement: engagementSignals,
            timing: timingSignals,
            risk: riskSignals,
            missing_data: missingData
          },
          next_best_action: nextBestAction,
          outreach_angle: outreachAngle,
          suggested_opening: suggestedOpening,
          qualification_questions: qualificationQuestions,
          objections_to_expect: objectionsToExpect,
          recommended_status: recommendedStatus
        };
        
        await base44.entities.Company.update(company.id, {
          // Legacy Fields (Compat)
          lead_temperature: temperature.toLowerCase(),
          lead_temperature_score: vertrieboScore,
          lead_temperature_reason: reason,
          
          // New Engine Bundle (Safe + Versioned)
          engine_analysis_json: JSON.stringify(engineAnalysis),
          engine_version: result.engine_version,
          engine_last_analyzed_at: now,
          
          // Legacy Compat
          is_hot: temperature === "hot"
        });
        
        results.push({ company_id: company.id, result });
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

// ═══════════════════════════════════════════════════════════════════════════════
// DENO SERVE
// ═══════════════════════════════════════════════════════════════════════════════

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await req.json();
    const { mode = "single", company_id, limit = 10, organization_id } = body;
    
    // Resolve Organization
    let organizationId = null;
    if (organization_id) {
      // Validate Access
      const isAdmin = user.role === 'admin';
      if (!isAdmin) {
        const ownerOrgs = await base44.asServiceRole.entities.Organization.filter({
          id: organization_id,
          owner_email: user.email
        });
        const isOwner = ownerOrgs && ownerOrgs.length > 0;
        
        if (!isOwner) {
          const members = await base44.asServiceRole.entities.OrganizationMember.filter({
            organization_id: organization_id,
            user_email: user.email,
            status: 'active'
          });
          if (!members || members.length === 0) {
            return Response.json({ error: 'Zugriff verweigert' }, { status: 403 });
          }
        }
      }
      organizationId = organization_id;
    } else {
      // Auto-detect from user
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
    }
    
    if (!organizationId) {
      return Response.json({ error: 'Keine Organisation zugeordnet' }, { status: 403 });
    }
    
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