/**
 * Vertriebo Engine – Signal-basierte Architektur
 * 
 * Nicht: generische Texte und reiner Score
 * Sondern: nachvollziehbare Signale, evidence-basierte Begründungen, zielgerichtete Aktionen
 * 
 * Schichtenmodell:
 * 1. buildLeadContext – normalisierte Datenbasis
 * 2. detectBuyingSignals, detectRiskSignals, detectMissingData – Signal-Detektion
 * 3. calculateTemperatureScore – Scoring
 * 4. classifyTemperature – Guardrails
 * 5. buildTemperatureReason, buildNextBestAction, buildFirstContactSummary – Copy
 * 6. buildEngineResult – finales JSON
 */

// ═══════════════════════════════════════════════════════════════════════════════
// 1. LEADSCONTEXT BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

function buildLeadContext(company, contactLogs, tasks) {
  const now = new Date();
  const today = now.toISOString().split('T')[0];

  // Kontaktlogs normalisieren
  const logs = (contactLogs || [])
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
  const lastLog = logs[0] || null;
  const firstLog = logs[logs.length - 1] || null;

  // Aufgaben normalisieren
  const allTasks = (tasks || []);
  const openTasks = allTasks.filter(t => !t.erledigt);
  const todayTasks = openTasks.filter(t => t.faellig_am && t.faellig_am.startsWith(today));
  const callbackTasks = openTasks.filter(t => t.typ === "Rückruf");
  const appointmentTasks = openTasks.filter(t => t.typ === "Termin");
  const overdueTasks = openTasks.filter(t => {
    const dueDate = new Date(t.faellig_am);
    return t.faellig_am && dueDate < now && !t.faellig_am.startsWith(today);
  });

  // Kontakthistorie analysieren
  const contactResultCounts = {
    reached: logs.filter(l => l.ergebnis === "Erreicht").length,
    notReached: logs.filter(l => l.ergebnis === "Nicht erreicht").length,
    callbackScheduled: logs.filter(l => l.ergebnis === "Rückruf vereinbart").length,
    appointmentScheduled: logs.filter(l => l.ergebnis === "Termin vereinbart").length,
    offerSent: logs.filter(l => l.ergebnis === "Angebot gesendet").length,
  };

  // Zeitberechnung
  const daysSinceLastContact = lastLog 
    ? Math.floor((now - new Date(lastLog.created_date)) / (1000 * 60 * 60 * 24))
    : null;

  return {
    // Basis-Infos
    companyId: company.id,
    organizationId: company.organization_id,
    name: company.name,
    branche: company.branche,
    ort: company.ort,
    status: company.status,
    
    // Kontaktdaten
    hasPhone: Boolean(company.telefon),
    hasEmail: Boolean(company.email),
    hasWebsite: Boolean(company.website),
    hasContactPerson: Boolean(company.ansprechpartner),
    
    // Relevanz
    matchedTargetCustomerType: company.matched_target_customer_type,
    relevanceScore: company.priority_score || 0,
    relevanceReason: company.relevance_reason,
    
    // Kontakthistorie
    logs,
    lastLog,
    firstLog,
    contactResultCounts,
    daysSinceLastContact,
    hasAnyContact: logs.length > 0,
    hasSuccessfulContact: contactResultCounts.reached > 0 || contactResultCounts.callbackScheduled > 0 || contactResultCounts.appointmentScheduled > 0 || contactResultCounts.offerSent > 0,
    hasOnlyFailedContact: logs.length > 0 && contactResultCounts.notReached > 0 && contactResultCounts.reached === 0,
    
    // Aufgaben
    todayTasks,
    callbackTasks,
    appointmentTasks,
    overdueTasks,
    
    // Timestamps
    now,
    today,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. SIGNAL DETECTION
// ═══════════════════════════════════════════════════════════════════════════════

// Signal-Katalog mit Gewichtung
const BUYING_SIGNALS_CATALOG = {
  offer_requested: { weight: 30, label: "Angebot angefragt" },
  appointment_scheduled: { weight: 35, label: "Termin vereinbart" },
  callback_scheduled: { weight: 18, label: "Rückruf geplant" },
  callback_due_today: { weight: 20, label: "Rückruf heute" },
  offer_sent: { weight: 25, label: "Angebot versendet" },
  callback_due_soon: { weight: 15, label: "Rückruf in 7 Tagen geplant" },
  successful_contact: { weight: 22, label: "Erfolgreich kontaktiert" },
  matched_target_customer: { weight: 14, label: "Passende Branche" },
  phone_available: { weight: 8, label: "Telefonnummer vorhanden" },
  email_available: { weight: 6, label: "E-Mail vorhanden" },
  website_available: { weight: 5, label: "Website vorhanden" },
  contact_person_known: { weight: 12, label: "Ansprechpartner bekannt" },
  relevant_recent_contact: { weight: 10, label: "Relevanter letzter Kontakt" },
};

const RISK_SIGNALS_CATALOG = {
  not_reached_only: { weight: -10, label: "Nur nicht erreicht" },
  no_contact_logs: { weight: -8, label: "Kein Kontakt dokumentiert" },
  no_need_documented: { weight: -14, label: "Bedarf nicht dokumentiert" },
  unknown_decision_maker: { weight: -10, label: "Entscheider unbekannt" },
  missing_phone: { weight: -20, label: "Telefonnummer fehlt" },
  missing_email: { weight: -6, label: "E-Mail fehlt" },
  no_website: { weight: -8, label: "Keine Website" },
  not_interested: { weight: -45, label: "Kein Interesse signalisiert" },
  wrong_target_group: { weight: -50, label: "Falsche Zielgruppe" },
  status_lost: { weight: -50, label: "Status: Verloren" },
  unclear_fit: { weight: -16, label: "Zielgruppen-Match unklar" },
  overdue_tasks: { weight: -12, label: "Überfällige Aufgaben" },
  very_old_no_activity: { weight: -15, label: "Sehr alter Kontakt, keine Aktivität" },
};

function detectBuyingSignals(context) {
  const signals = [];

  // Status-basiert
  if (context.status === "Angebot") {
    signals.push({
      type: "offer_requested",
      ...BUYING_SIGNALS_CATALOG.offer_requested,
      evidence: "Status: Angebot",
      actionHint: "Angebot nachfassen"
    });
  }
  if (context.status === "Termin") {
    signals.push({
      type: "appointment_scheduled",
      ...BUYING_SIGNALS_CATALOG.appointment_scheduled,
      evidence: "Status: Termin",
      actionHint: "Termin vorbereiten"
    });
  }

  // Aufgaben-basiert
  if (context.todayTasks.length > 0) {
    signals.push({
      type: "callback_due_today",
      ...BUYING_SIGNALS_CATALOG.callback_due_today,
      evidence: `${context.todayTasks.length} Aufgabe(n) heute fällig`,
      actionHint: "Heute durchführen"
    });
  }

  if (context.appointmentTasks.length > 0) {
    signals.push({
      type: "appointment_scheduled",
      ...BUYING_SIGNALS_CATALOG.appointment_scheduled,
      evidence: `${context.appointmentTasks.length} Termin(e) gebucht`,
      actionHint: "Vorbereitung durchführen"
    });
  }

  const callbackDueSoon = context.callbackTasks.filter(t => {
    const dueDate = new Date(t.faellig_am);
    const in7days = new Date(context.now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return dueDate <= in7days;
  });
  if (callbackDueSoon.length > 0) {
    signals.push({
      type: "callback_due_soon",
      ...BUYING_SIGNALS_CATALOG.callback_due_soon,
      evidence: `Rückruf in den nächsten 7 Tagen`,
      actionHint: "Vorbereitung und Recherche"
    });
  }

  // Kontakt-basiert
  if (context.lastLog?.ergebnis === "Termin vereinbart") {
    signals.push({
      type: "appointment_scheduled",
      ...BUYING_SIGNALS_CATALOG.appointment_scheduled,
      evidence: "Letzter Kontakt: Termin vereinbart",
      actionHint: "Termin vorbereiten"
    });
  }
  if (context.lastLog?.ergebnis === "Angebot gesendet") {
    signals.push({
      type: "offer_sent",
      ...BUYING_SIGNALS_CATALOG.offer_sent,
      evidence: "Angebot versendet",
      actionHint: "Nachfassen und Feedback einholen"
    });
  }
  if (context.lastLog?.ergebnis === "Rückruf vereinbart") {
    signals.push({
      type: "callback_scheduled",
      ...BUYING_SIGNALS_CATALOG.callback_scheduled,
      evidence: "Rückruf vereinbart",
      actionHint: "Zum vereinbarten Zeitpunkt anrufen"
    });
  }
  if (context.lastLog?.ergebnis === "Erreicht" && context.lastLog.notiz) {
    signals.push({
      type: "successful_contact",
      ...BUYING_SIGNALS_CATALOG.successful_contact,
      evidence: `Erfolgreich kontaktiert${context.daysSinceLastContact <= 7 ? " (kürzlich)" : ""}`,
      actionHint: "Follow-up je nach Notiz"
    });
  }

  // Daten-basiert
  if (context.matchedTargetCustomerType) {
    signals.push({
      type: "matched_target_customer",
      ...BUYING_SIGNALS_CATALOG.matched_target_customer,
      evidence: `Passt zu Zielgruppe${context.branche ? ` (${context.branche})` : ""}`,
      actionHint: "Bedarf qualifizieren"
    });
  }

  if (context.hasContactPerson) {
    signals.push({
      type: "contact_person_known",
      ...BUYING_SIGNALS_CATALOG.contact_person_known,
      evidence: "Ansprechpartner bekannt",
      actionHint: "Direkt kontaktieren"
    });
  }

  if (context.hasPhone) {
    signals.push({
      type: "phone_available",
      ...BUYING_SIGNALS_CATALOG.phone_available,
      evidence: "Telefonnummer vorhanden",
      actionHint: "Direkt anrufen"
    });
  }

  if (context.hasEmail) {
    signals.push({
      type: "email_available",
      ...BUYING_SIGNALS_CATALOG.email_available,
      evidence: "E-Mail vorhanden",
      actionHint: "E-Mail ist Option"
    });
  }

  if (context.hasWebsite) {
    signals.push({
      type: "website_available",
      ...BUYING_SIGNALS_CATALOG.website_available,
      evidence: "Website vorhanden",
      actionHint: "Vorab recherchieren"
    });
  }

  return signals;
}

function detectRiskSignals(context) {
  const risks = [];

  // Status-Risiken
  if (context.status === "Verloren") {
    risks.push({
      type: "status_lost",
      ...RISK_SIGNALS_CATALOG.status_lost,
      evidence: "Lead wurde als Verloren markiert",
      actionHint: "Nicht priorisieren"
    });
  }

  // Kontakt-Risiken
  if (!context.hasAnyContact) {
    risks.push({
      type: "no_contact_logs",
      ...RISK_SIGNALS_CATALOG.no_contact_logs,
      evidence: "Noch kein Kontakt dokumentiert",
      actionHint: "Erstkontakt herstellen"
    });
  } else if (context.hasOnlyFailedContact) {
    risks.push({
      type: "not_reached_only",
      ...RISK_SIGNALS_CATALOG.not_reached_only,
      evidence: `${context.contactResultCounts.notReached}x nicht erreicht`,
      actionHint: "Erneut versuchen oder E-Mail schreiben"
    });
  }

  // Daten-Risiken
  if (!context.hasPhone) {
    risks.push({
      type: "missing_phone",
      ...RISK_SIGNALS_CATALOG.missing_phone,
      evidence: "Telefonnummer fehlt",
      actionHint: "Anreichern"
    });
  }

  if (!context.hasEmail) {
    risks.push({
      type: "missing_email",
      ...RISK_SIGNALS_CATALOG.missing_email,
      evidence: "E-Mail fehlt",
      actionHint: "Anreichern"
    });
  }

  if (!context.hasContactPerson) {
    risks.push({
      type: "unknown_decision_maker",
      ...RISK_SIGNALS_CATALOG.unknown_decision_maker,
      evidence: "Ansprechpartner/Entscheider unbekannt",
      actionHint: "Im Gespräch erfragen"
    });
  }

  if (!context.matchedTargetCustomerType) {
    risks.push({
      type: "unclear_fit",
      ...RISK_SIGNALS_CATALOG.unclear_fit,
      evidence: "Zielgruppen-Match noch nicht bestätigt",
      actionHint: "Zuerst Passung klären"
    });
  }

  // Aufgaben-Risiken
  if (context.overdueTasks.length > 0) {
    risks.push({
      type: "overdue_tasks",
      ...RISK_SIGNALS_CATALOG.overdue_tasks,
      evidence: `${context.overdueTasks.length} überfällige Aufgabe(n)`,
      actionHint: "Sofort abarbeiten"
    });
  }

  // Zeit-Risiken
  if (context.daysSinceLastContact && context.daysSinceLastContact > 60) {
    risks.push({
      type: "very_old_no_activity",
      ...RISK_SIGNALS_CATALOG.very_old_no_activity,
      evidence: `Letzter Kontakt vor ${context.daysSinceLastContact} Tagen`,
      actionHint: "Neu bewerten oder re-aktivieren"
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

  // Fachlich fehlend
  if (!context.logs.some(l => l.notiz && l.notiz.toLowerCase().includes("bedarf"))) {
    missing.push("Konkreter Bedarf");
  }

  if (!context.logs.some(l => l.notiz && l.notiz.toLowerCase().includes("entscheid"))) {
    missing.push("Entscheiderrolle");
  }

  return missing;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. TEMPERATURE SCORING
// ═══════════════════════════════════════════════════════════════════════════════

function calculateTemperatureScore(context, buyingSignals, riskSignals, missingData) {
  let score = 50; // Baseline

  // Signale addieren
  buyingSignals.forEach(s => { score += s.weight; });
  riskSignals.forEach(r => { score += r.weight; }); // negativ

  // Fehlende Daten subtrahieren (-3 pro Feld)
  score -= missingData.length * 3;

  // Rückruf heute: Bonus
  if (context.todayTasks.some(t => t.typ === "Rückruf")) {
    score += 5;
  }

  return Math.max(0, Math.min(100, score));
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. TEMPERATURE CLASSIFICATION MIT GUARDRAILS
// ═══════════════════════════════════════════════════════════════════════════════

function classifyTemperature(score, context, buyingSignals, riskSignals) {
  // Guardrail 1: Explizit negativ
  const hasNegativeStatus = context.status === "Verloren";
  const hasNotInterested = context.lastLog?.ergebnis === "Kein Interesse";
  const isWrongTargetGroup = !context.matchedTargetCustomerType && context.relevanceScore < 20;

  if (hasNegativeStatus || hasNotInterested || isWrongTargetGroup) {
    return "Cold";
  }

  // Guardrail 2: Hot nur mit echtem Kaufsignal
  const hasRealBuyingSignal = buyingSignals.some(s => 
    ["offer_requested", "appointment_scheduled", "offer_sent", "callback_scheduled"].includes(s.type)
  );

  if (score >= 70 && hasRealBuyingSignal) {
    return "Hot";
  }

  if (score >= 70 && !hasRealBuyingSignal) {
    // Score ist hoch, aber kein echtes Kaufsignal – maximal Warm
    return "Warm";
  }

  // Warm/Cold nach Score
  if (score >= 50) {
    return "Warm";
  }

  return "Cold";
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. COPY BUILDER – Evidence-basiert
// ═══════════════════════════════════════════════════════════════════════════════

function buildTemperatureReason(context, temperature, buyingSignals, riskSignals, score) {
  // Sortiere Signale nach Gewichtung
  const topBuying = buyingSignals.slice(0, 2);
  const topRisks = riskSignals.slice(0, 2);

  if (temperature === "Hot") {
    if (context.status === "Angebot") {
      return "Angebot wurde angefragt. Jetzt zeitnah nachfassen und Entscheidungsprozess voranbringen.";
    }
    if (context.status === "Termin") {
      return "Termin ist vereinbart. Vorbereitung durchführen und Abschluss vorbereiten.";
    }
    if (topBuying.length > 0) {
      const signal = topBuying[0];
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
    // Fallback mit konkreten Daten statt generischem Text
    if (context.matchedTargetCustomerType) {
      return `Passende Branche vorhanden. Kontaktdaten ${context.hasPhone ? "und Telefon" : ""} bekannt – Erstkontakt herstellen und Bedarf qualifizieren.`;
    }
    if (context.hasPhone || context.hasEmail) {
      return `Kontaktdaten vorhanden (${[context.hasPhone && "Telefon", context.hasEmail && "E-Mail"].filter(Boolean).join(", ")}), aber Zielgruppen-Match noch unklar. Erstkontakt herstellen und Passung klären.`;
    }
    return `Teilweise Kontaktdaten vorhanden. Fehlende Informationen anreichern, dann Erstkontakt herstellen und Bedarf klären.`;
  }

  // Cold
  if (context.status === "Verloren") {
    return "Lead wurde als Verloren markiert. Nur wieder kontaktieren bei Bedarf- oder Ansprechpartner-Wechsel.";
  }
  if (!context.hasAnyContact) {
    return `Noch kein Kontakt dokumentiert. Erstkontakt herstellen über ${context.hasPhone ? "Telefon" : "E-Mail"} und Bedarf klären.`;
  }
  if (context.hasOnlyFailedContact) {
    return `${context.contactResultCounts.notReached}x nicht erreicht. Neu bewerten oder mit anderem Kontaktweg versuchen.`;
  }
  if (riskSignals.length > 3) {
    return `Mehrere Risiken vorhanden (${riskSignals.map(r => r.label).slice(0, 2).join(", ")}). Neu bewerten oder deprioritisieren.`;
  }

  return `Geringe Signale (${score} Punkte). Neu priorisieren oder archivieren.`;
}

function buildNextBestAction(context, buyingSignals, riskSignals) {
  // Überfällig first
  if (context.overdueTasks.length > 0) {
    return `Überfällige Aufgabe abarbeiten: ${context.overdueTasks[0].titel}`;
  }

  // Heute fällig
  if (context.todayTasks.length > 0) {
    return `Heute durchführen: ${context.todayTasks[0].titel}`;
  }

  // Status-basiert
  if (context.status === "Angebot") {
    return "Angebot nachfassen – Feedback einholen und nächsten Entscheidungsschritt sichern.";
  }
  if (context.status === "Termin") {
    return "Termin vorbereiten – Unterlagen zusammenstellen und Agenda klären.";
  }

  // Aufgaben-basiert
  if (context.appointmentTasks.length > 0) {
    const date = context.appointmentTasks[0].faellig_am;
    return `Termin vorbereiten (${new Date(date).toLocaleDateString('de-DE')}) – Unterlagen zusammenstellen.`;
  }
  if (context.callbackTasks.length > 0) {
    return "Zum geplanten Rückruf anrufen – Bedarf und Entscheider klären.";
  }

  // Kontakt-basiert
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

  // Keine Kontakt-History
  if (!context.hasAnyContact) {
    if (context.matchedTargetCustomerType) {
      return "Erstkontakt herstellen und klären, wer über externe Dienstleister entscheidet.";
    }
    if (!context.hasPhone && !context.hasEmail) {
      return "Kontaktdaten anreichern – dann Erstkontakt vorbereiten.";
    }
    return `Erstkontakt herstellen via ${context.hasPhone ? "Telefon" : "E-Mail"}.`;
  }

  // Fallback
  const missing = detectMissingData(context);
  if (missing.length > 0) {
    return `${missing[0]} recherchieren – dann erneut kontaktieren.`;
  }

  return "Lead neu bewerten – Bedarf und Passung unklar.";
}

function buildFirstContactSummary(contactLogs) {
  if (!contactLogs || contactLogs.length === 0) {
    return "Noch kein qualifizierter Erstkontakt dokumentiert.";
  }

  const logs = contactLogs
    .sort((a, b) => new Date(a.created_date) - new Date(b.created_date)); // Sortiere aufsteigend (ältester zuerst)
  const firstLog = logs[0];

  // Erstkontakt war nicht erreicht
  if (firstLog.ergebnis === "Nicht erreicht") {
    return "Bisheriger Kontaktversuch: nicht erreicht. Es wurde noch kein Bedarf oder Ansprechpartner bestätigt.";
  }

  // Erstkontakt mit Notiz
  if (firstLog.notiz) {
    const shortNote = firstLog.notiz.split('\n')[0].substring(0, 80);
    return `${firstLog.typ}: ${firstLog.ergebnis}. "${shortNote}${firstLog.notiz.length > 80 ? '…' : ''}"`;
  }

  // Nur Ergebnis
  return `${firstLog.typ}: ${firstLog.ergebnis}`;
}

function buildLastContactSummary(contactLogs) {
  if (!contactLogs || contactLogs.length === 0) {
    return null;
  }

  const logs = contactLogs
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date)); // Sortiere absteigend (neuester zuerst)
  const lastLog = logs[0];

  // Mit Notiz
  if (lastLog.notiz) {
    const shortNote = lastLog.notiz.split('\n')[0].substring(0, 80);
    return `${lastLog.typ}: ${lastLog.ergebnis}. "${shortNote}${lastLog.notiz.length > 80 ? '…' : ''}"`;
  }

  // Nur Ergebnis
  return `${lastLog.typ}: ${lastLog.ergebnis}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6. ENGINE RESULT BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

export function analyzeLeadTemperature(company, contactLogs, tasks) {
  // 1. Context bauen
  const context = buildLeadContext(company, contactLogs, tasks);

  // 2. Signale detektieren
  const buyingSignals = detectBuyingSignals(context)
    .sort((a, b) => b.weight - a.weight);
  const riskSignals = detectRiskSignals(context)
    .sort((a, b) => b.weight - a.weight);
  const missingData = detectMissingData(context);

  // 3. Score berechnen
  const score = calculateTemperatureScore(context, buyingSignals, riskSignals, missingData);

  // 4. Temperatur mit Guardrails
  const temperature = classifyTemperature(score, context, buyingSignals, riskSignals);

  // 5. Copy bauen
  const reason = buildTemperatureReason(context, temperature, buyingSignals, riskSignals, score);
  const nextBestAction = buildNextBestAction(context, buyingSignals, riskSignals);
  const firstContactSummary = buildFirstContactSummary(contactLogs);
  const lastContactSummary = buildLastContactSummary(contactLogs);

  // 6. Standardisiertes JSON-Output
  return {
    // Kern-Ausgabe
    temperature,
    score: Math.round(score),
    confidence: Math.min(0.95, 0.5 + (buyingSignals.length + Math.abs(riskSignals.length)) * 0.1),
    
    // Copy
    reason,
    nextBestAction,
    firstContactSummary,
    lastContactSummary,
    
    // Signale detailliert
    signals: {
      buying: buyingSignals.map(s => ({
        label: s.label,
        evidence: s.evidence,
        actionHint: s.actionHint,
        weight: s.weight,
      })),
      risks: riskSignals.map(r => ({
        label: r.label,
        evidence: r.evidence,
        actionHint: r.actionHint,
        weight: r.weight,
      })),
      missing: missingData,
    },
    
    // Meta
    engine_version: "vertriebo-engine-v1-signal-based",
    analyzed_at: new Date().toISOString(),
  };
}